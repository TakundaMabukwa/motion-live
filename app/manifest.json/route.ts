import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Solflo",
    short_name: "Solflo",
    description: "Vehicle tracking and job management system",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e40af",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/soltrack-vehicle-tracking-logo-transparent.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/soltrack-vehicle-tracking-logo-transparent.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}