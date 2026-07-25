import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StageFront | Every Artist Deserves a Stage",
  description:
    "StageFront connects artists, fans, producers, and hosts through live performance, discovery, and community.",
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
    apple: "/images/favicons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#070708] antialiased">
      <body>{children}</body>
    </html>
  );
}
