import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"

const PACKAGES: Record<string, { credits: number; amount: number; label: string }> = {
  starter: { credits: 1500, amount: 1500000, label: "Starter Pack" },
  growth:  { credits: 3000, amount: 3000000, label: "Growth Pack"  },
  pro:     { credits: 4500, amount: 4500000, label: "Pro Pack"     },
  scale:   { credits: 6000, amount: 6000000, label: "Scale Pack"   },
}

export async function POST(req: NextRequest) {
  try {
    const { reference, packageId } = await req.json()
    if (!reference || !packageId) return NextResponse.json({ error: "reference and packageId required" }, { status: 400 })

    const pkg = PACKAGES[packageId]
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 })

    // Idempotency check
    const { data: existing } = await supabaseAdmin
      .from("credit_transactions").select("id").eq("paystack_reference", reference).eq("client_id", CLIENT_ID).single()
    if (existing) return NextResponse.json({ error: "Reference already used" }, { status: 409 })

    // Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.STORELY_PAYSTACK_SECRET_KEY}` },
    })
    const paystackData = await paystackRes.json()
    if (!paystackData.status || paystackData.data?.status !== "success") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 })
    }
    if (paystackData.data.amount !== pkg.amount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
    }

    const { data: client } = await supabaseAdmin.from("clients").select("credits_balance").eq("id", CLIENT_ID).single()
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const newBalance = (client.credits_balance ?? 0) + pkg.credits

    // Insert transaction first — if a unique constraint exists this will fail on duplicate
    const { error: insertError } = await supabaseAdmin.from("credit_transactions").insert({
      client_id: CLIENT_ID, type: "purchase", amount: pkg.credits,
      balance_after: newBalance, description: `${pkg.label} — ${pkg.credits} credits`, paystack_reference: reference,
    })

    // Duplicate key / unique violation — treat as already processed
    if (insertError) {
      if (insertError.code === '23505') return NextResponse.json({ error: "Reference already used" }, { status: 409 })
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabaseAdmin.from("clients").update({ credits_balance: newBalance, updated_at: new Date().toISOString() }).eq("id", CLIENT_ID)

    return NextResponse.json({ ok: true, credits_added: pkg.credits, new_balance: newBalance })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 })
  }
}
