"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const toasterStyle: CSSProperties = {
  "--normal-bg": "#ffffff",
  "--normal-text": "#111111",
  "--normal-border": "#e5e7eb",
} as CSSProperties;

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={toasterStyle}
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-white !text-black !border !border-gray-200 !shadow-lg",
          error:
            "!bg-white !text-black !border !border-gray-200",
          success:
            "!bg-white !text-black !border !border-gray-200",
          warning:
            "!bg-white !text-black !border !border-gray-200",
          info:
            "!bg-white !text-black !border !border-gray-200",
          title: "!text-black",
          description: "!text-black/80",
          closeButton:
            "!bg-white !border !border-gray-200 !text-black hover:!bg-gray-50",
        },
      }}
      {...props}
    />
  );
}
