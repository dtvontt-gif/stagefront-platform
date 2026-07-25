import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Discover", href: "/#discover" },
  { label: "Golden Voices", href: "/#golden-voices" },
  { label: "Original Artists", href: "/#original-artists" },
  { label: "Founding Members", href: "/join" },
  { label: "Community", href: "/#community" },
  { label: "About", href: "/#about" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050506] px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link
              href="/#top"
              aria-label="StageFront home"
              className="relative block h-20 w-64"
            >
              <Image
                src="/images/logos/stagefront-logo-gold.png"
                alt="StageFront"
                fill
                sizes="256px"
                className="object-contain object-left"
              />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/50">
              Live performance, original music, talent discovery, and community
              under one spotlight.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex max-w-xl flex-wrap gap-x-7 gap-y-4">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 transition hover:text-[#f4b400]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 pt-8 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} StageFront. All rights reserved.</p>
          <p className="uppercase tracking-[0.22em]">Discover. Elevate. Perform.</p>
        </div>
      </div>
    </footer>
  );
}
