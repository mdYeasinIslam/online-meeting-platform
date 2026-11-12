// "use client";

// import React, { useState } from "react";

// type IconProps = { className?: string };

// const Icon = ({ className = "" }: IconProps) => (
//   <svg
//     aria-hidden="true"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={className}
//   >
//     <circle cx="12" cy="12" r="8" />
//     <path d="M8 12h8M12 8v8" />
//   </svg>
// );

// const Mic = Icon;
// const MicOff = Icon;
// const Video = Icon;
// const VideoOff = Icon;
// const PhoneOff = Icon;
// const HandMetal = Icon;
// const Eye = Icon;
// const EyeOff = Icon;
// const Activity = Icon;
// const Users = Icon;
// const Settings = Icon;
// const Sparkles = Icon;

// interface MeetingRoomUIProps {
//   roomId?: string;
//   localVideoRef: React.RefObject<HTMLVideoElement | null>;
//   canvasRef: React.RefObject<HTMLCanvasElement | null>;
//   remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
//   detectedSign: string;
//   confidence: number;
//   isModelReady: boolean;
//   latencyMs?: number;
// }

// export default function MeetingRoomUI({
//   roomId = "bdsl-thesis-2026",
//   localVideoRef,
//   canvasRef,
//   remoteVideoRef,
//   detectedSign = "হাত দেখান",
//   confidence = 94,
//   isModelReady = true,
//   latencyMs = 28,
// }: MeetingRoomUIProps) {
//   // Control States
//   const [micActive, setMicActive] = useState(true);
//   const [cameraActive, setCameraActive] = useState(true);
//   const [aiTrackingActive, setAiTrackingActive] = useState(true);
//   const [showSkeleton, setShowSkeleton] = useState(true);

//   return (
//     <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
//       {/* Top Navbar */}
//       <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 px-6 backdrop-blur bg-slate-900/60 z-20">
//         <div className="flex items-center gap-3">
//           <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
//             <HandMetal className="h-5 w-5" />
//           </div>
//           <div>
//             <h1 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
//               Let&apos;s Talk{" "}
//               <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
//                 BdSL AI
//               </span>
//             </h1>
//             <p className="text-xs text-slate-400 font-mono">Room: #{roomId}</p>
//           </div>
//         </div>

//         {/* Live Academic Telemetry Pill (Great for Viva Demonstrations) */}
//         <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3.5 py-1.5 shadow-inner">
//           <span
//             className={`h-2.5 w-2.5 rounded-full ${
//               isModelReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
//             }`}
//           />
//           <span className="text-xs font-medium text-slate-300">
//             {isModelReady ? "BdSL36 Model Ready" : "Loading Weights..."}
//           </span>
//           <span className="text-slate-600">|</span>
//           <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
//             <Activity className="h-3.5 w-3.5 text-emerald-400" />
//             <span>{latencyMs}ms</span>
//           </div>
//         </div>
//       </header>

//       {/* Main Video Grid */}
//       <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 overflow-hidden">
//         {/* Remote Peer Stream Container */}
//         <div className="relative flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl overflow-hidden group">
//           <video
//             ref={remoteVideoRef}
//             autoPlay
//             playsInline
//             className="h-full w-full object-cover"
//           />

//           {/* Fallback if remote peer is disconnected */}
//           <div className="absolute flex flex-col items-center justify-center text-center p-6 text-slate-500 pointer-events-none">
//             <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-3">
//               <Users className="h-8 w-8 text-slate-600" />
//             </div>
//             <p className="text-sm font-medium">Waiting for peer to join...</p>
//             <p className="text-xs text-slate-600">Share room link to connect</p>
//           </div>

//           {/* Subtitle / Real-time Translation Overlay */}
//           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[85%] rounded-2xl bg-black/70 backdrop-blur-md px-5 py-3 border border-white/10 shadow-2xl flex items-center gap-3">
//             <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
//             <div className="text-center">
//               <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
//                 Live BdSL Caption
//               </span>
//               <p className="text-xl font-bold text-white tracking-wide">
//                 {detectedSign ? detectedSign : "সঙ্কেতের অপেক্ষা..."}
//               </p>
//             </div>
//           </div>

//           <div className="absolute top-4 left-4 rounded-lg bg-black/40 backdrop-blur px-2.5 py-1 text-xs font-medium text-slate-300">
//             Remote Participant
//           </div>
//         </div>

//         {/* Local User Stream with Live Sign Detection */}
//         <div className="relative flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-slate-900/60 shadow-2xl overflow-hidden ring-1 ring-emerald-500/10">
//           {/* Hidden reference video for MediaPipe processing */}
//           <video
//             ref={localVideoRef}
//             className="hidden"
//             playsInline
//             muted
//             autoPlay
//           />

//           {/* Canvas for Mirrored Camera & Skeleton Overlay */}
//           <canvas
//             ref={canvasRef}
//             className={`h-full w-full object-cover transform -scale-x-100 ${
//               !cameraActive ? "hidden" : "block"
//             }`}
//           />

//           {!cameraActive && (
//             <div className="flex flex-col items-center justify-center text-slate-500">
//               <VideoOff className="h-12 w-12 mb-2 text-slate-600" />
//               <p className="text-sm">Your Camera is Off</p>
//             </div>
//           )}

//           {/* Hand Guidance Target Zone (Assists user positioning) */}
//           {cameraActive && aiTrackingActive && (
//             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
//               <div className="w-64 h-64 border-2 border-dashed border-emerald-500/30 rounded-3xl flex items-start justify-center p-2">
//                 <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-400/70 bg-emerald-950/60 px-2 py-0.5 rounded">
//                   Place Hand Here
//                 </span>
//               </div>
//             </div>
//           )}

//           {/* Local Feedback Card (Bottom of Local Camera) */}
//           <div className="absolute bottom-5 inset-x-6 flex items-center justify-between pointer-events-none">
//             <div className="flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-2">
//               <div className="text-left">
//                 <span className="text-[10px] uppercase font-bold text-slate-400 block">
//                   Recognized (Self)
//                 </span>
//                 <span className="text-lg font-bold text-emerald-400">
//                   {detectedSign}
//                 </span>
//               </div>
//               {confidence > 0 && (
//                 <span className="ml-2 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-0.5 border border-emerald-500/30">
//                   {confidence}%
//                 </span>
//               )}
//             </div>

//             <div className="rounded-lg bg-black/40 backdrop-blur px-2.5 py-1 text-xs font-medium text-slate-300">
//               You (Signer)
//             </div>
//           </div>
//         </div>
//       </main>

//       {/* Bottom Floating Control Bar */}
//       <footer className="h-20 flex items-center justify-center border-t border-slate-800/80 bg-slate-900/40 px-6 backdrop-blur z-20">
//         <div className="flex items-center gap-3">
//           {/* Mute Button */}
//           <button
//             onClick={() => setMicActive(!micActive)}
//             className={`p-3.5 rounded-2xl transition-all duration-200 border ${
//               micActive
//                 ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
//                 : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
//             }`}
//             title={micActive ? "Mute Microphone" : "Unmute Microphone"}
//           >
//             {micActive ? (
//               <Mic className="h-5 w-5" />
//             ) : (
//               <MicOff className="h-5 w-5" />
//             )}
//           </button>

//           {/* Camera Button */}
//           <button
//             onClick={() => setCameraActive(!cameraActive)}
//             className={`p-3.5 rounded-2xl transition-all duration-200 border ${
//               cameraActive
//                 ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
//                 : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
//             }`}
//             title={cameraActive ? "Turn Off Camera" : "Turn On Camera"}
//           >
//             {cameraActive ? (
//               <Video className="h-5 w-5" />
//             ) : (
//               <VideoOff className="h-5 w-5" />
//             )}
//           </button>

//           {/* Toggle AI Sign Recognition Engine */}
//           <button
//             onClick={() => setAiTrackingActive(!aiTrackingActive)}
//             className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all duration-200 border ${
//               aiTrackingActive
//                 ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/30 font-medium"
//                 : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
//             }`}
//           >
//             <HandMetal className="h-5 w-5" />
//             <span className="text-xs font-semibold">
//               {aiTrackingActive ? "Sign AI: ON" : "Sign AI: OFF"}
//             </span>
//           </button>

//           {/* Toggle Landmarks Skeleton Visualization */}
//           <button
//             onClick={() => setShowSkeleton(!showSkeleton)}
//             className={`p-3.5 rounded-2xl transition-all duration-200 border ${
//               showSkeleton
//                 ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700"
//                 : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
//             }`}
//             title={showSkeleton ? "Hide Skeleton Lines" : "Show Skeleton Lines"}
//           >
//             {showSkeleton ? (
//               <Eye className="h-5 w-5" />
//             ) : (
//               <EyeOff className="h-5 w-5" />
//             )}
//           </button>

//           {/* End Call Button */}
//           <button
//             className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition-all duration-200 font-semibold shadow-lg shadow-red-900/40 ml-2"
//             title="Leave Meeting"
//           >
//             <PhoneOff className="h-5 w-5" />
//             <span className="text-xs">Leave Call</span>
//           </button>
//         </div>
//       </footer>
//     </div>
//   );
// }




"use client";

import {
  FaArrowRight as ArrowRight,
  FaVideo as Video,
  FaUsers as Users,
  FaHand as Hand,
  FaClosedCaptioning as Captions,
  FaShieldHalved as ShieldCheck,
  FaHeart as Heart,
  FaMicrophone as Mic,
  FaMicrophoneSlash as MicOff,
  FaVideoSlash as VideoOff,
  FaDesktop as MonitorUp,
  FaEllipsisVertical as MoreVertical,
  FaPhoneSlash as PhoneOff,
  FaVolumeHigh as Volume2,
  FaBars as Menu,
  FaXmark as X,
  FaPlay as Play,
  FaMessage as MessageSquareText,
} from "react-icons/fa6";
import Link from "next/link";
import { useState } from "react";

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

const features = [
  {
    title: "Real-time Meeting",
    description: "Connect with anyone, anywhere in Bangladesh.",
    icon: Video,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    title: "BdSL Sign to Text",
    description: "Get sign language transcription instantly.",
    icon: Hand,
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    title: "Live Captions",
    description: "Never miss a word during your meetings.",
    icon: Captions,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    title: "Secure & Private",
    description: "Your meetings, your control.",
    icon: ShieldCheck,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    ["Home", "#home"],
    ["About", "#about"],
    ["Features", "#features"],
    ["How It Works", "#how-it-works"],
    ["FAQ", "#faq"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Hand size={25} strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Let’s Talk
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-500">
              Meet · Communicate · Include
            </p>
          </div>
        </a>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map(([label, href], index) => (
            <a
              key={label}
              href={href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                index === 0
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <a
            href="/auth"
            className="rounded-xl border border-blue-500 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-blue-50"
          >
            Sign In
          </a>

          <a
            href="/auth?mode=register"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
          >
            Sign Up
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-xl bg-blue-50 p-2 text-blue-600 lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600"
              >
                {label}
              </a>
            ))}

            <div className="mt-3 flex gap-3">
              <a
                href="/auth"
                className="flex-1 rounded-xl border border-blue-500 py-3 text-center font-bold text-blue-600"
              >
                Sign In
              </a>
              <a
                href="/auth?mode=register"
                className="flex-1 rounded-xl bg-blue-600 py-3 text-center font-bold text-white"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function VideoMeetingPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      {/* Background decoration */}
      <div className="absolute -inset-10 -z-10 rounded-[45%] bg-gradient-to-br from-blue-100 via-indigo-50 to-sky-100 blur-2xl" />

      {/* Video window */}
      <div className="overflow-hidden rounded-[24px] border border-slate-300/60 bg-[#202630] p-2 shadow-2xl shadow-blue-900/20 sm:p-3">
        {/* Window header */}
        <div className="flex h-8 items-center gap-2 px-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-auto text-xs text-slate-400">
            Let's Talk Meeting
          </span>
        </div>

        {/* Video participants */}
        <div className="grid grid-cols-[1fr_105px] gap-2 sm:grid-cols-[1fr_125px]">
          {/* Main participant */}
          <div className="relative min-h-[230px] overflow-hidden rounded-xl bg-slate-700 sm:min-h-[310px]">
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000"
              alt="Meeting participant"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-xs font-medium text-white backdrop-blur">
              <Hand size={15} />
              Rahim Hasan
            </div>

            <div className="absolute right-3 top-3 rounded-lg bg-blue-600/90 px-3 py-1.5 text-xs font-bold text-white">
              BdSL Active
            </div>
          </div>

          {/* Other participants */}
          <div className="flex flex-col gap-2">
            {participants.map((person) => (
              <div
                key={person.name}
                className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-slate-600"
              >
                <img
                  src={person.image}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-1 text-center text-[10px] font-medium text-white sm:text-xs">
                  {person.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting controls */}
        <div className="flex items-center justify-center gap-3 py-4 sm:gap-5 sm:py-5">
          <button
            aria-label="Microphone"
            className="rounded-full bg-slate-600 p-3 text-white transition hover:bg-slate-500"
          >
            <Mic size={19} />
          </button>

          <button
            aria-label="Camera"
            className="rounded-full bg-slate-600 p-3 text-white transition hover:bg-slate-500"
          >
            <Video size={19} />
          </button>

          <button
            aria-label="Share screen"
            className="rounded-full bg-slate-600 p-3 text-white transition hover:bg-slate-500"
          >
            <MonitorUp size={19} />
          </button>

          <button
            aria-label="More options"
            className="rounded-full bg-slate-600 p-3 text-white transition hover:bg-slate-500"
          >
            <MoreVertical size={19} />
          </button>

          <button
            aria-label="Leave meeting"
            className="rounded-full bg-red-500 p-3 text-white transition hover:bg-red-600"
          >
            <PhoneOff size={19} />
          </button>
        </div>
      </div>

      {/* BdSL to text floating card */}
      <div className="absolute -right-3 top-12 z-10 w-[175px] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-900/10 sm:-right-12 sm:w-[215px]">
        <div className="flex items-center gap-2 bg-blue-600 px-3 py-3 text-sm font-bold text-white">
          <Hand size={17} />
          BdSL → Text
        </div>
        <div className="p-4">
          <p className="text-lg font-bold leading-relaxed text-slate-800 sm:text-2xl">
            সবাইকে
            <br />
            স্বাগতম!
          </p>
          <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
            Live transcription
          </span>
        </div>
      </div>

      {/* Voice to text floating card */}
      <div className="absolute -right-2 bottom-16 z-10 w-[170px] rounded-2xl border border-blue-100 bg-white p-3 shadow-xl shadow-blue-900/10 sm:-right-10 sm:w-[210px]">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-600">
          <Volume2 size={17} />
          Voice → Text
        </div>
        <p className="text-sm font-semibold text-slate-700 sm:text-base">
          সবাইকে স্বাগতম।
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[#fcfcff] px-5 pb-20 pt-16 sm:px-8 lg:px-12 lg:pb-28 lg:pt-20"
    >
      {/* Decorative shapes */}
      <div className="absolute -right-32 top-10 h-[500px] w-[650px] rounded-full bg-blue-100/60 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left content */}
        <div className="relative z-20">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700 sm:text-sm">
            <Heart size={17} fill="currentColor" />
            Accessible Meeting for a More Inclusive Bangladesh
          </div>

          <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.16] tracking-tight text-slate-900 sm:text-5xl lg:text-[58px]">
            Break the Communication Barrier{" "}
            <span className="relative inline-block text-blue-600">
              Together
              <span className="absolute -bottom-2 left-0 h-1.5 w-full -rotate-2 rounded-full bg-orange-400" />
            </span>
          </h2>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            Join secure online meetings with real-time Bangla Sign Language to
            Text and captions. Communication should be accessible to everyone.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/meeting/create"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-700"
            >
              <Video size={21} />
              Start a Meeting
              <ArrowRight size={19} />
            </Link>

            <Link
              href="/meeting/join"
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-blue-400 bg-white px-7 py-4 font-bold text-slate-800 transition hover:-translate-y-1 hover:bg-blue-50"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-blue-100 text-xs font-bold text-blue-700">
                +
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Building a more inclusive community
            </p>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative z-10 px-2 py-12 sm:px-8 lg:px-0">
          <VideoMeetingPreview />
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[1440px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className={`group rounded-[25px] ${feature.bg} p-7 transition duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/60`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ${feature.color} shadow-sm`}
                >
                  <Icon size={30} strokeWidth={2.2} />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="bg-[#f8faff] px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <span className="font-bold uppercase tracking-widest text-blue-600">
            Why Let's Talk?
          </span>

          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            Communication is a right, not a privilege.
          </h2>

          <p className="mt-5 leading-8 text-slate-600">
            We believe everyone deserves to participate in online communication
            without barriers. Let's Talk brings people together through
            accessible video meetings, Bangla Sign Language transcription, and
            real-time captions.
          </p>

          <a
            href="#how-it-works"
            className="mt-7 inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700"
          >
            Discover how it works <ArrowRight size={18} />
          </a>
        </div>

        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white shadow-xl shadow-blue-200 sm:p-12">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border-[30px] border-white/10" />
          <Hand size={55} className="mb-7" />
          <h3 className="relative text-3xl font-extrabold">
            Technology for everyone.
          </h3>
          <p className="relative mt-4 leading-7 text-blue-100">
            Connecting people, empowering communication, and creating a more
            accessible digital Bangladesh.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Heart size={20} fill="currentColor" />
            <span className="font-semibold">Meet · Communicate · Include</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Create or Join",
      description:
        "Start a new meeting or enter a meeting ID to join your team.",
      icon: Video,
    },
    {
      number: "02",
      title: "Communicate",
      description:
        "Connect through live video, audio, and accessible communication.",
      icon: Users,
    },
    {
      number: "03",
      title: "Understand",
      description:
        "View Bangla Sign Language transcription and live text captions.",
      icon: MessageSquareText,
    },
  ];

  return (
    <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="font-bold uppercase tracking-widest text-blue-600">
            Simple process
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 leading-7 text-slate-500">
            Getting started with accessible online meetings is easy.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="rounded-3xl border border-slate-100 bg-slate-50 p-8 transition hover:-translate-y-2 hover:border-blue-100 hover:bg-blue-50/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <Icon size={28} />
                  </div>
                  <span className="text-4xl font-extrabold text-blue-100">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-7 text-xl font-extrabold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const questions = [
    {
      question: "What is Let's Talk?",
      answer:
        "Let's Talk is an accessible online meeting platform designed to support video communication, Bangla Sign Language to Text, and live captions.",
    },
    {
      question: "Can I join a meeting without creating one?",
      answer: "Yes. You can join an existing meeting using its meeting ID.",
    },
    {
      question: "Does it support Bangla Sign Language?",
      answer:
        "The platform is designed to recognize supported Bangla Sign Language signs and display corresponding Bangla text.",
    },
    {
      question: "Is my meeting secure?",
      answer:
        "Meetings use authenticated access and controlled meeting participation. The platform is designed with privacy and security in mind.",
    },
  ];

  const [active, setActive] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-[#f8faff] px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <span className="font-bold uppercase tracking-widest text-blue-600">
            Have questions?
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {questions.map((item, index) => (
            <div
              key={item.question}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <button
                onClick={() => setActive(active === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-slate-800"
                aria-expanded={active === index}
              >
                {item.question}
                <span className="text-xl text-blue-600">
                  {active === index ? "−" : "+"}
                </span>
              </button>

              {active === index && (
                <p className="border-t border-slate-100 px-5 py-5 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 px-5 py-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-center justify-between gap-8 border-b border-slate-800 pb-10 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
              <Hand size={25} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold">Let's Talk</h3>
              <p className="text-xs text-slate-400">
                Meet · Communicate · Include
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <a href="#about" className="hover:text-white">
              About
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How It Works
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </div>
        </div>

        <div className="pt-8 text-center">
          <p className="font-medium italic text-slate-300">
            Technology for an Inclusive Tomorrow.
          </p>
          <p className="mt-5 text-xs text-slate-500">
            © {new Date().getFullYear()} Let's Talk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white font-sans">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <HowItWorksSection />
      <FAQSection />
      <Footer />
    </main>
  );
}
