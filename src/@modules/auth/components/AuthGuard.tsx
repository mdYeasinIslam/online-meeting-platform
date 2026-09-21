"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthProvider";
import { safeReturnPath } from "../libs/return-path";
export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, status, error, refresh } = useAuth();
  const path = usePathname(); const router = useRouter();
  useEffect(() => {
    if (status === "ready" && !user) router.replace(`/auth?next=${encodeURIComponent(safeReturnPath(path))}`);
  }, [status, user, path, router]);
  if (status === "error") return <section className="p-6"><p role="alert">{error}</p><button className="mt-4 rounded border p-2" onClick={() => void refresh()}>Retry connection</button></section>;
  if (status === "loading" || !user) return <p role="status" className="p-6">Checking your session…</p>;
  return children;
}
