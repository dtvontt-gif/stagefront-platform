"use client";

import Image from "next/image";

export type ZooGiftId = "paw" | "anaconda" | "lion" | "sha_monkey";

export type ActiveZooGift = {
  id: ZooGiftId;
  eventId: string;
  senderName: string;
};

export const zooGiftCatalog: Record<ZooGiftId, { name: string; icon: string; futurePrice: string; duration: number }> = {
  paw: { name: "Zoo Paw", icon: "🐾", futurePrice: "$0.10", duration: 2200 },
  anaconda: { name: "Anaconda Heart", icon: "🐍", futurePrice: "$3.00", duration: 4800 },
  lion: { name: "King’s Roar", icon: "🦁", futurePrice: "$10.00", duration: 5200 },
  sha_monkey: { name: "Sha & Her Monkey", icon: "🐒", futurePrice: "$25.00", duration: 7200 },
};

function GiftCaption({ gift }: { gift: ActiveZooGift }) {
  const details = zooGiftCatalog[gift.id];
  return (
    <div className="zoo-gift-caption">
      <span>{details.icon}</span>
      <div>
        <strong>{gift.senderName}</strong>
        <p>sent {details.name}</p>
      </div>
    </div>
  );
}

function PawAnimation() {
  const paws = [
    { left: "9%", top: "66%", delay: "0ms", rotate: "-28deg", size: "3.2rem" },
    { left: "23%", top: "46%", delay: "120ms", rotate: "20deg", size: "4.2rem" },
    { left: "40%", top: "62%", delay: "240ms", rotate: "-12deg", size: "3.5rem" },
    { left: "54%", top: "33%", delay: "360ms", rotate: "24deg", size: "5.4rem" },
    { left: "70%", top: "53%", delay: "480ms", rotate: "-20deg", size: "4rem" },
    { left: "83%", top: "25%", delay: "600ms", rotate: "18deg", size: "3.4rem" },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="zoo-paw-burst" />
      {paws.map((paw, index) => (
        <span
          key={index}
          className="zoo-gift-paw"
          style={{ left: paw.left, top: paw.top, animationDelay: paw.delay, rotate: paw.rotate, fontSize: paw.size }}
        >
          🐾
        </span>
      ))}
    </div>
  );
}

function AnacondaAnimation() {
  return (
    <div className="zoo-anaconda-wrap">
      <div className="zoo-anaconda-glow" />
      <div className="zoo-anaconda-orbit zoo-anaconda-orbit-one" />
      <div className="zoo-anaconda-orbit zoo-anaconda-orbit-two" />
      <Image className="zoo-anaconda-art" src="/images/zoo-crew/gifts/anaconda-heart-v2.webp" width={1024} height={1024} priority alt="Albino anaconda curling into a heart" />
      <div className="zoo-anaconda-sheen" />
      <div className="zoo-anaconda-heart">♥</div>
    </div>
  );
}

function LionAnimation() {
  return (
    <div className="zoo-lion-wrap">
      <div className="zoo-lion-smoke" />
      <div className="zoo-roar-ring zoo-roar-ring-one" />
      <div className="zoo-roar-ring zoo-roar-ring-two" />
      <div className="zoo-roar-ring zoo-roar-ring-three" />
      <div className="zoo-lion-rays" />
      <Image className="zoo-lion-art" src="/images/zoo-crew/gifts/kings-roar-v2.webp" width={1024} height={1024} priority alt="Cinematic roaring lion" />
      <div className="zoo-roar-word">ROAR!</div>
      {Array.from({ length: 12 }).map((_, index) => <i key={index} className={`zoo-gold-spark zoo-gold-spark-${index + 1}`} />)}
    </div>
  );
}

function ShaMonkeyAnimation() {
  return (
    <div className="zoo-sha-monkey-wrap">
      <div className="zoo-sha-monkey-spotlight" />
      <div className="zoo-sha-monkey-stage">
        <div
          className="zoo-sha-monkey-sprite"
          role="img"
          aria-label="Sha walks in with her monkey, who climbs onto her shoulder before they wave"
        />
      </div>
      <div className="zoo-sha-monkey-title">SHA &amp; HER MONKEY</div>
      {Array.from({ length: 12 }).map((_, index) => (
        <i key={index} className={`zoo-sha-spark zoo-sha-spark-${index + 1}`} />
      ))}
    </div>
  );
}

export default function ZooGiftAnimation({ gift }: { gift: ActiveZooGift | null }) {
  if (!gift) return null;
  return (
    <div key={gift.eventId} className="zoo-gift-layer" aria-live="polite">
      {gift.id === "paw" ? <PawAnimation /> : null}
      {gift.id === "anaconda" ? <AnacondaAnimation /> : null}
      {gift.id === "lion" ? <LionAnimation /> : null}
      {gift.id === "sha_monkey" ? <ShaMonkeyAnimation /> : null}
      <GiftCaption gift={gift} />
    </div>
  );
}
