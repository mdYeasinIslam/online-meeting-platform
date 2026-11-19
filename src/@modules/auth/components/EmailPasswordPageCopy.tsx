"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, HandMetal, Info, Loader2 } from "lucide-react";
import { api, API_BASE_URL } from "@/src/@libs/api/client";
import { useAuth } from "../context/AuthProvider";
import type { AuthUser } from "../types";
import Link from "next/link";

export default function EmailPasswordPageCopy({
  next,
  initialError,
}: {
  next: string;
  initialError: string;
}) {
  const { user, acceptUser } = useAuth();
  const router = useRouter();

  // Core States (Preserved from your original implementation)
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [google, setGoogle] = useState(false);

  setTimeout(() => {
    setError(""); // Clear the error after 2 seconds
  }, 8000);
  // ZenUI Interactive States
  const [showPassword, setShowPassword] = useState(false);

  // Accessible IDs
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  useEffect(() => {
    const controller = new AbortController();
    void api<{ google: boolean }>("/auth/providers", {
      signal: controller.signal,
    })
      .then((result) => setGoogle(result.google))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      email: String(form.get("email")),
      password: String(form.get("password")),
      ...(register ? { displayName: String(form.get("displayName")) } : {}),
    };
    try {
      const result = await api<{ user: AuthUser }>(
        register ? "/auth/register" : "/auth/login",
        { method: "POST", body },
      );
      acceptUser(result.user);
      router.replace(next);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const googleAuth = () => {
    window.location.href = `${API_BASE_URL}/auth/google?next=${encodeURIComponent(next)}`;
    router.replace(next);
  };
  const inputClasses =
    "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-xs outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-teal-500";

  return (
    <div className="min-h-screen grid items-center justify-center ">
      <div className="mx-auto w-full max-w-sm dark:bg-[linear-gradient(135deg,#183c36_0%,#1c2530_45%,#1a202c_100%)] px-6 py-12 sm:px-6 border border-(--color-primary-800) sm:rounded-xl">
        {/* Brand Header[#375353] */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-white hover:underline"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-primary-500) text-white shadow-xs">
            <HandMetal className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-lg tracking-tight">Let&apos;s Talk</span>
        </Link>

        {/* Title & Mode Switcher */}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {register ? "Create an account" : "Sign in to your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 ">
          {register ? "Already have an account?" : "New to Let's Talk BdSL?"}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
            className="font-medium text-white/90 underline-offset-4 hover:underline disabled:opacity-50 dark:text- cursor-pointer"
          >
            {register ? "Sign in" : "Create an account"}
          </button>
        </p>

        {/* Google OAuth Provider */}
        {google && (
          <>
            <div className="mt-2">
              <button
                onClick={googleAuth}
                // href={`${API_BASE_URL}/auth/google?next=${encodeURIComponent(next)}`}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-xs outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="my-2 flex items-center gap-3 text-xs text-slate-800 dark:text-slate-300">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-500" />
              or continue with email
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-500" />
            </div>
          </>
        )}

        {/* Main Form */}
        <form onSubmit={submit} className={`space-y-2 ${google ? "" : "mt-8"}`}>
          {/* Error Alert Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Display Name (Register Mode Only) */}
          {register && (
            <div>
              <label
                htmlFor={nameId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Display name
              </label>
              <input
                id={nameId}
                name="displayName"
                type="text"
                autoComplete="name"
                placeholder="Your Name"
                maxLength={80}
                required
                disabled={busy}
                className={inputClasses}
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label
              htmlFor={emailId}
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={254}
              required
              disabled={busy}
              className={inputClasses}
            />
          </div>

          {/* Password Field with Visibility Toggle */}
          <div>
            <label
              htmlFor={passwordId}
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="password"
                minLength={8}
                maxLength={128}
                required
                disabled={busy}
                className={`${inputClasses} mt-0 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={busy}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 outline-none transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-(--color-primary-500) px-4 py-2.5 text-sm font-semibold text-white shadow-xs outline-none transition-colors hover:bg-(--color-primary-800) focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-950 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* Contextual Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Sign in to create or join a Bangla Sign Language accessible meeting.
        </p>
      </div>
    </div>
  );
}
