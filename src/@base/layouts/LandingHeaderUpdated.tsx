"use client";

import useGlobalState from "@/src/@libs/hooks/useGlobalState";
import useResize from "@/src/@libs/hooks/useResize";
import useWindowSize from "@/src/@libs/hooks/useWindowSize";
import { cn } from "@/src/@libs/utils/cn";
import { Paths } from "@/src/@libs/utils/paths";
import { getSupabaseBrowserClient } from "@/src/@modules/auth/libs/supabase/browser-client";
import { createSupabaseServerClient } from "@/src/@modules/auth/libs/supabase/server-client";
import { User } from "@supabase/supabase-js";
import { Button, Menu } from "antd";

import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BiX } from "react-icons/bi";
import { FaHome } from "react-icons/fa";
import { IoMdMenu } from "react-icons/io";

const redirectPath = [
  {
    url: "https://wage-employer.vercel.app/auth",
    panelType: "employer",
    panel: "employers",
    type: "login",
  },
  {
    url: "https://wage-employer.vercel.app/auth",
    panelType: "employer",
    panel: "employers",
    type: "sign-up",
  },
  {
    url: "https://wage-provider.vercel.app/auth",
    panelType: "provider",
    panel: "providers",
    type: "login",
  },
  {
    url: "https://wage-provider.vercel.app/auth",
    panelType: "provider",
    panel: "providers",
    type: "sign-up",
  },
];
const navItems = [
  {
    id: 1,
    label: "Home",
    href: Paths.root,
    icon: FaHome,
  },
];

export default function LandingHeaderUpdated() {
  const { elemRef: logoHeightRef, height: logoHeight } =
    useResize<HTMLDivElement>();
  const { elemRef: ctaHeightRef, height: ctaHeight } =
    useResize<HTMLDivElement>();
  const { elemRef: navItemHeightRef, height: navItemHeight } =
    useResize<HTMLDivElement>();
  const { height } = useWindowSize();
  const pathName = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ref = useRef(null);
  const [isSolid, setIsSolid] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [user] = useGlobalState<User | null>({
    key: "auth-user",
    initialValue: null,
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY && currentScrollY === 0) {
        setIsSolid(false);
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling UP - show navbar
        setIsSolid(true);
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, pathName]);
  // const handleClickOutsideFn = () => {
  //   setMobileMenuOpen(false);
  // };
  const handleRedirectFn = async (value: string) => {
    if (value === "signOut") {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      redirect("/auth");
    }
    redirect("/auth");
  };
  // useClickOutside(ref, handleClickOutsideFn);
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
  }, [isMobileMenuOpen]);
  if(pathName ==='/auth') return null
  return (
    <div>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 brightness-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <header className={cn("w-full rounded-full md:rounded-[20px]")}>
        <div
          className={cn(
            "w-full fixed top-0 left-0 right-0 transition-all  duration-500 z-50",
            isSolid ? "bg-white linear-gradient" : "bg-[#032416] ",
            isVisible ? "translate-y-0" : "-translate-y-full",
            {
              "bg-white/50 backdrop-blur-3xl": isMobileMenuOpen && isSolid,
            },
          )}
        >
          <div
            className={cn(
              "container h-13 lg:h-16 flex justify-between items-center shrink-0]",
            )}
          >
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href={Paths.root}>logo</Link>
              {/* Desktop Navigation */}
              <nav className="hidden w-full md:flex justify-center md:space-x-5 lg:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex flex-col hover:underline  text-[#101828] font-semibold",
                      {
                        "text-(--color-primary-500) underline font-bold":
                          pathName === item.href,
                      },
                    )}
                  >
                    {/* <span className="text-xs text-[#667085] font-normal">For</span> */}
                    <span className="text-sm lg:text-base">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Desktop Auth Buttons */}

            {/* <div className="hidden md:flex items-center gap-4">
              <>
                <Button
                  onClick={handleRedirectFn}
                  size="small"
                  variant="outlined"
                  className="text-gray-700 text-sm xl:text-base font-semibold border hover:border-(--color-primary-500) hover:text-(--color-primary-900) cursor-pointer px-5 lg:px-8  xl:py-6"
                >
                  Sign In
                </Button>
                <Button
                  size="small"
                  onClick={handleRedirectFn}
                  className="bg-white hover:bg-(--color-primary-900) text-sm xl:text-base font-semibold text-[#101828] hover:text-white cursor-pointer  px-5 lg:px-8  xl:py-6"
                >
                  Sign Up
                </Button>
              </>
            </div> */}
            <div className="hidden md:flex justify-center lg:max-lg:w-full items-center gap-1 ">
              {!user?.email ? (
                ["signIn", "signUp"].map((tab) => (
                  <Button
                    key={tab}
                    onClick={() => handleRedirectFn("")}
                    className={cn(
                      "lg:max-lg:w-full px-6 py-1 rounded-lg! border-none!  capitalize duration-300 ease-linear   font-semibold! bg-transparent!  ",
                      {
                        "bg-[#15573C]! hover:text-white!": tab === "signIn",
                        "hover:bg-[#15573C]! hover:text-white!":
                          tab === "signUp",
                      },
                      {
                        "text-[#15573C]! ": isSolid && tab !== "signIn",
                      },
                    )}
                  >
                    {tab}
                  </Button>
                ))
              ) : (
                <>
                  <Button
                    onClick={() => handleRedirectFn("signOut")}
                    className={cn(
                      "lg:max-lg:w-full px-6 py-1 rounded-lg! border-none!  capitalize duration-300 ease-linear   font-semibold!  bg-[#15573C]! hover:text-white! ",
                    )}
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-white! "
              >
                {isMobileMenuOpen ? (
                  <BiX color="white" className="h-6 w-6 text-white" />
                ) : (
                  <IoMdMenu className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        <div
          ref={ref}
          className={cn(
            "hidden_scrollbar md:hidden w-50 fixed top-0  bg-[#15573C] duration-300 ease-linear overflow-y-auto  rounded-tl-4xl rounded-bl-4xl px-4 py-6 z-50",
            isMobileMenuOpen ? "right-0 " : "-right-96",
          )}
          style={{
            height: `min(${height >= 490 ? `${logoHeight + ctaHeight + navItemHeight + 100}px` : "90%"} , 100%)`,
          }}
        >
          {/* <div className="px-4 py-6 space-y-4  "> */}
          <div
            ref={logoHeightRef}
            className="flex items-center justify-center border-b pb-5 mb-6"
          >
            <Link href={Paths.root}>logo</Link>
          </div>
          <nav
            ref={navItemHeightRef}
            className="hidden_scrollbar space-y-1 overflow-y-auto "
          >
            <div ref={navItemHeightRef}>
              {navItems?.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-end gap-3 text-white font-medium text-right py-2",
                    {
                      " font-bold ": pathName === item.href,
                    },
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-sm"> {item.label}</span>
                  <span>
                    {item.icon && <item.icon className="-mt-0.5 w-6 h-6" />}
                  </span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Auth Buttons */}
          <div
            ref={ctaHeightRef}
            className="pt-5 border-t border-white space-y-3"
          >
            <>
              <Button
                onClick={() => handleRedirectFn("")}
                variant="outlined"
                className="w-full bg-[#012415]! hover:text-white! cursor-pointer"
              >
                Sign In
              </Button>
              <Button
                onClick={() => handleRedirectFn("")}
                className="w-full border-2! bg-transparent! border-[#15573C]! hover:text-white! cursor-pointer"
              >
                Sign Up
              </Button>
            </>
          </div>
        </div>
      </header>
    </div>
  );
}
