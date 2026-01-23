import type { Metadata } from "next";
import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { Poppins } from "next/font/google";
import Provider from "../@libs/context/Provider";
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
export default function RootLayout({
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
        <Provider nextFont={[poppinsFont]}>{children}</Provider>
      </body>
    </html>
  );
}
