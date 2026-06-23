import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function toIcalDate(iso: string): string {
  // DTSTART/DTEND VALUE=DATE format: YYYYMMDD
  if (!iso) return "";
  return iso.slice(0, 10).replace(/-/g, "");
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Strip markdown so DESCRIPTION is readable plain text
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Fold long iCal lines at 75 chars
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("trips").select("*").eq("id", id).single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const destination: string = data.is_multi_city && data.cities?.length
    ? (data.cities as string[]).join(", ")
    : (data.destination as string) ?? "Trip";

  const dtStart = toIcalDate(data.start_date as string);
  const dtEnd = toIcalDate(data.end_date as string);

  // DTEND in all-day events is exclusive — add 1 day
  let dtEndExclusive = dtEnd;
  if (dtEnd) {
    const d = new Date(`${(data.end_date as string).slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    dtEndExclusive = d.toISOString().slice(0, 10).replace(/-/g, "");
  }

  const summary = escapeIcal(`✈ Trip to ${destination}`);
  const rawDesc = stripMarkdown((data.ai_result as string) ?? "");
  // iCal DESCRIPTION: truncate to ~2000 chars to avoid huge files
  const description = escapeIcal(rawDesc.slice(0, 2000) + (rawDesc.length > 2000 ? "…" : ""));
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://vagamundo.io"}/trip/${id}`;
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vagamundo//Travel Agent//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    foldLine(`UID:vagamundo-trip-${id}@vagamundo.io`),
    foldLine(`DTSTAMP:${now}`),
    ...(dtStart ? [`DTSTART;VALUE=DATE:${dtStart}`] : []),
    ...(dtEndExclusive ? [`DTEND;VALUE=DATE:${dtEndExclusive}`] : []),
    foldLine(`SUMMARY:${summary}`),
    foldLine(`DESCRIPTION:${description}`),
    foldLine(`URL:${url}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const ics = lines.join("\r\n");
  const filename = `vagamundo-${destination.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
