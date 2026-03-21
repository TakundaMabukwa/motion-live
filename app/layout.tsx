import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
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
        <Script id="cleanup-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations()
                .then((registrations) => {
                  registrations.forEach((registration) => {
                    registration.unregister();
                  });
                })
                .catch((error) => {
                  console.log('SW cleanup failed:', error);
                });

              if (window.caches) {
                caches.keys()
                  .then((keys) => Promise.all(
                    keys
                      .filter((key) => key.startsWith('solflo-'))
                      .map((key) => caches.delete(key))
                  ))
                  .catch((error) => {
                    console.log('Cache cleanup failed:', error);
                  });
              }
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
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
