"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import Image from "next/image";

export default function LandingHeaderUpdated() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center">
        <Image
          src="/logo.webp"
          alt="Let's Talk Logo"
          width={60}
          height={60}
          className="rounded-full"
        />
        <div>
          <Link href="/" className="text-lg font-bold">
            Let's Talk
          </Link>
          <p className="text-sm text-slate-400">Meet - Communicate - Include</p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <Link href="/sign-demo" className="hover:underline">
          Alphabet demo
        </Link>
        {user ? (
          <>
            <Link href="/research/data-collection" className="hover:underline">
              Data collection
            </Link>
            <button className="flex items-center justify-center gap-2 rounded-full border w-8 h-8 bg-gray-700">
              <span className=" ">{user.displayName.slice(0, 1)}</span>
            </button>
            <button
              disabled={busy}
              onClick={signOut}
              className="rounded-xl border border-(--color-primary-500) px-6 py-3 text-sm font-bold  transition hover:bg-(--color-primary-500)"
            >
              {busy ? "Signing out…" : "Sign Out"}
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth"
              className="rounded-xl border border-(--color-primary-500) px-6 py-3 text-sm font-bold  transition hover:bg-(--color-primary-500)"
            >
              Sign in
            </Link>
          </>
        )}
      </nav>
      {error && (
        <p role="alert" className="w-full text-amber-200">
          {error}
        </p>
      )}
    </header>
  );
}
