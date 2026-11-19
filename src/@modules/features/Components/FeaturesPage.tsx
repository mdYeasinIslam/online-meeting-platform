import {
  Video,
  Hand,
  Captions,
  Users,
  ShieldCheck,
  Globe,
  ArrowRight,
  Mic,
  Accessibility,
  Zap,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Hand,
    title: "Bangla Sign Language Recognition",
    description:
      "Convert Bangla Sign Language gestures into readable Bangla text in real time using AI-powered hand tracking.",
    color: "bg-[#129c72]/12 dark:bg-(--color-primary-500) dark:text-white text-[#007a55] ",
    tag: "AI Powered",
  },
  {
    icon: Captions,
    title: "Live Bangla Captions",
    description:
      "Display spoken Bangla as live text captions so participants can follow every conversation.",
    color: "bg-[#007a55]/12 text-[#15573c]  dark:bg-(--color-primary-500) dark:text-white",
    tag: "Real-time",
  },
  {
    icon: Video,
    title: "HD Video Meetings",
    description:
      "Connect with friends, colleagues and teams through smooth, browser-based video meetings.",
    color: "bg-[#15573c]/12 text-[#15573c] dark:bg-(--color-primary-500) dark:text-white",
  },
  {
    icon: Users,
    title: "Multi-user Meetings",
    description:
      "Invite multiple participants and communicate together in one accessible meeting room.",
    color: "bg-[#129c72]/12 text-[#007a55] dark:bg-(--color-primary-500) dark:text-white",
  },
  {
    icon: ShieldCheck,
    title: "Secure Meetings",
    description:
      "Join private meeting rooms with authentication and controlled meeting access.",
    color: "bg-[#007a55]/12 text-[#15573c] dark:bg-(--color-primary-500) dark:text-white",
  },
  {
    icon: Globe,
    title: "Browser Based",
    description:
      "Join meetings directly from your browser without installing additional software.",
    color: "bg-[#15573c]/12 text-[#15573c] dark:bg-(--color-primary-500) dark:text-white",
  },
];

const steps = [
  {
    number: "01",
    title: "Create or Join",
    description: "Start a meeting or join an existing meeting room.",
  },
  {
    number: "02",
    title: "Enable Accessibility",
    description: "Turn on sign recognition or live caption features.",
  },
  {
    number: "03",
    title: "Communicate Freely",
    description: "See gestures and spoken communication translated into text.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-(--color-primary-900) text-[#1B2431]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1B2431] md:px-6 py-6 md:py-12 lg:py-24 text-white">
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#129c72]/20 blur-[110px]" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-[#15573c]/35 blur-[100px]" />

        <div className="container relative mx-auto grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#129c72]/35 bg-[#129c72]/15 px-4 py-2 text-sm text-[#6ee7b7]">
              <Zap size={15} className="text-[#129c72]" />
              Communication without barriers
            </span>

            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Meetings made
              <span className="block bg-gradient-to-r from-[#129c72] to-[#5eead4] bg-clip-text text-transparent">
                accessible for everyone.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Experience a more inclusive way to communicate with AI-powered
              Bangla Sign Language recognition and live Bangla captions.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/meeting"
                className="max-sm:w-full inline-flex items-center gap-2 rounded-xl bg-[#007a55] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#007a55]/25 transition hover:bg-[#129c72]"
              >
                Start a Meeting <ArrowRight size={18} />
              </Link>

              <a
                href="#features"
                className="max-sm:w-full rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:border-[#129c72]/50 hover:bg-white/10"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Meeting preview */}
          <div className="rounded-2xl border border-[#129c72]/25 bg-white/[0.05] p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Accessible Meeting</p>
                <p className="text-xs text-slate-400">Live session preview</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-[#129c72]/20 bg-gradient-to-br from-[#15573c] to-[#1B2431]">
                <Hand size={55} className="text-[#6ee7b7]" />
              </div>
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#007a55]/50 to-[#1B2431]">
                <Users size={55} className="text-emerald-200" />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#129c72]/30 bg-[#129c72]/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6ee7b7]">
                <Accessibility size={15} className="text-[#129c72]" />
                SIGN TO TEXT
                <span className="ml-auto rounded-full bg-[#129c72]/20 px-2.5 py-0.5 text-[#6ee7b7]">
                  Active
                </span>
              </div>
              <p className="text-lg font-medium text-white">
                স্বাগতম! আপনি কেমন আছেন?
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
                <Mic size={15} className="text-[#129c72]" />
                LIVE CAPTIONS
              </div>
              <p className="text-sm text-slate-300">সবাইকে মিটিংয়ে স্বাগতম।</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-10 md:py-20">
        <div className="container mx-auto ">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="text-sm font-semibold tracking-wider text-[#007a55]">
              OUR FEATURES
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#1B2431] dark:text-white sm:text-4xl">
              Everything you need for inclusive communication
            </h2>
            <p className="mt-5 leading-7 text-slate-600 dark:text-slate-400">
              Powerful meeting tools designed to make online communication
              easier, smarter and more accessible.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200/90 bg-white dark:bg-(--color-primary-500)/30 p-8 transition duration-300 hover:-translate-y-1 hover:border-[#129c72]/40 hover:shadow-xl hover:shadow-[#007a55]/10"
                >
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-3 ${feature.color}`}>
                      <Icon size={25} />
                    </div>
                    {feature.tag && (
                      <span className="rounded-full border border-[#129c72]/20 bg-[#129c72]/10 px-3 py-1 text-xs font-medium text-[#15573c] dark:text-white">
                        {feature.tag}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-7 text-xl font-bold text-[#1B2431] dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white">
                    {feature.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#007a55] opacity-0 transition group-hover:opacity-100 dark:text-white">
                    Learn more <ArrowRight size={16} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f4fbf8] dark:bg-(--color-primary-800)/20 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <span className="text-sm font-semibold tracking-wider text-[#007a55] dark:text-white">
              SIMPLE PROCESS
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1B2431] dark:text-white sm:text-4xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-[#129c72]/15 bg-white dark:bg-(--color-primary-400)/50 p-8 shadow-xs"
              >
                <span className="text-5xl font-bold text-[#129c72]/20 dark:text-white">
                  {step.number}
                </span>
                <h3 className="mt-5 text-xl font-bold text-[#1B2431] dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600 dark:text-white">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 rounded-3xl bg-[#1B2431] p-8 text-white sm:p-14 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold tracking-wider text-[#129c72]">
              BUILT FOR INCLUSION
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
              Technology should connect everyone.
            </h2>
            <p className="mt-5 leading-8 text-slate-300">
              Our mission is to reduce communication barriers and make online
              meetings more accessible for the Deaf and hard-of-hearing
              community in Bangladesh.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Bangla Sign Language support",
                "Accessible communication experience",
                "Simple and intuitive meeting interface",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-slate-200"
                >
                  <CheckCircle2 className="shrink-0 text-[#129c72]" size={19} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#129c72]/25 bg-gradient-to-br from-[#15573c]/60 via-[#007a55]/25 to-[#1B2431]">
            <Accessibility
              size={120}
              strokeWidth={1}
              className="text-[#6ee7b7]"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#15573c] via-[#007a55] to-[#129c72] px-8 py-16 text-center text-white shadow-xl shadow-[#007a55]/15">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Let&apos;s make communication accessible.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-emerald-50">
            Start your meeting and experience a more inclusive way to connect.
          </p>
          <Link
            href="/meeting"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-[#15573c] shadow-sm transition hover:bg-[#f4fbf8]"
          >
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
