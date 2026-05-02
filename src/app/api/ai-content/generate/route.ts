import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { inngest } from "@/lib/inngest"
import { CLIENT_ID } from "@/lib/config"
import { randomUUID } from "crypto"

// ── Prompt builders ───────────────────────────────────────────────────────────

const DRESS_LENGTHS: Record<string, string> = {
  mini:  "mini (very short, above mid-thigh)",
  short: "short (above the knee)",
  midi:  "midi (below the knee, above ankle)",
  maxi:  "maxi (full length, reaching the ankles or floor)",
  floor: "floor length (touching the floor)",
}

function buildPrompt(
  dressLength: string,
  note: string,
  templateType: "single" | "multi_person" | "pose_collage"
): string {
  const len = DRESS_LENGTHS[dressLength?.toLowerCase()] || dressLength || "full length"
  const base = `Virtual try-on: This is a ${len} dress.`

  if (templateType === "multi_person") {
    return `${base} Apply the exact same garment shown in the product image to EVERY person visible in the reference photo — all models must wear this same dress. Do not give different garments to different people. Keep all backgrounds, poses, lighting, skin tones, hair, and faces completely unchanged. The dress must look naturally worn on each person with realistic drape and fit. Do not alter anything outside the clothing area.${note ? ` ${note}` : ""}`
  }

  // single and pose_collage (each cell is a single model)
  return `${base} Place the dress shown in the product image onto the model in the reference photo. Keep everything identical — background, lighting, model pose, skin tone, hair, and body position must remain completely unchanged. Align the dress precisely to the model's body with natural drape, proper fabric flow, correct proportions, and realistic fit. The dress should look naturally worn, not pasted on. Do not alter anything outside the clothing area.${note ? ` ${note}` : ""}`
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      templateIds,        // string[] — one job (or N cell jobs) per template
      productImageUrl,    // the main product image (single clean shot — used for multi_person)
      collageImageUrl,    // full collage of product angles (used for single/pose_collage cells)
      poseCells,          // { templateId, cells: string[], rows, cols }[] — pre-split cells for pose_collage
      dressLength,
      promptNote = "",
    } = await req.json()

    if (!templateIds?.length) {
      return NextResponse.json({ error: "Select at least one template" }, { status: 400 })
    }
    if (!dressLength) {
      return NextResponse.json({ error: "Dress length is required" }, { status: 400 })
    }

    // Fetch all selected templates
    const { data: templates, error: tmplErr } = await supabaseAdmin
      .from("ai_content_templates")
      .select("id, reference_image_url, name, template_type, collage_rows, collage_cols")
      .in("id", templateIds)

    if (tmplErr || !templates?.length) {
      return NextResponse.json({ error: "Templates not found" }, { status: 404 })
    }

    const CREDITS_PER_JOB = 30

    // Calculate total job count and credit cost
    let totalJobs = 0
    for (const t of templates) {
      if (t.template_type === "pose_collage") {
        totalJobs += (t.collage_rows || 1) * (t.collage_cols || 1)
      } else {
        totalJobs += 1
      }
    }
    const totalCredits = totalJobs * CREDITS_PER_JOB

    // ── Credits gate ─────────────────────────────────────────────────────────
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("credits_balance")
      .eq("id", CLIENT_ID)
      .single()

    const currentBalance = clientRow?.credits_balance ?? 0
    if (currentBalance < totalCredits) {
      return NextResponse.json(
        { error: `Not enough credits. Need ${totalCredits} (${totalJobs} × 41), have ${currentBalance}.` },
        { status: 402 }
      )
    }

    const newBalance = currentBalance - totalCredits
    await supabaseAdmin
      .from("clients")
      .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", CLIENT_ID)

    // Log deductions — one transaction per job
    for (let i = 0; i < totalJobs; i++) {
      await supabaseAdmin.from("credit_transactions").insert({
        client_id: CLIENT_ID,
        type: "usage",
        amount: CREDITS_PER_JOB,
        balance_after: newBalance + (totalJobs - 1 - i) * CREDITS_PER_JOB,
        description: "AI generation — virtual try-on",
      })
    }

    // ── Create jobs ───────────────────────────────────────────────────────────
    const createdJobIds: string[] = []

    for (const template of templates) {
      const type = (template.template_type || "single") as "single" | "multi_person" | "pose_collage"
      const prompt = buildPrompt(dressLength, promptNote, type)

      if (type === "pose_collage") {
        // N cell jobs per pose_collage template
        const cellData = poseCells?.find((c: { templateId: string }) => c.templateId === template.id)
        const cells: string[] = cellData?.cells || []
        const rows: number = cellData?.rows || template.collage_rows || 1
        const cols: number = cellData?.cols || template.collage_cols || 1
        const groupId = randomUUID()

        for (let idx = 0; idx < cells.length; idx++) {
          const cellUrl = cells[idx]
          // Each cell: [cell_model_image, product_collage]
          const inputImageUrls = [cellUrl, collageImageUrl || productImageUrl]

          const { data: job, error: jobErr } = await supabaseAdmin
            .from("ai_content_jobs")
            .insert({
              client_id: CLIENT_ID,
              type: "image",
              prompt,
              input_image_urls: inputImageUrls,
              template_id: template.id,
              dress_length: dressLength,
              status: "pending",
              collage_group_id: groupId,
              collage_cell_index: idx,
              collage_rows: rows,
              collage_cols: cols,
            })
            .select()
            .single()

          if (jobErr || !job) {
            return NextResponse.json({ error: jobErr?.message || "Failed to create job" }, { status: 500 })
          }

          createdJobIds.push(job.id)

          await inngest.send({
            name: "ai-content/image.requested",
            data: { jobId: job.id, prompt, inputImageUrls, clientId: CLIENT_ID },
          })
        }

      } else {
        // Single job per template (single or multi_person)
        // multi_person: use ONLY productImageUrl (not collage) to avoid AI splitting garments
        const garmentImage = type === "multi_person"
          ? (productImageUrl || collageImageUrl)
          : (collageImageUrl || productImageUrl)

        if (!garmentImage) {
          return NextResponse.json({ error: "Product image is required" }, { status: 400 })
        }

        const inputImageUrls = [template.reference_image_url, garmentImage]

        const { data: job, error: jobErr } = await supabaseAdmin
          .from("ai_content_jobs")
          .insert({
            client_id: CLIENT_ID,
            type: "image",
            prompt,
            input_image_urls: inputImageUrls,
            template_id: template.id,
            dress_length: dressLength,
            status: "pending",
          })
          .select()
          .single()

        if (jobErr || !job) {
          const msg = jobErr?.message || "Failed to create job"
          if (msg.includes("does not exist")) {
            return NextResponse.json({ error: "Run migration 003_fixes.sql in Supabase SQL Editor first." }, { status: 500 })
          }
          return NextResponse.json({ error: msg }, { status: 500 })
        }

        createdJobIds.push(job.id)

        await inngest.send({
          name: "ai-content/image.requested",
          data: { jobId: job.id, prompt, inputImageUrls, clientId: CLIENT_ID },
        })
      }
    }

    return NextResponse.json({ jobIds: createdJobIds, count: createdJobIds.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
