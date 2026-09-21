import type { Metadata } from "next";
import type { ReactNode } from "react";
import LandingHeaderUpdated from "../@base/layouts/LandingHeaderUpdated";
import Provider from "../@libs/context/Provider";
import "./globals.css";
export const metadata: Metadata = {
  title: "MeetHub",
  description: "Accessible Bangla meeting thesis",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#060B17] text-white">
        <Provider>
          <LandingHeaderUpdated />
          <main>{children}</main>
        </Provider>
      </body>
    </html>
  );
}
