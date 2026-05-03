import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const parentId = new URL(req.url).searchParams.get("parentId")

  if (parentId) {
    const { data, error } = await supabaseAdmin
      .from("ai_content_jobs")
      .select("*")
      .eq("parent_job_id", parentId)
      .order("created_at", { ascending: true })

    if (error?.message?.includes("parent_job_id")) return NextResponse.json([])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Main list — only primary image jobs
  const { data, error } = await supabaseAdmin
    .from("ai_content_jobs")
    .select("*")
    .eq("type", "image")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const { error } = await supabaseAdmin.from("ai_content_jobs").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
