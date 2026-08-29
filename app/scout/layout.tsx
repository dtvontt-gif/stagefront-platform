import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Live Scout | StageFront",
  description: "Private StageFront host live-status control.",
  manifest: "/scout/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "SF Live Scout",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#070708",
  viewportFit: "cover",
};

export default function ScoutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
