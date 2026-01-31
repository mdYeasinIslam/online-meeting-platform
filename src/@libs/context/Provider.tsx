"use client";
import { createCache, StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider, theme } from "antd";
import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
const PathGuard = dynamic(() => import("./PathGuard"), {
  ssr: false,
});
type TProps = PropsWithChildren<{
  nextFont: (NextFontWithVariable & { originalVariableName: string })[];
}>;

const Provider: React.FC<TProps> = ({ nextFont, children }) => {
  // const cache = useMemo(() => createCache(), []);
  // useServerInsertedHTML(() => (
  //   <style
  //     id="antd"
  //     dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
  //   />
  // ));
  return (
    <PathGuard>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
        }}
      >
        <StyleProvider cache={createCache()} layer>{children}</StyleProvider>
        <Toaster />
      </ConfigProvider>
    </PathGuard>
  );
};

export default Provider;
