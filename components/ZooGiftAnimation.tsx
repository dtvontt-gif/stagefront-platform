"use client";

export type ZooGiftId = "paw" | "anaconda" | "lion";

export type ActiveZooGift = {
  id: ZooGiftId;
  eventId: string;
  senderName: string;
};

export const zooGiftCatalog: Record<ZooGiftId, { name: string; icon: string; futurePrice: string; duration: number }> = {
  paw: { name: "Zoo Paw", icon: "🐾", futurePrice: "$0.10", duration: 2200 },
  anaconda: { name: "Anaconda Heart", icon: "🐍", futurePrice: "$3.00", duration: 4300 },
  lion: { name: "King’s Roar", icon: "🦁", futurePrice: "$10.00", duration: 4300 },
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
      <svg className="zoo-anaconda-svg" viewBox="0 0 400 340" role="img" aria-label="Anaconda curling into a heart">
        <defs>
          <linearGradient id="anaconda-scales" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9f99d" />
            <stop offset="0.38" stopColor="#65a30d" />
            <stop offset="0.72" stopColor="#14532d" />
            <stop offset="1" stopColor="#f4b400" />
          </linearGradient>
          <filter id="anaconda-shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity=".7" />
          </filter>
        </defs>
        <path className="zoo-anaconda-shadow" d="M200 292 C174 267 63 193 63 112 C63 40 157 28 200 100 C243 28 337 40 337 112 C337 193 226 267 200 292" />
        <path className="zoo-anaconda-body" d="M200 292 C174 267 63 193 63 112 C63 40 157 28 200 100 C243 28 337 40 337 112 C337 193 226 267 200 292" />
        <g className="zoo-anaconda-head" filter="url(#anaconda-shadow)">
          <ellipse cx="199" cy="291" rx="27" ry="20" fill="#84cc16" stroke="#f4b400" strokeWidth="3" />
          <circle cx="190" cy="287" r="3.5" fill="#050705" />
          <circle cx="208" cy="287" r="3.5" fill="#050705" />
          <path d="M199 298 l-7 8 M199 298 l7 8" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
      <div className="zoo-anaconda-heart">♥</div>
    </div>
  );
}

function LionAnimation() {
  return (
    <div className="zoo-lion-wrap">
      <div className="zoo-roar-ring zoo-roar-ring-one" />
      <div className="zoo-roar-ring zoo-roar-ring-two" />
      <div className="zoo-roar-ring zoo-roar-ring-three" />
      <div className="zoo-lion-rays" />
      <div className="zoo-lion-face" aria-label="Roaring lion" role="img">🦁</div>
      <div className="zoo-roar-word">ROAR!</div>
      {Array.from({ length: 12 }).map((_, index) => <i key={index} className={`zoo-gold-spark zoo-gold-spark-${index + 1}`} />)}
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
      <GiftCaption gift={gift} />
    </div>
  );
}
