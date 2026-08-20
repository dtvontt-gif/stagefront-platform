import Image from "next/image";
import Link from "next/link";
import { authenticatedUser } from "@/lib/stagefront-auth";
import { staffAccess } from "@/lib/stagefront-auth";
import MobileNavigation from "@/components/MobileNavigation";

const navigation = [
  { label: "Live", href: "/live" },
  { label: "Queue", href: "/queue" },
  { label: "AI Video Studio", href: "/create/video" },
  { label: "Discover", href: "/#discover" },
  { label: "Hosts", href: "/hosts" },
  { label: "Golden Voices", href: "/golden-voices" },
  { label: "Winners", href: "/winners" },
  { label: "Original Artists", href: "/originals" },
  { label: "Members", href: "/members" },
  { label: "Connections", href: "/connections" },
  { label: "Community", href: "/community" },
  { label: "Founders", href: "/founders" },
  { label: "Support", href: "/#support" },
  { label: "My Profile", href: "/profile" },
  { label: "About", href: "/#about" },
];

const desktopNavigation = navigation.filter((item) =>
  ["Live", "Queue", "AI Video Studio", "Hosts", "Golden Voices", "Original Artists", "Community"].includes(item.label),
);

export default async function Navbar() {
  const [user, staff] = await Promise.all([authenticatedUser(), staffAccess()]);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070708]/80 backdrop-blur-xl">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8"
      >
        <Link
          href="/#top"
          aria-label="StageFront home"
          className="group relative h-14 w-44 shrink-0 sm:w-52"
        >
          <Image
            src="/images/logos/stagefront-logo-gold.png"
            alt="StageFront"
            fill
            sizes="(max-width: 640px) 176px, 208px"
            className="object-contain transition duration-300 group-hover:brightness-110"
            priority
          />
        </Link>

        <div className="hidden items-center gap-4 lg:flex">
          {desktopNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-semibold text-white/70 transition hover:text-[#f4b400] focus-visible:text-[#f4b400] xl:text-sm"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/backstage"
            className="rounded-full border border-[#f4b400]/45 bg-[#f4b400]/[0.06] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#f4b400] transition hover:border-[#f4b400] hover:bg-[#f4b400]/[0.12]"
          >
            Backstage Pass
          </a>
          {user ? (
            <>
              <a href="/profile" className="hidden text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex">My profile</a>
              <form action="/api/auth/sign-out" method="post" className="hidden sm:block">
                <button className="text-sm font-semibold text-white/55 transition hover:text-white">Sign out</button>
              </form>
            </>
          ) : (
            <a href="/sign-in" className="hidden text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex">Sign in</a>
          )}
          <a
            href="/join"
            className="rounded-full bg-[#f4b400] px-4 py-2.5 text-xs font-extrabold text-[#0b0b0f] shadow-[0_0_28px_rgba(244,180,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#ffd05a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4b400] sm:px-5 sm:text-sm"
          >
            Founding Member
          </a>
        </div>
        <MobileNavigation links={navigation} signedIn={Boolean(user)} staff={Boolean(staff)} />
      </nav>
    </header>
  );
}
