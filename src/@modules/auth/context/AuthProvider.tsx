"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/src/@libs/api/client";
import type { AuthUser, AuthStatus } from "../types";
interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: string;
  refresh: () => Promise<void>;
  acceptUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState("");
  const revision = useRef(0);
  const acceptUser = useCallback((next: AuthUser) => {
    revision.current += 1;
    setUser(next);
    setStatus("ready");
    setError("");
  }, []);
  const sessionError = useCallback((error: unknown) => {
    setUser(null);
    if (error instanceof ApiError && error.status === 401) {
      setStatus("ready");
      setError("");
    } else {
      setStatus("error");
      setError(
        error instanceof Error ? error.message : "Unable to load your session.",
      );
    }
  }, []);
  const refresh = useCallback(() => {
    setStatus("loading");
    setError("");
    return api<{ user: AuthUser }>("/auth/me")
      .then((result) => acceptUser(result.user))
      .catch(sessionError);
  }, [acceptUser, sessionError]);
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = revision.current;
    void api<{ user: AuthUser }>("/auth/me", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted && revision.current === startedAt)
          acceptUser(result.user);
      })
      .catch((error) => {
        if (!controller.signal.aborted && revision.current === startedAt)
          sessionError(error);
      });
    return () => controller.abort();
  }, [acceptUser, sessionError]);
  useEffect(() => {
    const expired = () => {
      revision.current += 1;
      setUser(null);
      setStatus("ready");
    };
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);
  async function logout() {
    await api<void>("/auth/logout", { method: "POST" });
    revision.current += 1;
    setUser(null);
    setStatus("ready");
  }
  return (
    <AuthContext.Provider
      value={{ user, status, error, refresh, acceptUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider.");
  return value;
}
