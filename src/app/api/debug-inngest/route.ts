import { NextResponse } from "next/server"

// TEMPORARY debug endpoint – DELETE after verifying the key
export async function GET() {
  const key = process.env.INNGEST_SIGNING_KEY || ""
  const eventKey = process.env.INNGEST_EVENT_KEY || ""
  const isDev = process.env.INNGEST_DEV || "not set"

  return NextResponse.json({
    signing_key_prefix: key.slice(0, 16),
    signing_key_suffix: key.slice(-8),
    signing_key_length: key.length,
    event_key_prefix: eventKey.slice(0, 10),
    inngest_dev: isDev,
    node_env: process.env.NODE_ENV,
  })
}
