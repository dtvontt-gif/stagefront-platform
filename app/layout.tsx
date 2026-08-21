import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StageFront Karaoke Engine v2",
  description: "StageFront's isolated next-generation karaoke engine.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
