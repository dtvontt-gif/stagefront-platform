import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  return Response.redirect(new URL("/", request.url), 303);
}
