import type { Metadata } from "next";
import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { Poppins } from "next/font/google";
import Provider from "../@libs/context/Provider";
import "./globals.css";
import LandingHeaderUpdated from "../@base/layouts/LandingHeaderUpdated";
import { createSupabaseServerClient } from "../@modules/auth/libs/supabase/server-client";
import AuthInitializer from "../@modules/auth/components/AuthInitializer";

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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="bg-[#060B17] text-white designed_scrollbar ">
        <Provider nextFont={[poppinsFont]}>
          <AuthInitializer user={data.user} />
          <LandingHeaderUpdated />
          <main>{children}</main>
        </Provider>
      </body>
    </html>
  );
}
