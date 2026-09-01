"use client";

import type { CSSProperties } from "react";

type PreviewToken = { id: string; text: string; startMs: number; endMs: number };
type PreviewLine = { id: string; startMs: number; endMs: number; tokens: PreviewToken[] };

export type PreviewStyle = {
  activeColor: string;
  inactiveColor: string;
  backgroundColor: string;
  fontSize: number;
  verticalPosition: "top" | "center" | "bottom";
};

export default function KaraokePreview({ lines, currentMs, offsetMs, style }: {
  lines: PreviewLine[];
  currentMs: number;
  offsetMs: number;
  style: PreviewStyle;
}) {
  const sortedLines = [...lines].sort((first, second) => first.startMs - second.startMs);
  const activeIndex = sortedLines.findIndex((line) => currentMs >= line.startMs + offsetMs && currentMs <= line.endMs + offsetMs);
  const upcomingIndex = sortedLines.findIndex((line) => currentMs < line.startMs + offsetMs);
  const displayIndex = activeIndex >= 0 ? activeIndex : upcomingIndex >= 0 ? upcomingIndex : Math.max(0, sortedLines.length - 1);
  const visibleLines = sortedLines.slice(displayIndex, displayIndex + 2);
  const variables = {
    "--preview-active": style.activeColor,
    "--preview-inactive": style.inactiveColor,
    "--preview-background": style.backgroundColor,
    "--preview-font-size": `${style.fontSize}px`,
  } as CSSProperties;

  return <section className="karaoke-preview-wrap">
    <div className={`karaoke-preview position-${style.verticalPosition}`} style={variables}>
      <div className="preview-glow" />
      <div className="preview-lyrics">
        {visibleLines.length ? visibleLines.map((line, lineIndex) => <p className={lineIndex === 0 ? "primary" : "next"} key={line.id}>
          {line.tokens.map((token) => {
            const started = currentMs >= token.startMs + offsetMs;
            const active = currentMs >= token.startMs + offsetMs && currentMs <= token.endMs + offsetMs;
            return <span className={`${started ? "sung" : ""}${active ? " active" : ""}`} key={token.id}>{token.text} </span>;
          })}
        </p>) : <p className="preview-empty">Add lyrics to preview your karaoke.</p>}
      </div>
      <span className="preview-badge">LIVE PREVIEW</span>
    </div>
  </section>;
}
