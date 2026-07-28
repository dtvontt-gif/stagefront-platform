"use client";

import Script from "next/script";

const PUBLIC_TOKEN = "aa46900f-b5be-4815-ab83-f1cc3fd58bf0";

export default function CasterFmPlayer() {
  return (
    <div className="caster-player-shell" aria-label="StageFront Radio player">
      <div
        data-type="newStreamPlayer"
        data-publicToken={PUBLIC_TOKEN}
        data-theme="dark"
        data-color="F4B400"
        data-channelId=""
        data-rendered="false"
        className="cstrEmbed"
      >
        <a href="https://www.caster.fm">Shoutcast Hosting</a>{" "}
        <a href="https://www.caster.fm">Stream Hosting</a>{" "}
        <a href="https://www.caster.fm">Radio Server Hosting</a>
      </div>
      <Script
        id="caster-fm-stagefront-player"
        src="https://cdn.cloud.caster.fm/widgets/embed.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
