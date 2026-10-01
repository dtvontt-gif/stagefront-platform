export default function ZooCrewBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Official Zoo Crew Superfan"
      aria-label="Official Zoo Crew Superfan"
      className={`inline-flex shrink-0 items-center rounded-full border border-[#ffd05a]/70 bg-[linear-gradient(135deg,#ffd05a,#f4b400_45%,#8b5cf6)] font-black uppercase text-black shadow-[0_0_14px_rgba(244,180,0,.3)] ${compact ? "gap-1 px-1.5 py-0.5 text-[0.56rem] tracking-[0.08em]" : "gap-1.5 px-2.5 py-1 text-[0.65rem] tracking-[0.12em]"}`}
    >
      <span aria-hidden="true" className={compact ? "text-[0.68rem]" : "text-xs"}>🐾</span>
      ZCV {compact ? "" : "Superfan"}
    </span>
  );
}
