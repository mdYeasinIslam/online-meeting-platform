"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
export default function LandingHeaderUpdated() {
  const { user, logout } = useAuth(); const router = useRouter();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true); setError("");
    try { await logout(); router.replace("/auth"); }
    catch (error) { setError(error instanceof Error ? error.message : "Sign out failed."); }
    finally { setBusy(false); }
  }
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 px-6 py-4">
    <Link href="/" className="text-lg font-bold">Lets-Talk</Link>
    <nav className="flex flex-wrap items-center gap-4"><Link href="/dashboard">Dashboard</Link><Link href="/sign-demo">Alphabet demo</Link>
      {user ? <><span>{user.displayName}</span><button disabled={busy} onClick={signOut}>{busy ? "Signing out…" : "Sign out"}</button></> : <Link href="/auth">Sign in</Link>}
    </nav>{error && <p role="alert" className="w-full text-amber-200">{error}</p>}
  </header>;
}
