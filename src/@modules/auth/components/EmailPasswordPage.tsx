"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, API_BASE_URL } from "@/src/@libs/api/client";
import { useAuth } from "../context/AuthProvider";
import type { AuthUser } from "../types";
export default function EmailPasswordPage({ next, initialError }: { next: string; initialError: string }) {
  const { user, acceptUser } = useAuth(); const router = useRouter();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(initialError);
  const [google, setGoogle] = useState(false);
  useEffect(() => { if (user) router.replace(next); }, [user, router, next]);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ google: boolean }>("/auth/providers", { signal: controller.signal }).then(result => setGoogle(result.google)).catch(() => {});
    return () => controller.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { email: String(form.get("email")), password: String(form.get("password")), ...(register ? { displayName: String(form.get("displayName")) } : {}) };
    try {
      const result = await api<{ user: AuthUser }>(register ? "/auth/register" : "/auth/login", { method: "POST", body });
      acceptUser(result.user); router.replace(next);
    } catch (error) { setError(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-md px-6 py-12">
    <h1 className="text-2xl font-bold">{register ? "Create account" : "Sign in"}</h1>
    <p className="my-4 text-slate-300">Sign in to create or join a Bangla accessible meeting.</p>
    <form onSubmit={submit} className="space-y-4">
      {register && <label className="block">Display name<input className="mt-1 w-full rounded border p-2" name="displayName" autoComplete="name" maxLength={80} required disabled={busy} /></label>}
      <label className="block">Email<input className="mt-1 w-full rounded border p-2" name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} /></label>
      <label className="block">Password<input className="mt-1 w-full rounded border p-2" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={8} maxLength={128} required disabled={busy} /></label>
      <button className="rounded bg-emerald-700 px-4 py-2 disabled:opacity-50" disabled={busy}>{busy ? "Please wait…" : register ? "Register" : "Sign in"}</button>
    </form>
    <button disabled={busy} className="mt-4 block underline" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Already registered? Sign in" : "Create an account"}</button>
    {google && <a className="mt-4 inline-block rounded border p-2" href={`${API_BASE_URL}/auth/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>}
    <p role="alert" className="mt-4 text-amber-200">{error}</p>
  </section>;
}
