"use client";

import React, { useEffect, useState } from "react";

interface HeroStatusCardProps {
  userName?: string;
  email?: string;
  planLabel?: string;
  meetingsCreated?: number;
  meetingsLimit?: string;
  liveClock?: boolean;
}

export default function HeroStatusCard({
  userName = "Great Stack",
  email = "user.greatstack@gmail.com",
  planLabel = "PREMIUM",
  meetingsCreated = 2,
  meetingsLimit = "Unlimited",
  liveClock = true,
}: HeroStatusCardProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    if (!liveClock) return;

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [liveClock]);

  const formattedTime = now
    ? now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "04:03 PM";

  const formattedDate = now
    ? `${now.toLocaleDateString("en-US", { weekday: "long" })}. ${now.toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      )}`
    : "Tuesday. Aug 25, 2026";

    return (
  <div className="w-full max-w-[560px] rounded-3xl border border-[#129c72]/25 bg-gradient-to-br from-[#f4fbf8] via-[#e4f5ee] to-[#c7ebdc] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,122,85,0.12)] backdrop-blur-md">
     {/* <div className="w-full max-w-[560px] rounded-3xl border border-white/80 bg-gradient-to-br from-[#f8fbff] via-[#eef5ff] to-[#cce2ff] p-6 sm:p-8 shadow-[0_20px_50px_rgba(37,99,235,0.08)] backdrop-blur-md"> */}
      {/* Top Greeting */}
      <p className="text-left text-lg font-normal tracking-tight text-slate-700">
        Hi, <span className="font-medium text-slate-800">{userName}</span>
      </p>

      {/* Center Digital Clock & Date */}
      <div className="my-7 flex flex-col items-center text-center">
        <time className="text-5xl sm:text-[54px] font-light tracking-tight text-[#0f1c2e] tabular-nums leading-none">
          {formattedTime}
        </time>
        <p className="mt-3 text-sm sm:text-[15px] font-medium text-[#2563eb]">
          {formattedDate}
        </p>
      </div>

      {/* Account Info & Plan Badge */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs sm:text-[13.5px] text-slate-500">
          Logged in as:{" "}
          <span className="font-medium text-slate-800">{email}</span>
        </p>

        <span className="inline-flex items-center rounded-full bg-[#1450d8] px-4 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow-xs">
          {planLabel}
        </span>
      </div>

      {/* Bottom Inner Pill Card (Monthly Meetings) */}
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/70 bg-white/55 px-5 py-4 shadow-2xs backdrop-blur-sm">
        <span className="text-xs sm:text-sm font-normal text-slate-600">
          Monthly Meetings
        </span>
        <span className="text-xs sm:text-sm font-medium text-slate-800">
          {meetingsCreated} Created{" "}
          <span className="text-slate-600">
            (
            <span className="rounded-xs bg-blue-500/20 px-1 text-[#1d4ed8]">
              {meetingsLimit}
            </span>
            )
          </span>
        </span>
      </div>
    </div>
  );
}
