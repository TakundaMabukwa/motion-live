"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const toasterStyle: CSSProperties = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
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
          error:
            "!bg-red-600 !text-white !border-red-700",
          title: "!text-white",
          description: "!text-white/90",
          closeButton:
            "!bg-red-700 !border-red-500 !text-white hover:!bg-red-800",
        },
      }}
      {...props}
    />
  );
}
