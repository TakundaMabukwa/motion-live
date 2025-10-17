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
  title: "Solflo",
  description: "Vehicle tracking and job management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Solflo"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af"
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
        <link rel="icon" href="/soltrack-vehicle-tracking-logo-transparent.png" />
        <Script
          src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
          strategy="beforeInteractive"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
              navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                  console.log('SW registered:', registration.scope);
                })
                .catch((error) => {
                  console.log('SW registration failed:', error);
                });
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
