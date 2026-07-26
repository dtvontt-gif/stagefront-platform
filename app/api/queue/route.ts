import { serviceConfiguration } from "@/lib/stagefront-auth";

type QueueEntry = {
  id: number;
  display_name: string;
  song_title: string;
  song_artist: string;
  status: "waiting" | "called";
  created_at: string;
};

function serviceHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

async function settings(url: string, key: string) {
  const response = await fetch(
    `${url}/rest/v1/live_queue_settings?id=eq.1&select=is_open,average_minutes`,
    { headers: serviceHeaders(key), cache: "no-store" },
  );
  const rows = response.ok
    ? ((await response.json()) as { is_open: boolean; average_minutes: number }[])
    : [];
  return rows[0] ?? { is_open: false, average_minutes: 5 };
}

export async function GET() {
  const config = serviceConfiguration();
  if (!config) {
    return Response.json({
      settings: { is_open: false, average_minutes: 5 },
      entries: [],
    });
  }

  const queueSettings = await settings(config.url, config.serviceKey);
  const query = new URLSearchParams({
    select: "id,display_name,song_title,song_artist,status,created_at",
    status: "in.(waiting,called)",
    order: "created_at.asc",
    limit: "100",
  });
  const response = await fetch(
    `${config.url}/rest/v1/live_queue_entries?${query}`,
    { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
  );
  const rows = response.ok ? ((await response.json()) as QueueEntry[]) : [];
  const entries = rows
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "called" ? -1 : 1))
    .map((entry, index) => ({
      ...entry,
      position: entry.status === "called" ? 0 : index + 1,
      estimated_minutes:
        entry.status === "called" ? 0 : index * queueSettings.average_minutes,
    }));

  return Response.json({ settings: queueSettings, entries });
}

export async function POST(request: Request) {
  const config = serviceConfiguration();
  if (!config) {
    return Response.json({ message: "The Live Queue is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (text(body?.website, 200)) {
    return Response.json({ message: "Your request was received." });
  }

  const displayName = text(body?.displayName, 80);
  const email = text(body?.email, 254).toLowerCase();
  const songTitle = text(body?.songTitle, 120);
  const songArtist = text(body?.songArtist, 120);
  const notes = text(body?.notes, 300) || null;
  if (
    displayName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !songTitle ||
    !songArtist
  ) {
    return Response.json(
      { message: "Enter your name, email, song title, and original artist." },
      { status: 400 },
    );
  }

  const queueSettings = await settings(config.url, config.serviceKey);
  if (!queueSettings.is_open) {
    return Response.json(
      { message: "The StageFront Live Queue is currently closed." },
      { status: 409 },
    );
  }

  const response = await fetch(`${config.url}/rest/v1/live_queue_entries`, {
    method: "POST",
    headers: {
      ...serviceHeaders(config.serviceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      display_name: displayName,
      email,
      song_title: songTitle,
      song_artist: songArtist,
      notes,
    }),
  });
  if (!response.ok) {
    return Response.json(
      { message: "The queue request could not be saved. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({
    message: "You are in the StageFront Live Queue. Keep this page open for updates.",
  });
}
