"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";

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
      <Link href="/" className="text-lg font-bold">
        MeetHub
      </Link>
      <nav className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <Link href="/sign-demo" className="hover:underline">
          Alphabet demo
        </Link>
        {user ? (
          <>
            <button className="flex items-center justify-center gap-2 rounded-full border w-6 h-6 bg-gray-700">
              <span className=" ">{user.displayName.slice(0, 1)}</span>
            </button>
            <button
              disabled={busy}
              onClick={signOut}
              className="border px-2 py-1 rounded-md cursor-pointer hover:bg-(--color-primary-500)"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/auth" className="cursor-pointer">
            Sign in
          </Link>
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
