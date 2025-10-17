import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import Script from "next/script";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Soltrack Motion Live",
  description: "Vehicle tracking and job management system by Soltrack",
  manifest: "/manifest.json",
  themeColor: "#1e40af",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Soltrack"
  }
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
          strategy="beforeInteractive"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(() => console.log('SW registration failed'));
            }
          `}
        </Script>
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
