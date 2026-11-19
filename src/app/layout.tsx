import type { Metadata } from "next";
import type { ReactNode } from "react";
import LandingHeaderUpdated from "../@base/layouts/LandingHeaderUpdated";
import Provider from "../@libs/context/Provider";
import toast, { Toaster } from "react-hot-toast";

import "./globals.css";
export const metadata: Metadata = {
  title: "Let's Talk",
  description: "Accessible Bangla meeting thesis",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#1B2431] text-white">
        <Provider>
          <LandingHeaderUpdated />
          <main>{children}</main>
        </Provider>
        <Toaster />
      </body>
    </html>
  );
}
