import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  // Resolve current user if logged in — tags trip for future filtering
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Auth unavailable (NEXT_PUBLIC_SUPABASE_ANON_KEY not set) — skip silently
  }

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
    baseline_flights: body.baseline_flights ?? null,
    baseline_hotel: body.baseline_hotel ?? null,
    ...(userId ? { user_id: userId } : {}),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
