import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  paymentStatus: string;
  courseId?: number | null;
  progress?: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ token: string; user: AuthUser }>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<{ token: string; user: AuthUser }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = "auth_token";

function getTenantParam(): string {
  // جرب من URL الحالي أولاً
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) {
    localStorage.setItem("tenant_slug", fromUrl); // احفظه
    return `?tenant=${fromUrl}`;
  }
  // لو مش في URL، جيبه من localStorage
  const fromStorage = localStorage.getItem("tenant_slug") 
    ?? (window as any).__TENANT_SLUG__ 
    ?? "";
  return fromStorage ? `?tenant=${fromStorage}` : "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (t: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`/api/auth/me${getTenantParam()}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe(token).then((u) => {
      if (u) {
        setUser(u);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      setIsLoading(false);
    });
  }, [token, fetchMe]);

  const saveAuth = (tok: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`/api/auth/login${getTenantParam()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    saveAuth(data.token, data.user);
    return data;
  };

  const register = async (body: { name: string; email: string; password: string; phone?: string }) => {
    const res = await fetch(`/api/auth/register${getTenantParam()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Registration failed");
    }
    const data = await res.json();
    saveAuth(data.token, data.user);
    return data;
  };

  const refreshUser = async () => {
    if (!token) return;
    const u = await fetchMe(token);
    if (u) setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}