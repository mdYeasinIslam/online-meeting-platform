"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Video,
  Hand,
  Captions,
  Users,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  ChevronDown,
  MessageSquareText,
  Zap,
  Globe,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create or Join a Meeting Room",
    description:
      "Start an instant room from your dashboard or join with a shared room ID directly in your browser—no downloads or plugins required.",
    icon: Video,
    badge: "Instant WebRTC",
    highlights: [
      "Pre-join camera & microphone check",
      "One-click invite link sharing",
    ],
  },
  {
    number: "02",
    title: "Enable AI Sign Recognition",
    description:
      "Turn on Sign AI from the bottom meeting bar. MediaPipe tracks 21 3D hand landmarks locally on your device in real time.",
    icon: Hand,
    badge: "In-Browser Edge AI",
    highlights: [
      "Zero video frames sent to external AI servers",
      "Works smoothly at 30 FPS in standard browsers",
    ],
  },
  {
    number: "03",
    title: "Communicate via Live Captions",
    description:
      "Recognized Bangla Sign Language gestures automatically convert into readable Bangla text captions and broadcast to everyone in the room.",
    icon: Captions,
    badge: "Real-Time Sync",
    highlights: [
      "High-contrast accessible caption overlay",
      "Synchronized global chat & sign-message drawer",
    ],
  },
];

const architecturePipeline = [
  {
    step: "Webcam Frame",
    detail: "Captured locally via WebRTC",
    metric: "30 FPS",
  },
  {
    step: "MediaPipe Hands",
    detail: "Extracts 21 (x, y, z) landmarks",
    metric: "63 Features",
  },
  {
    step: "TensorFlow.js",
    detail: "Client-side neural classification",
    metric: "< 30ms Latency",
  },
  {
    step: "LiveKit Data Channel",
    detail: "Broadcasts lightweight text payload",
    metric: "Zero Video Lag",
  },
];

const faqs = [
  {
    q: "Do participants need to install any software or browser extension?",
    a: "No. Everything runs natively inside modern web browsers (Chrome, Edge, Safari, Firefox) using WebRTC and WebAssembly.",
  },
  {
    q: "Is my camera video sent to a server for sign language detection?",
    a: "No. Hand landmark extraction and sign recognition run 100% locally inside your browser using MediaPipe and TensorFlow.js. Only the recognized text caption is shared with meeting participants.",
  },
  {
    q: "Can hearing and Deaf participants join the same call?",
    a: "Yes. Hearing participants can speak normally or use the live chat drawer, while Deaf and hard-of-hearing participants can sign in front of their camera and have their signs translated into live text captions.",
  },
  {
    q: "Does it work on mobile phones and tablets as well as laptops?",
    a: "Yes. The interface adapts automatically across mobile, tablet, and desktop viewports with touch-friendly meeting controls.",
  },
];

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-white text-[#1B2431] antialiased selection:bg-[#129c72]/20 selection:text-[#15573c]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1B2431] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        {/* Ambient Brand Glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#129c72]/20 blur-[100px] sm:h-96 sm:w-96" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-[#15573c]/35 blur-[100px] sm:h-80 sm:w-80" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#129c72]/35 bg-[#129c72]/15 px-3.5 py-1.5 text-xs font-medium text-[#6ee7b7] sm:px-4 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#129c72] sm:h-4 sm:w-4" />
              Simple, Private &amp; Accessible Workflow
            </span>

            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              How{" "}
              <span className="bg-gradient-to-r from-[#129c72] to-[#5eead4] bg-clip-text text-transparent">
                Let&apos;s Talk BdSL
              </span>{" "}
              Works
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-8">
              From starting a video room to translating Bangla Sign Language
              into real-time captions—see how our browser-based AI bridges
              communication in three effortless steps.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
              <Link
                href="/meeting"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007a55] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#007a55]/25 transition hover:bg-[#129c72] sm:w-auto sm:text-base"
              >
                Start a Free Meeting <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-demo"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#129c72]/50 hover:bg-white/10 sm:w-auto sm:text-base"
              >
                Try Sign Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Visual Workflow */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold tracking-wider text-[#007a55] uppercase sm:text-sm">
              Step-by-Step Guide
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1B2431] sm:text-3xl lg:text-4xl">
              Start communicating in under 30 seconds
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Designed so anyone can host or join an inclusive meeting without
              technical setup.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:mt-16 lg:gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-[#129c72]/40 hover:shadow-xl hover:shadow-[#007a55]/10 sm:p-8"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#129c72]/12 text-[#007a55] transition group-hover:bg-[#007a55] group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-4xl font-extrabold tracking-tight text-[#129c72]/20 sm:text-5xl">
                        {step.number}
                      </span>
                    </div>

                    <span className="mt-6 inline-block rounded-full border border-[#129c72]/20 bg-[#f4fbf8] px-3 py-1 text-xs font-medium text-[#15573c]">
                      {step.badge}
                    </span>

                    <h3 className="mt-4 text-xl font-bold text-[#1B2431]">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {step.description}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
                    {step.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-xs font-medium text-slate-700 sm:text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#129c72]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Under the Hood: Real-Time AI Pipeline */}
      <section className="bg-[#f4fbf8] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold tracking-wider text-[#007a55] uppercase sm:text-sm">
              Under the Hood
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1B2431] sm:text-3xl lg:text-4xl">
              How Real-Time Sign Recognition Works
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Instead of streaming heavy video to an AI server, our edge
              pipeline extracts 3D hand keypoints directly inside your browser.
            </p>
          </div>

          {/* Responsive Pipeline Flow */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {architecturePipeline.map((stage, index) => (
              <div
                key={stage.step}
                className="relative flex flex-col justify-between rounded-2xl border border-[#129c72]/20 bg-white p-6 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B2431] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="rounded-md bg-[#129c72]/15 px-2.5 py-1 font-mono text-xs font-semibold text-[#15573c]">
                      {stage.metric}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-[#1B2431]">
                    {stage.step}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {stage.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive UI Preview Card (Responsive Split) */}
          <div className="mt-12 overflow-hidden rounded-3xl border border-[#129c72]/25 bg-[#1B2431] p-6 text-white shadow-xl sm:p-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#129c72]/20 px-3 py-1 text-xs font-semibold text-[#6ee7b7]">
                <Cpu className="h-3.5 w-3.5" />
                Privacy-First Edge Architecture
              </span>
              <h3 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
                Built for low latency and complete visual clarity
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Whether you are on a laptop or smartphone, participants get a
                clean multi-column video grid, a slide-over drawer for global
                chat &amp; sign history, and high-contrast Bangla captions.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-[#6ee7b7]">
                    <Zap className="h-4 w-4" />
                    <span className="text-lg font-bold">21 Joints</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    3D hand landmark tracking per frame
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-[#6ee7b7]">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-lg font-bold">100% Local</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    In-browser TensorFlow.js inference
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Live Meeting Caption Preview */}
            <div className="mt-8 lg:col-span-6 lg:mt-0">
              <div className="rounded-2xl border border-[#129c72]/30 bg-slate-900/90 p-4 shadow-2xl sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#129c72] animate-pulse" />
                    <span className="text-xs font-medium text-slate-200 sm:text-sm">
                      Live Room Caption Feed
                    </span>
                  </div>
                  <span className="rounded-md bg-[#007a55]/30 px-2.5 py-0.5 font-mono text-[11px] text-[#6ee7b7]">
                    Sign AI: Active
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007a55] text-xs font-bold text-white">
                      AR
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-white">
                          Arif Rahman (Signer)
                        </p>
                        <span className="text-[10px] text-[#6ee7b7]">
                          Sign-to-Text
                        </span>
                      </div>
                      <p className="mt-1 text-base font-semibold text-emerald-300 sm:text-lg">
                        আসসালামু আলাইকুম, সবাই কেমন আছেন?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                      NS
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-white">
                          Nusrat Jahan
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <MessageSquareText className="h-3 w-3" /> Chat
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                        ওয়ালাইকুম আসসালাম! আমরা ভালো আছি, মিটিং শুরু করা যাক।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive FAQ Accordion */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[#007a55] uppercase sm:text-sm">
              Common Questions
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1B2431] sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="p-5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 text-left font-semibold text-[#1B2431] outline-none focus-visible:text-[#007a55]"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#007a55] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#15573c] via-[#007a55] to-[#129c72] px-6 py-12 text-center text-white shadow-xl shadow-[#007a55]/15 sm:px-12 sm:py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-5 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Ready to experience barrier-free meetings?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-emerald-50 sm:text-base">
            Create a room in seconds or test real-time Bangla Sign Language
            recognition directly in your browser.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#15573c] shadow-sm transition hover:bg-[#f4fbf8] sm:w-auto sm:text-base"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto sm:text-base"
            >
              Explore All Features
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
