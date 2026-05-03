import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { inngest } from "@/lib/inngest"

export const CREDITS_PER_ANGLE = 10

// Clothing/fashion — different angles and poses of the model wearing the outfit
export const CLOTHING_ANGLE_PROMPTS = [
  "Front-facing full length: same model wearing the same outfit, facing directly forward in a relaxed natural pose. Identical background, lighting, and model appearance.",
  "Side profile: model turned 90 degrees to show the garment's silhouette, drape, and cut from the side. Same background and lighting.",
  "Back view: model facing away from camera to show the garment's back design, cut, and details. Same background and lighting.",
  "Detail close-up: tight shot focusing on the garment's fabric texture, pattern, or key design features. Same lighting and styling.",
]

export async function POST(req: NextRequest) {
  try {
    const { jobId, count } = await req.json()
    if (!jobId || !count || count < 1 || count > 4) {
      return NextResponse.json({ error: "jobId and count (1–4) required" }, { status: 400 })
    }

    const { data: originalJob } = await supabaseAdmin
      .from("ai_content_jobs")
      .select("id, result_urls, input_image_urls, status, client_id")
      .eq("id", jobId)
      .single()

    if (!originalJob) return NextResponse.json({ error: "Job not found" }, { status: 404 })
    if (originalJob.status !== "success") return NextResponse.json({ error: "Job must be completed first" }, { status: 400 })
    if (!originalJob.result_urls?.length) return NextResponse.json({ error: "No result image available" }, { status: 400 })

    const clientId = originalJob.client_id

    // Credits gate
    const totalCredits = count * CREDITS_PER_ANGLE
    const { data: clientRow } = await supabaseAdmin.from("clients").select("credits_balance").eq("id", clientId).single()
    const currentBalance = clientRow?.credits_balance ?? 0
    if (currentBalance < totalCredits) {
      return NextResponse.json({ error: `Need ${totalCredits} credits, have ${currentBalance}` }, { status: 402 })
    }

    const newBalance = currentBalance - totalCredits
    await supabaseAdmin.from("clients").update({ credits_balance: newBalance, updated_at: new Date().toISOString() }).eq("id", clientId)
    await supabaseAdmin.from("credit_transactions").insert({
      client_id: clientId,
      type: "usage",
      amount: totalCredits,
      balance_after: newBalance,
      description: `AI angles — ${count} variation${count > 1 ? "s" : ""} (clothing)`,
    })

    const resultImageUrl = originalJob.result_urls[0]
    // Result image first, then original product/dress images (skip reference model at [0])
    const baseInputs = [resultImageUrl, ...originalJob.input_image_urls.slice(1)]
    const angleJobIds: string[] = []

    for (let i = 0; i < count; i++) {
      const prompt = CLOTHING_ANGLE_PROMPTS[i]
      const row: Record<string, unknown> = {
        client_id: clientId,
        type: "angle",
        prompt,
        input_image_urls: baseInputs,
        status: "pending",
      }

      let { data: angleJob, error } = await supabaseAdmin
        .from("ai_content_jobs")
        .insert({ ...row, parent_job_id: jobId })
        .select()
        .single()

      if (error?.message?.includes("parent_job_id")) {
        const fallback = await supabaseAdmin.from("ai_content_jobs").insert(row).select().single()
        angleJob = fallback.data
        error = fallback.error
      }

      if (error || !angleJob) continue
      angleJobIds.push(angleJob.id)

      await inngest.send({
        name: "ft/angles.requested",
        data: { jobId: angleJob.id, prompt, inputImageUrls: baseInputs, clientId, parentJobId: jobId, angleIndex: i },
      })
    }

    return NextResponse.json({ angleJobIds })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
