import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StageFront | Home of Zoo Crew Vibe",
  description:
    "StageFront is the independent home of Zoo Crew Vibe across TikTok, GoLive Streamers, and Echo Live—plus music, creators, and community.",
  manifest: "/manifest.webmanifest",
  applicationName: "Zoo Crew Vibe",
  appleWebApp: {
    capable: true,
    title: "Zoo Crew Vibe",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/images/favicons/favicon.ico" },
      {
        url: "/images/favicons/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/images/favicons/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    apple: "/images/zoo-crew/zoo-crew-vibe-house-gate.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#070708] antialiased">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
