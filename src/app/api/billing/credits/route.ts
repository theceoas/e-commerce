import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"

export async function GET() {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("credits_balance")
    .eq("id", CLIENT_ID)
    .single()

  return NextResponse.json({ credits_balance: data?.credits_balance ?? 0 })
}
