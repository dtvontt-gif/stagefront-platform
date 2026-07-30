import Link from "next/link";

const archives = [
  {
    eyebrow: "Hall of champions",
    title: "Contest Winners",
    copy: "Meet the Box Battle and Golden Voices champions, hear their stories, and watch featured performances.",
    href: "/winners",
    action: "Explore the winners",
    symbol: "★",
  },
  {
    eyebrow: "Permanent recognition",
    title: "Wall of Founders",
    copy: "Discover the first members who believed in StageFront and visit their individual community profiles.",
    href: "/founders",
    action: "Visit the founder wall",
    symbol: "SF",
  },
];

export default function CommunityArchives() {
  return (
    <section aria-labelledby="community-archives-heading" className="bg-[#070708] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-kicker">StageFront recognition</p>
          <h2 id="community-archives-heading" className="section-title">
            Celebrate the people
            <span className="text-stage-gold"> building the story.</span>
          </h2>
          <p className="section-lede mx-auto">
            Our champions and founding community now have dedicated spaces,
            keeping the homepage focused while every story remains easy to find.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {archives.map((archive) => (
            <Link key={archive.href} href={archive.href} className="archive-card group">
              <span className="archive-symbol" aria-hidden="true">{archive.symbol}</span>
              <div>
                <p className="section-kicker">{archive.eyebrow}</p>
                <h3>{archive.title}</h3>
                <p>{archive.copy}</p>
                <span className="archive-action">{archive.action} <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

