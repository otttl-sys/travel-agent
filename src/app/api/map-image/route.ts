import { NextRequest, NextResponse } from "next/server";
import { staticMapUrl } from "@/lib/google-maps";

export const maxDuration = 10;

// Proxy for Google Static Maps — keeps the API key server-side
export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get("destination") ?? "";
  if (!destination) return NextResponse.json({ error: "Missing destination" }, { status: 400 });

  const url = staticMapUrl(destination, 800, 380, 13);
  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Map fetch failed" }, { status: 502 });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
