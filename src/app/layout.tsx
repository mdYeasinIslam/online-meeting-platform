import type { Metadata } from "next";
import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { Poppins } from "next/font/google";
import LandingHeaderUpdated from "../@base/layouts/LandingHeaderUpdated";
import Provider from "../@libs/context/Provider";
import AuthInitializer from "../@modules/auth/components/AuthInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lets-Talk",
  description: "Online meeting platform",
};
const poppins = Poppins({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
});
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontWithMorePropsCreateFn = (
    fontDefinition: NextFontWithVariable,
    originalVariableName: string,
  ) => {
    return { ...fontDefinition, originalVariableName };
  };

  const poppinsFont = fontWithMorePropsCreateFn(poppins, "--font-poppins");
  return (
    <html lang="en">
      <body className="bg-[#060B17] text-white designed_scrollbar ">
        <Provider nextFont={[poppinsFont]}>
          <AuthInitializer  />
          <LandingHeaderUpdated />
          <main>{children}</main>
        </Provider>
      </body>
    </html>
  );
}
