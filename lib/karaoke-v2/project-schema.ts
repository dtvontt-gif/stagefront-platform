export const KARAOKE_PROJECT_SCHEMA = "stagefront.karaoke-project/v1" as const;

export type KaraokeProjectStatus = "draft" | "processing" | "ready" | "failed";

export type KaraokeMediaAsset = {
  id: string;
  kind: "source" | "instrumental" | "vocals" | "preview" | "render";
  storageKey: string;
  mimeType: string;
  durationMs?: number;
  checksum?: string;
};

export type KaraokeToken = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  syllables?: Array<{
    id: string;
    text: string;
    startMs: number;
    endMs: number;
  }>;
};

export type KaraokeLine = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  singer?: string;
  tokens: KaraokeToken[];
};

export type KaraokeProject = {
  schema: typeof KARAOKE_PROJECT_SCHEMA;
  id: string;
  ownerId: string;
  title: string;
  artist?: string;
  status: KaraokeProjectStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  durationMs?: number;
  language?: string;
  assets: KaraokeMediaAsset[];
  lyrics: {
    offsetMs: number;
    lines: KaraokeLine[];
  };
  render: {
    resolution: { width: number; height: number };
    framesPerSecond: number;
    activeColor: string;
    inactiveColor: string;
    fontFamily: string;
    safeAreaPercent: number;
  };
};

export function createEmptyKaraokeProject(input: {
  id: string;
  ownerId: string;
  title: string;
  now?: string;
}): KaraokeProject {
  const now = input.now ?? new Date().toISOString();
  return {
    schema: KARAOKE_PROJECT_SCHEMA,
    id: input.id,
    ownerId: input.ownerId,
    title: input.title,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    revision: 1,
    assets: [],
    lyrics: { offsetMs: 0, lines: [] },
    render: {
      resolution: { width: 1920, height: 1080 },
      framesPerSecond: 30,
      activeColor: "#f4b400",
      inactiveColor: "#ffffff",
      fontFamily: "Arial",
      safeAreaPercent: 5,
    },
  };
}

export function validateKaraokeTimeline(project: KaraokeProject): string[] {
  const errors: string[] = [];
  for (const line of project.lyrics.lines) {
    if (line.startMs < 0 || line.endMs <= line.startMs) errors.push(`Invalid timing for line ${line.id}.`);
    let previousEnd = line.startMs;
    for (const token of line.tokens) {
      if (token.startMs < line.startMs || token.endMs > line.endMs || token.endMs <= token.startMs) {
        errors.push(`Token ${token.id} falls outside line ${line.id}.`);
      }
      if (token.startMs < previousEnd) errors.push(`Token ${token.id} overlaps the previous token.`);
      previousEnd = token.endMs;
    }
  }
  return errors;
}
