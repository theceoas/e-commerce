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
    const { packageId } = await req.json()
    const pkg = PACKAGES[packageId]
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 })

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("owner_email")
      .eq("id", CLIENT_ID)
      .single()

    const email = client?.owner_email || process.env.BILLING_EMAIL
    if (!email) {
      return NextResponse.json({ error: "Owner email not configured. Set BILLING_EMAIL in env or update the clients table." }, { status: 500 })
    }

    const reference = `ft-credits-${packageId}-${Date.now()}`
    const appUrl = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || ""

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STORELY_PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: pkg.amount,
        reference,
        currency: "NGN",
        callback_url: `${appUrl}/admin/billing/callback`,
        metadata: {
          package_id: packageId,
          client_id: CLIENT_ID,
          custom_fields: [
            { display_name: "Package", variable_name: "package", value: pkg.label },
          ],
        },
      }),
    })

    const result = await paystackRes.json()
    if (!result.status) {
      return NextResponse.json({ error: result.message || "Paystack error" }, { status: 400 })
    }

    return NextResponse.json({ authorization_url: result.data.authorization_url, reference })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 })
  }
}
