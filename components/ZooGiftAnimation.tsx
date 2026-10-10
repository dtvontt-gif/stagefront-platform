"use client";

import Image from "next/image";

export type ZooGiftId =
  | "paw"
  | "anaconda"
  | "lion"
  | "black_panther"
  | "white_tiger"
  | "monkey"
  | "money"
  | "feed_bag"
  | "fly_swatter"
  | "hot_dogs"
  | "don_anaconda"
  | "sha_monkey"
  | "tori_tiger";

export type ActiveZooGift = {
  id: ZooGiftId;
  eventId: string;
  senderName: string;
};

export const zooGiftCatalog: Record<ZooGiftId, { name: string; icon: string; futurePrice: string; coinCost: number; duration: number }> = {
  paw: { name: "Zoo Paw", icon: "🐾", futurePrice: "$0.10", coinCost: 10, duration: 2200 },
  fly_swatter: { name: "Orange Fly Swatter", icon: "🪰", futurePrice: "$0.50", coinCost: 50, duration: 3600 },
  hot_dogs: { name: "Zoo Hot Dogs", icon: "🌭", futurePrice: "$0.50", coinCost: 50, duration: 3600 },
  feed_bag: { name: "Feed the Animals", icon: "🥜", futurePrice: "$1.00", coinCost: 100, duration: 4000 },
  anaconda: { name: "Anaconda Heart", icon: "🐍", futurePrice: "$2.00", coinCost: 200, duration: 4800 },
  lion: { name: "King’s Roar", icon: "🦁", futurePrice: "$2.00", coinCost: 200, duration: 5200 },
  black_panther: { name: "Black Panther", icon: "🐈‍⬛", futurePrice: "$2.00", coinCost: 200, duration: 4800 },
  white_tiger: { name: "White Siberian Tiger", icon: "🐅", futurePrice: "$2.00", coinCost: 200, duration: 4800 },
  monkey: { name: "Monkey Wave", icon: "🐒", futurePrice: "$2.00", coinCost: 200, duration: 4400 },
  money: { name: "Money Shower", icon: "💵", futurePrice: "$2.00", coinCost: 200, duration: 4400 },
  don_anaconda: { name: "Don and His Anaconda", icon: "🐍", futurePrice: "$3.00", coinCost: 300, duration: 6500 },
  sha_monkey: { name: "Sha & Her Monkey", icon: "🐒", futurePrice: "$3.00", coinCost: 300, duration: 8200 },
  tori_tiger: { name: "Tori & Her Tiger", icon: "🐅", futurePrice: "$3.00", coinCost: 300, duration: 6500 },
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

// Premium animated gifts use a smaller, lower-frame-rate transparent asset on
// phones so they stay smooth without reducing desktop/Chromebook quality.
function PremiumGiftMedia({
  className,
  desktopSrc,
  phoneSrc,
  alt,
}: {
  className: string;
  desktopSrc: string;
  phoneSrc: string;
  alt: string;
}) {
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={phoneSrc} />
      <img
        className={className}
        src={desktopSrc}
        width={459}
        height={816}
        fetchPriority="high"
        alt={alt}
      />
    </picture>
  );
}

function DonAnacondaAnimation() {
  return (
    <div className="zoo-anaconda-wrap">
      <PremiumGiftMedia
        className="zoo-anaconda-video"
        desktopSrc="/videos/zoo-crew/don-anaconda-gift-mobile.webp?v=1"
        phoneSrc="/videos/zoo-crew/don-anaconda-gift-iphone.webp?v=2"
        alt="Don with his albino anaconda"
      />
      <div className="zoo-anaconda-title">Don and his Anaconda</div>
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

const regularGiftArtwork = {
  black_panther: { src: "/images/zoo-crew/gifts/black-panther.webp", title: "BLACK PANTHER", tone: "gold" },
  white_tiger: { src: "/images/zoo-crew/gifts/white-siberian-tiger.webp", title: "WHITE SIBERIAN TIGER", tone: "ice" },
  monkey: { src: "/images/zoo-crew/gifts/monkey.webp", title: "MONKEY WAVE", tone: "gold" },
  money: { src: "/images/zoo-crew/gifts/money.webp", title: "MONEY SHOWER", tone: "green" },
  feed_bag: { src: "/images/zoo-crew/gifts/feed-bag.webp", title: "FEED THE ANIMALS", tone: "gold" },
  fly_swatter: { src: "/images/zoo-crew/gifts/orange-fly-swatter.webp", title: "FLY SWATTER", tone: "orange" },
  hot_dogs: { src: "/images/zoo-crew/gifts/hot-dog-plate.webp", title: "ZOO HOT DOGS", tone: "red" },
} as const;

type RegularArtworkGiftId = keyof typeof regularGiftArtwork;

function RegularArtworkAnimation({ giftId }: { giftId: RegularArtworkGiftId }) {
  const gift = regularGiftArtwork[giftId];
  return (
    <div className={`zoo-regular-gift zoo-regular-gift-${gift.tone}`}>
      <div className="zoo-regular-gift-glow" />
      <Image className="zoo-regular-gift-art" src={gift.src} width={1024} height={1024} priority alt={gift.title} />
      <div className="zoo-regular-gift-title">{gift.title}</div>
      {Array.from({ length: 12 }).map((_, index) => (
        <i key={index} className={`zoo-gold-spark zoo-gold-spark-${index + 1}`} />
      ))}
    </div>
  );
}

function ShaMonkeyAnimation() {
  return (
    <div className="zoo-sha-monkey-wrap">
      <PremiumGiftMedia
        className="zoo-sha-monkey-video"
        desktopSrc="/videos/zoo-crew/sha-monkey-gift-transparent.webp?v=1"
        phoneSrc="/videos/zoo-crew/sha-monkey-gift-iphone.webp?v=2"
        alt="Sha walks in with her monkey, who climbs onto her shoulder before they wave"
      />
      <div className="zoo-sha-monkey-title">SHA &amp; HER MONKEY</div>
      {Array.from({ length: 12 }).map((_, index) => (
        <i key={index} className={`zoo-sha-spark zoo-sha-spark-${index + 1}`} />
      ))}
    </div>
  );
}

function ToriTigerAnimation() {
  return (
    <div className="zoo-sha-monkey-wrap">
      <PremiumGiftMedia
        className="zoo-sha-monkey-video"
        desktopSrc="/videos/zoo-crew/tori-tiger-gift-transparent.webp?v=1"
        phoneSrc="/videos/zoo-crew/tori-tiger-gift-iphone.webp?v=1"
        alt="Tori walks beside her white tiger and hugs the tiger around the head"
      />
      <div className="zoo-sha-monkey-title">TORI &amp; HER TIGER</div>
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
      {gift.id in regularGiftArtwork ? <RegularArtworkAnimation giftId={gift.id as RegularArtworkGiftId} /> : null}
      {gift.id === "don_anaconda" ? <DonAnacondaAnimation /> : null}
      {gift.id === "sha_monkey" ? <ShaMonkeyAnimation /> : null}
      {gift.id === "tori_tiger" ? <ToriTigerAnimation /> : null}
      <GiftCaption gift={gift} />
    </div>
  );
}
