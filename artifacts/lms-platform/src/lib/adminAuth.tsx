import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthContext {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  token: string | null;
}

const Ctx = createContext<AdminAuthContext | undefined>(undefined);
const TOKEN_KEY = "lms_admin_token";

function getTenantParam(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) {
    localStorage.setItem("tenant_slug", fromUrl);
    return `?tenant=${fromUrl}`;
  }
  const fromStorage = localStorage.getItem("tenant_slug") ?? "";
  return fromStorage ? `?tenant=${fromStorage}` : "";
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }
    fetch(`/api/admin-auth/me${getTenantParam()}`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { setAdmin(data); setToken(stored); })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin-auth/login${getTenantParam()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const { token: t, admin: a } = await res.json();
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setAdmin(a);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  };

  return (
    <Ctx.Provider value={{ admin, isAuthenticated: !!admin, isLoading, login, logout, token }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}