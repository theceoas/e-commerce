import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { CLIENT_ID } from "@/lib/config"

export async function GET(req: NextRequest) {
  const parentId = new URL(req.url).searchParams.get("parentId")

  if (parentId) {
    const { data, error } = await supabaseAdmin
      .from("ai_content_jobs")
      .select("*")
      .eq("client_id", CLIENT_ID)
      .eq("parent_job_id", parentId)
      .order("created_at", { ascending: true })

    if (error?.message?.includes("parent_job_id")) return NextResponse.json([])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from("ai_content_jobs")
    .select("*")
    .eq("client_id", CLIENT_ID)
    .eq("type", "image")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const { error } = await supabaseAdmin
    .from("ai_content_jobs")
    .delete()
    .eq("id", id)
    .eq("client_id", CLIENT_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
