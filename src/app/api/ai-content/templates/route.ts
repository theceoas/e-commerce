import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ai_content_templates")
    .select("*")
    .eq("client_id", CLIENT_ID)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, reference_image_url, description } = body

  if (!name || !reference_image_url) {
    return NextResponse.json({ error: "name and reference_image_url required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("ai_content_templates")
    .insert({ client_id: CLIENT_ID, name, reference_image_url, description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await supabaseAdmin.from("ai_content_templates").delete().eq("id", id).eq("client_id", CLIENT_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
