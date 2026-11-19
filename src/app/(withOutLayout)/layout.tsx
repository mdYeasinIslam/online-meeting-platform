import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import Footer from "@/src/@base/layouts/Footer";
export const metadata: Metadata = {
  title: "Let's Talk",
  description: "Accessible Bangla meeting thesis",
};
export default function SecondaryLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      {children}
      <Footer />
    </main>
  );
}
