"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallZooCrewApp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    void navigator.serviceWorker?.register("/zoo-crew-sw.js").catch(() => undefined);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setInstructionsOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) return <span className="rounded-full border border-emerald-500/25 bg-emerald-950/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-200">✓ Zoo Crew App Installed</span>;

  return (
    <>
      <button type="button" onClick={() => void install()} className="rounded-full border border-[#f4b400]/45 bg-[#f4b400]/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#f4b400]">📲 Install Zoo Crew App</button>
      {instructionsOpen ? <div className="fixed inset-0 z-[200] grid items-end bg-black/70 backdrop-blur-sm sm:place-items-center" onClick={() => setInstructionsOpen(false)}>
        <div className="w-full rounded-t-[2rem] border border-[#f4b400]/30 bg-[#0c100e] p-6 text-left text-white shadow-2xl sm:max-w-md sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">Zoo Crew Vibe</p><h2 className="mt-1 text-2xl font-black">Install the app</h2></div><button type="button" onClick={() => setInstructionsOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/75">
            <p><strong className="text-white">iPhone:</strong> Open this page in Safari, tap the Share button, choose <strong className="text-white">Add to Home Screen</strong>, then tap Add.</p>
            <p><strong className="text-white">Android:</strong> Open this page in Chrome, tap the three-dot menu, choose <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.</p>
          </div>
          <button type="button" onClick={() => setInstructionsOpen(false)} className="mt-6 w-full rounded-2xl bg-[#f4b400] px-4 py-3 font-black text-black">Got It</button>
        </div>
      </div> : null}
    </>
  );
}
