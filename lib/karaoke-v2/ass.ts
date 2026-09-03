import { mergeManualLyricLines, type TimedLine } from "@/lib/karaoke-v2/lyrics";

type AssProject = {
  title?: string;
  artist?: string;
  durationMs?: number;
  lyrics?: { offsetMs?: number; lines?: TimedLine[] };
  render?: {
    activeColor?: string;
    inactiveColor?: string;
    backgroundColor?: string;
    backgroundImagePath?: string;
    backgroundTemplate?: "stagefront-stage";
    fontFamily?: string;
    fontSize?: number;
    verticalPosition?: "top" | "center" | "bottom";
    resolution?: { width?: number; height?: number };
  };
};

// Matches the mastered StageFront sonic-logo/welcome asset used by the renderer.
export const KARAOKE_INTRO_MS = 11450;
export const KARAOKE_OUTRO_MS = 4000;

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
  const repairedLines = mergeManualLyricLines(project.lyrics?.lines || []).filter((line) => line.tokens?.length);
  const dialogues = repairedLines.map((line) => {
    const sorted = [...line.tokens].sort((first, second) => first.startMs - second.startMs);
    const startMs = Math.max(KARAOKE_INTRO_MS, sorted[0].startMs + offsetMs + KARAOKE_INTRO_MS);
    const endMs = Math.max(startMs + 10, sorted[sorted.length - 1].endMs + offsetMs + KARAOKE_INTRO_MS);
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

  const lyricEndMs = Math.max(0, ...repairedLines.flatMap((line) => line.tokens.map((token) => token.endMs + offsetMs)));
  const songDurationMs = Math.max(Number(project.durationMs) || 0, lyricEndMs);
  const introTitle = escapeAss(project.title || "Your song");
  const introArtist = project.artist ? `\\N${escapeAss(project.artist)}` : "";
  const introEvents = [
    `Dialogue: 1,${assTime(350)},${assTime(3800)},Intro,,0,0,0,,{\\fad(450,500)}STAGEFRONT`,
    `Dialogue: 1,${assTime(4450)},${assTime(6000)},Intro,,0,0,0,,{\\fad(350,300)}NOW COMING TO THE STAGE`,
    `Dialogue: 2,${assTime(6100)},${assTime(KARAOKE_INTRO_MS - 300)},IntroTitle,,0,0,0,,{\\fad(500,450)}${introTitle}${introArtist}`,
  ];
  const outroStartMs = KARAOKE_INTRO_MS + songDurationMs;
  const outroEvent = `Dialogue: 1,${assTime(outroStartMs)},${assTime(outroStartMs + KARAOKE_OUTRO_MS)},Outro,,0,0,0,,THANK YOU FOR COMING TO THE STAGE`;

  return `[Script Info]\nTitle: ${escapeAss(project.title || "StageFront Karaoke")}\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Karaoke,${render.fontFamily || "Arial"},${fontSize},${assColor(render.activeColor, "#f4b400")},${assColor(render.inactiveColor, "#ffffff")},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,1,${alignment},80,80,70,1\nStyle: Intro,${render.fontFamily || "Arial"},52,&H0000B4F4,&H0000B4F4,&H00000000,&H80000000,-1,0,0,0,100,100,3,0,1,4,1,5,100,100,70,1\nStyle: IntroTitle,${render.fontFamily || "Arial"},68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,1,5,100,100,70,1\nStyle: Outro,${render.fontFamily || "Arial"},58,&H0000B4F4,&H0000B4F4,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,4,1,5,100,100,70,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${[...introEvents, ...dialogues, outroEvent].join("\n")}\n`;
}

export function karaokeExportName(project: AssProject) {
  return `${fileSafe([project.artist, project.title].filter(Boolean).join(" - "))}.ass`;
}
