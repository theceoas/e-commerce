import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"
import crypto from "crypto"

const PACKAGES: Record<string, { credits: number; label: string }> = {
  growth: { credits: 1260, label: "Growth Pack" },
  pro:    { credits: 1980, label: "Pro Pack"    },
  scale:  { credits: 3000, label: "Scale Pack"  },
}

// Amounts in kobo: starter=1000000, growth=1800000, pro=5000000, scale=8000000

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-paystack-signature")
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 })

  const hash = crypto.createHmac("sha512", process.env.STORELY_PAYSTACK_SECRET_KEY!).update(rawBody).digest("hex")
  if (hash !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })

  const event = JSON.parse(rawBody)
  if (event.event !== "charge.success") return NextResponse.json({ ok: true })

  const data = event.data
  const reference = data?.reference
  const metadata = data?.metadata ?? {}
  const packageId = metadata?.package_id
  const clientId = metadata?.client_id

  if (clientId !== CLIENT_ID) return NextResponse.json({ ok: true })
  if (!packageId || !PACKAGES[packageId]) return NextResponse.json({ ok: true })

  const { data: existing } = await supabaseAdmin.from("credit_transactions").select("id").eq("paystack_reference", reference).eq("client_id", CLIENT_ID).single()
  if (existing) return NextResponse.json({ ok: true })

  const pkg = PACKAGES[packageId]
  const { data: client } = await supabaseAdmin.from("clients").select("credits_balance").eq("id", CLIENT_ID).single()
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const newBalance = (client.credits_balance ?? 0) + pkg.credits

  const { error: insertError } = await supabaseAdmin.from("credit_transactions").insert({
    client_id: CLIENT_ID, type: "purchase", amount: pkg.credits,
    balance_after: newBalance, description: `${pkg.label} — ${pkg.credits} credits (webhook)`, paystack_reference: reference,
  })

  if (insertError) return NextResponse.json({ ok: true }) // duplicate or error — already handled

  await supabaseAdmin.from("clients").update({ credits_balance: newBalance, updated_at: new Date().toISOString() }).eq("id", CLIENT_ID)

  return NextResponse.json({ ok: true })
}
