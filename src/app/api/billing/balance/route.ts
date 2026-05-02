import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"

export async function GET() {
  const [clientRes, txRes] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("credits_balance, owner_email")
      .eq("id", CLIENT_ID)
      .single(),
    supabaseAdmin
      .from("credit_transactions")
      .select("id, type, amount, balance_after, description, paystack_reference, created_at")
      .eq("client_id", CLIENT_ID)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    credits_balance: clientRes.data?.credits_balance ?? 0,
    owner_email: clientRes.data?.owner_email ?? "",
    transactions: txRes.data ?? [],
  })
}
