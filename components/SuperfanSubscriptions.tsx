import SuperfanButton from "@/components/SuperfanButton";
import { donPayPalSubscription } from "@/lib/paypal-public";
import { authenticatedUser } from "@/lib/stagefront-auth";

const creators = [
  { id: "don" as const, name: "Don The Vibe", animal: "Albino Python", copy: "Become one of Don's official Zoo Crew Superfans and support the vision directly." },
  { id: "unk" as const, name: "Unk", animal: "Lion", copy: "Become one of Unk's official Zoo Crew Superfans and support the family directly." },
];

export default async function SuperfanSubscriptions() {
  const user = await authenticatedUser();
  return <section id="superfans" aria-labelledby="superfans-heading" className="relative scroll-mt-20 overflow-hidden border-y border-[#f4b400]/20 bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,180,0,0.16),transparent_48%)]" />
    <div className="relative mx-auto max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <p className="section-kicker">Official Zoo Crew membership</p>
        <h2 id="superfans-heading" className="section-title mx-auto">Choose who you <span className="text-stage-gold">support.</span></h2>
        <p className="section-lede mx-auto">One $9.99 monthly membership makes you a Zoo Crew Superfan on StageFront. Your support is recognized by the family across TikTok, GLS, and Echo Live.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {creators.map((creator) => <article key={creator.id} className="rounded-[2rem] border border-[#f4b400]/25 bg-[linear-gradient(145deg,rgba(244,180,0,0.09),rgba(255,255,255,0.025))] p-7 shadow-2xl sm:p-9">
          <div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[#f4b400] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">Superfan</span><span className="text-sm font-bold text-white/45">{creator.animal}</span></div>
          <h3 className="mt-8 font-display text-4xl font-black uppercase">Support <span className="text-stage-gold">{creator.name}</span></h3>
          <p className="mt-5 leading-7 text-white/62">{creator.copy}</p>
          <ul className="mt-7 grid gap-3 text-sm text-white/72">
            <li>✓ Official StageFront Superfan badge</li><li>✓ Recognition across Zoo Crew platforms</li><li>✓ Direct monthly support to your chosen creator</li><li>✓ Cancel through PayPal at any time</li>
          </ul>
          <SuperfanButton
            creator={creator.id}
            signedIn={Boolean(user)}
            userId={user?.id}
            clientId={creator.id === "don" ? donPayPalSubscription.clientId : undefined}
            planId={creator.id === "don" ? donPayPalSubscription.planId : undefined}
          />
        </article>)}
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-white/38">Membership benefits are managed by Zoo Crew Vibe through StageFront. TikTok, GLS, and Echo Live do not issue or control this badge. PayPal processing fees apply.</p>
    </div>
  </section>;
}
