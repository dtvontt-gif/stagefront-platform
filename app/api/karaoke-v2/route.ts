import { NextResponse } from "next/server";
import { KARAOKE_PROJECT_SCHEMA } from "@/lib/karaoke-v2/project-schema";

export async function GET() {
  return NextResponse.json({
    engine: "stagefront-karaoke-v2",
    status: "foundation",
    schema: KARAOKE_PROJECT_SCHEMA,
    capabilities: [],
  });
}
