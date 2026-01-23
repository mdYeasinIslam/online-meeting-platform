"use client";
import { ConfigProvider, theme } from "antd";
import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

const PathGuard = dynamic(() => import("./PathGuard"), {
  ssr: false,
});
type TProps = PropsWithChildren<{
  nextFont: (NextFontWithVariable & { originalVariableName: string })[];
}>;

const Provider: React.FC<TProps> = ({ nextFont, children }) => {
  return (
    <PathGuard>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,

          token: {
            // Seed Token
            // colorPrimary: "#ffffff",
            // borderRadius: 2,

            // Alias Token
            // colorBgContainer: "#f6ffed",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </PathGuard>
  );
};

export default Provider;
