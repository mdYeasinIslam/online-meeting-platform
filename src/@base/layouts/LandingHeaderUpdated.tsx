"use client";
import { cn } from "@/src/@libs/utils/cn";
import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import { useAuth } from "@/src/@modules/auth/context/AuthProvider";
import CreateMeetingFormCopy from "@/src/@modules/meeting/components/updated/CreateMeetingFormCopy";
import JoinMeetingFormCopy from "@/src/@modules/meeting/components/updated/JoinMeetingFormCopy";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowRight as ArrowRight,
  FaUsers as Users,
  FaVideo as Video,
} from "react-icons/fa6";
export default function LandingHeaderUpdated() {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinMeeting, setJoinMeeting] = useState("");

  const createMenuFn = () => {
    setIsCreateMenuOpen((isOpen) => !isOpen);
    setIsOpenDropdown(true);
  };

  const pathname = usePathname();
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
    <header
      className={cn(
        "flex lg:flex-wrap items-center justify-between gap-2 md:gap-4 border-b border-slate-700 px-2 py-2 lg:px-6 lg:py-4",
        pathname === "/auth" || pathname.includes("/meeting") ? "hidden" : "",
      )}
    >
      <div className="flex items-center">
        <Image
          src="/logo.webp"
          alt="Let's Talk Logo"
          width={60}
          height={60}
          className="max-sm:w-10 max-sm:h-10 rounded-full"
        />
        <div>
          <Link href="/" className="text-sm md:text-lg font-bold">
            Let's Talk
          </Link>
          <p className="text-xs md:text-sm text-slate-400">
            Meet - Communicate - Include
          </p>
        </div>
      </div>
      <nav className="flex lg:flex-wrap items-center gap-2 lg:gap-4">
        <div className="hidden md:flex flex-col gap-4 sm:flex-row ">
          {/* Join meeting */}
          <div>
            {/* <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-400 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-blue-50 cursor-pointer">
              <Users size={21} />
              Join a Meeting
            </div> */}
            <JoinMeetingFormCopy name="email" onJoinMeeting={setJoinMeeting} />
          </div>

          {/* New meeting */}
          <div
            className="relative"
            onMouseEnter={() => setIsCreateMenuOpen(true)}
            onMouseLeave={() => setIsCreateMenuOpen(false)}
          >
            <button
              type="button"
              aria-expanded={isCreateMenuOpen}
              aria-haspopup="menu"
              onClick={createMenuFn}
              className="max-md:w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-primary-800) px-4 py-2 font-bold text-white transition hover:-translate-y-0.5 hover:bg-(--color-primary-500) cursor-pointer!"
            >
              <Video size={21} />
              New
              {/* <ArrowRight size={19} /> */}
            </button>
            {isCreateMenuOpen && (
              // <AuthGuard>
                <CreateMeetingFormCopy />
             // </AuthGuard>
            )}
            {/* {isCreateMenuOpen && isOpenDropdown && (
              <AuthGuard>
                <CreateMeetingFormCopy />
              </AuthGuard>
            )} */}
          </div>
        </div>
        {/* <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <Link href="/sign-demo" className="hover:underline">
          Alphabet demo
        </Link> */}

        {/* profile and authentication route */}
        {user ? (
          <div className="flex items-center gap-2 md:gap-4">
            {/* <Link href="/research/data-collection" className="hover:underline">
              Data collection
            </Link> */}
            <div
              className="relative"
              onMouseEnter={() => setIsProfileMenuOpen(true)}
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <button
                type="button"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="flex w-6 h-6 md:h-8 md:w-8 items-center justify-center gap-2 rounded-full border bg-(--color-primary-500) cursor-pointer hover:bg-gray-600"
              >
                <span className="font-bold">
                  {user.displayName.slice(0, 1)}
                </span>
              </button>
              {isProfileMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 z-10 pt-2  min-w-32 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-lg"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 hover:bg-slate-800"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 hover:bg-slate-800"
                  >
                    Dashboard
                  </Link>
                </div>
              )}
            </div>
            <button
              disabled={busy}
              onClick={signOut}
              className="rounded-md md:rounded-xl border border-(--color-primary-800) px-2 py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 text-sm font-bold  transition hover:bg-(--color-primary-800) cursor-pointer"
            >
              {busy ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/auth"
              className="rounded-xl border border-(--color-primary-800) px-6 py-3 text-sm font-bold  transition hover:bg-(--color-primary-800)"
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
