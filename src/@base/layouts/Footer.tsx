import Image from "next/image";
import Link from "next/link";
import { FaHand as Hand } from "react-icons/fa6";
const Footer = () => {
  return (
    <footer className="bg-slate-950 px-5 py-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-center justify-between gap-8 border-b border-slate-800 pb-10 md:flex-row">
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
              <p className="text-sm text-slate-400">
                Meet - Communicate - Include
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <a href="/about" className="hover:text-white">
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
};

export default Footer;
