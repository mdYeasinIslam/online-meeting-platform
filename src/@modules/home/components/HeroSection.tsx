"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  FaArrowRight as ArrowRight,
  FaHeart as Heart,
  FaUsers as Users,
  FaVideo as Video,
} from "react-icons/fa6";
import CreateMeetingFormCopy from "../../meeting/components/updated/CreateMeetingFormCopy";

const participants = [
  {
    name: "Sarah Ahmed",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
  },
  {
    name: "Rahim Hasan",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
  },
  {
    name: "Nusrat Jahan",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400",
  },
];

const HeroSection = () => {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-(--color-primary-900) px-5 pb-20 pt-16 sm:px-8 lg:px-12 lg:pb-28 lg:pt-20"
    >
      {/* Decorative shapes */}
      <div className="absolute -right-32 top-10 h-[500px] w-[650px] rounded-full bg-blue-100/60 blur-3xl" />
      {/* <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl" /> */}

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left content */}
        <div className="relative z-20">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-(--color-primary-500) sm:text-sm">
            <Heart size={17} fill="currentColor" />
            Accessible Meeting for a More Inclusive Bangladesh
          </div>

          <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.16] tracking-tight text-(--color-primary-400) sm:text-5xl lg:text-[58px]">
            Break the Communication Barrier{" "}
            <span className="relative inline-block">
              Together
              <span className="absolute -bottom-2 left-0 h-1.5 w-full -rotate-2 rounded-full       bg-(--color-primary-400)" />
            </span>
          </h2>

          <p className="mt-8 max-w-xl text-lg leading-8 text-gray-400 sm:text-md">
            Join secure online meetings with real-time Bangla Sign Language to
            Text and captions. Communication should be accessible to everyone.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <div className="relative">
              <button
                type="button"
                aria-expanded={isCreateMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsCreateMenuOpen((isOpen) => !isOpen)}
                className="max-md:w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-(--color-primary-800) px-7 py-4 font-bold text-white shadow-lg shadow-green-800 transition hover:-translate-y-1 hover:bg-(--color-primary-500) cursor-pointer!"
              >
                <Video size={21} />
                Start a Meeting
                <ArrowRight size={19} />
              </button>

              {isCreateMenuOpen && (
                <CreateMeetingFormCopy />
                // <div
                //   role="menu"
                //   className="absolute left-0 top-full z-30 mt-2 min-w-full overflow-hidden rounded-xl bg-white p-2 text-sm shadow-xl"
                // >
                //   <Link
                //     href="/meeting/create"
                //     role="menuitem"
                //     onClick={() => setIsCreateMenuOpen(false)}
                //     className="block whitespace-nowrap rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-(--color-primary-500)"
                //   >
                //     Create Instant Meeting
                //   </Link>
                //   <Link
                //     href="/meeting/create?later=true"
                //     role="menuitem"
                //     onClick={() => setIsCreateMenuOpen(false)}
                //     className="block whitespace-nowrap rounded-lg px-4 py-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-(--color-primary-500)"
                //   >
                //     Create Meeting for later
                //   </Link>
                // </div>
              )}
            </div>

            <Link
              href="/meeting/join"
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-blue-400 bg-white px-7 py-4 font-bold text-slate-800 transition hover:-translate-y-1 hover:bg-blue-50 cursor-pointer"
            >
              <Users size={21} />
              Join a Meeting
            </Link>
          </div>

          {/* Community */}
          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3">
              {participants.map((person) => (
                <img
                  key={person.name}
                  src={person.image}
                  alt={person.name}
                  className="h-10 w-10 rounded-full border-[3px] border-white object-cover"
                />
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-blue-100 text-xs font-bold text-(--color-primary-500)">
                +
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Building a more inclusive community
            </p>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative z-10 ">
          {/* <VideoMeetingPreview /> */}
          <Image
            src="/images/banner/hero.jpeg"
            alt="Meeting preview"
            width={600}
            height={600}
            className="w-full h-full rounded-2xl shadow-lg shadow-blue-800/50"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
