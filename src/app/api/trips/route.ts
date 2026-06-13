import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("trips")
    .select("*")
    .order("saved_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { error } = await supabaseAdmin.from("trips").insert({
    id: body.id,
    destination: body.destination,
    is_multi_city: body.is_multi_city,
    cities: body.cities,
    start_date: body.start_date,
    end_date: body.end_date,
    travelers: body.travelers,
    budget: body.budget,
    ai_result: body.ai_result,
    cards: body.cards,
    saved_at: body.saved_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
