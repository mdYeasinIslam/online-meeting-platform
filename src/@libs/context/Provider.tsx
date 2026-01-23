import { NextFontWithVariable } from "next/dist/compiled/@next/font";
import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

const PathGuard = dynamic(() => import("./PathGuard"), {
  ssr: false,
});
type TProps = PropsWithChildren<{
  nextFont: (NextFontWithVariable & { originalVariableName: string })[];
}>;

const Provider: React.FC<TProps> = ({ nextFont,children }) => {
  return <PathGuard>{children}</PathGuard>;
};

export default Provider;
