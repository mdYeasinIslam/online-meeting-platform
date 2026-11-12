import type { Metadata } from "next";
import type { ReactNode } from "react";
import LandingHeaderUpdated from "../@base/layouts/LandingHeaderUpdated";
import Provider from "../@libs/context/Provider";
import "./globals.css";
import Footer from "../@base/layouts/Footer";
export const metadata: Metadata = {
  title: "MeetHub",
  description: "Accessible Bangla meeting thesis",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#1B2431] text-white">
        <Provider>
          <LandingHeaderUpdated />
          <main>{children}</main>
          <Footer/>
        </Provider>
      </body>
    </html>
  );
}
