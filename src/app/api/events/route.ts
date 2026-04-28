import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest"

// Maps the legacy event_type strings to Inngest event names
const EVENT_MAP: Record<string, string> = {
  purchase: "order/purchase.completed",
  shipping_update: "order/status.changed",
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_type, event_name, data } = body

    // Support both old-style (event_type) and new-style (event_name)
    const inngestEventName = event_name || EVENT_MAP[event_type]

    if (!inngestEventName) {
      return NextResponse.json({ error: `Unknown event: ${event_type || event_name}` }, { status: 400 })
    }

    await inngest.send({ name: inngestEventName, data })

    return NextResponse.json({ ok: true, event: inngestEventName })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send event" },
      { status: 500 }
    )
  }
}
