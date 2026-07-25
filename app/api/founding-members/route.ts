const allowedRoles = new Set(["fan", "artist", "producer", "host"]);
const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegistrationBody = {
  displayName?: unknown;
  email?: unknown;
  username?: unknown;
  role?: unknown;
  showOnWall?: unknown;
  website?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function configuration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function POST(request: Request) {
  const config = configuration();

  if (!config) {
    return Response.json(
      {
        message:
          "Founding Member registration needs the Supabase connection added before it can accept signups.",
      },
      { status: 503 },
    );
  }

  let body: RegistrationBody;
  try {
    body = (await request.json()) as RegistrationBody;
  } catch {
    return Response.json({ message: "Invalid registration request." }, { status: 400 });
  }

  if (text(body.website)) {
    return Response.json({ message: "Registration received." });
  }

  const displayName = text(body.displayName);
  const email = text(body.email).toLowerCase();
  const username = text(body.username).replace(/^@/, "").toLowerCase();
  const role = text(body.role).toLowerCase();
  const showOnWall = body.showOnWall === true;

  if (displayName.length < 2 || displayName.length > 80) {
    return Response.json(
      { message: "Enter a name between 2 and 80 characters." },
      { status: 400 },
    );
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  if (!usernamePattern.test(username)) {
    return Response.json(
      { message: "Use 3–24 letters, numbers, or underscores for your username." },
      { status: 400 },
    );
  }
  if (!allowedRoles.has(role)) {
    return Response.json({ message: "Choose how you are joining StageFront." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/founding_members`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      display_name: displayName,
      email,
      username,
      role,
      show_on_wall: showOnWall,
    }),
  });

  if (response.ok) {
    return Response.json({
      message:
        "Welcome to StageFront. Your username is reserved and your Founding Member registration is confirmed.",
    });
  }

  const errorText = await response.text();
  if (response.status === 409 || errorText.includes("duplicate key")) {
    return Response.json(
      { message: "That email or username is already registered." },
      { status: 409 },
    );
  }

  console.error("Supabase registration failed", response.status, errorText);
  return Response.json(
    { message: "Registration is temporarily unavailable. Please try again." },
    { status: 502 },
  );
}

export async function GET() {
  const config = configuration();
  if (!config) {
    return Response.json({ founders: [] });
  }

  const query = new URLSearchParams({
    select: "founder_number,display_name,username,role",
    show_on_wall: "eq.true",
    order: "founder_number.asc",
    limit: "1000",
  });
  const response = await fetch(
    `${config.url}/rest/v1/founding_members?${query.toString()}`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return Response.json({ founders: [] });
  }

  return Response.json({ founders: await response.json() });
}
