"use client";
import { createCache, StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider, theme } from "antd";
import { useMemo, type PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/src/@modules/auth/context/AuthProvider";
export default function Provider({ children }: PropsWithChildren) {
  const cache = useMemo(() => createCache(), []);
  return <AuthProvider><ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}><StyleProvider cache={cache} layer>{children}</StyleProvider><Toaster /></ConfigProvider></AuthProvider>;
}
