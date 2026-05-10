import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface InstructorUser {
  id: number;
  email: string;
  name: string;
  nameAr?: string | null;
  avatarUrl?: string | null;
}

interface InstructorAuthContext {
  instructor: InstructorUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<InstructorAuthContext | undefined>(undefined);
const TOKEN_KEY = "lms_instructor_token";

function getTenantParam(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) { localStorage.setItem("tenant_slug", fromUrl); return `?tenant=${fromUrl}`; }
  const s = localStorage.getItem("tenant_slug") ?? "";
  return s ? `?tenant=${s}` : "";
}

export function InstructorAuthProvider({ children }: { children: ReactNode }) {
  const [instructor, setInstructor] = useState<InstructorUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }
    fetch(`/api/instructor-auth/me${getTenantParam()}`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { setInstructor(data); setToken(stored); })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/instructor-auth/login${getTenantParam()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const { token: t, instructor: i } = await res.json();
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setInstructor(i);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setInstructor(null);
  };

  return (
    <Ctx.Provider value={{ instructor, isAuthenticated: !!instructor, isLoading, token, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useInstructorAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInstructorAuth must be used within InstructorAuthProvider");
  return ctx;
}