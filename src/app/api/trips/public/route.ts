import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("trips")
    .select("id, destination, is_multi_city, cities, start_date, end_date, travelers, budget, cards, saved_at")
    .eq("is_public", true)
    .order("saved_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
