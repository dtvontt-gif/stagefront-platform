type AssToken = { text: string; startMs: number; endMs: number };
type AssLine = { startMs: number; endMs: number; tokens: AssToken[] };

type AssProject = {
  title?: string;
  artist?: string;
  lyrics?: { offsetMs?: number; lines?: AssLine[] };
  render?: {
    activeColor?: string;
    inactiveColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    fontSize?: number;
    verticalPosition?: "top" | "center" | "bottom";
    resolution?: { width?: number; height?: number };
  };
};

function assTime(milliseconds: number) {
  const centiseconds = Math.max(0, Math.round(milliseconds / 10));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds % 100).padStart(2, "0")}`;
}

function assColor(value: string | undefined, fallback: string) {
  const hex = /^#[0-9a-f]{6}$/i.test(value || "") ? value!.slice(1) : fallback.slice(1);
  return `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`.toUpperCase();
}

function escapeAss(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N");
}

function fileSafe(value: string) {
  return value.replace(/[^a-z0-9 _-]+/gi, "").trim().replace(/\s+/g, "-").slice(0, 80) || "stagefront-karaoke";
}

export function karaokeAss(project: AssProject) {
  const render = project.render || {};
  const width = Math.max(640, Math.min(3840, Number(render.resolution?.width) || 1920));
  const height = Math.max(360, Math.min(2160, Number(render.resolution?.height) || 1080));
  const fontSize = Math.max(28, Math.min(120, Number(render.fontSize) || 52));
  const alignment = render.verticalPosition === "top" ? 8 : render.verticalPosition === "center" ? 5 : 2;
  const offsetMs = Number(project.lyrics?.offsetMs) || 0;
  const dialogues = (project.lyrics?.lines || []).filter((line) => line.tokens?.length).map((line) => {
    const sorted = [...line.tokens].sort((first, second) => first.startMs - second.startMs);
    const startMs = Math.max(0, sorted[0].startMs + offsetMs);
    const endMs = Math.max(startMs + 10, sorted[sorted.length - 1].endMs + offsetMs);
    let cursorMs = sorted[0].startMs;
    const text = sorted.map((token) => {
      const gap = Math.max(0, token.startMs - cursorMs);
      const gapTag = gap >= 10 ? `{\\k${Math.max(1, Math.round(gap / 10))}}` : "";
      const duration = Math.max(1, Math.round((token.endMs - token.startMs) / 10));
      cursorMs = token.endMs;
      return `${gapTag}{\\kf${duration}}${escapeAss(token.text)} `;
    }).join("").trimEnd();
    return `Dialogue: 0,${assTime(startMs)},${assTime(endMs)},Karaoke,,0,0,0,,${text}`;
  });

  return `[Script Info]\nTitle: ${escapeAss(project.title || "StageFront Karaoke")}\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Karaoke,${render.fontFamily || "Arial"},${fontSize},${assColor(render.activeColor, "#f4b400")},${assColor(render.inactiveColor, "#ffffff")},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,1,${alignment},80,80,70,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join("\n")}\n`;
}

export function karaokeExportName(project: AssProject) {
  return `${fileSafe([project.artist, project.title].filter(Boolean).join(" - "))}.ass`;
}
