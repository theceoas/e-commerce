import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { inngest } from "@/lib/inngest"

function buildDressPrompt(dressLength: string, note: string): string {
  const lengths: Record<string, string> = {
    mini: "mini (very short, above mid-thigh)",
    short: "short (above the knee)",
    midi: "midi (below the knee, above ankle)",
    maxi: "maxi (full length, reaching the ankles or floor)",
    floor: "floor length (touching the floor)",
  }
  const len = lengths[dressLength?.toLowerCase()] || dressLength || "full length"
  return `Virtual try-on: Place the dress shown in the product image(s) onto the model in the reference photo. This is a ${len} dress. Keep everything identical — background, lighting, model pose, skin tone, hair, and body position must remain completely unchanged. Align the dress precisely to the model's body with natural drape, proper fabric flow, correct proportions, and realistic fit. The dress should look naturally worn, not pasted on. Do not alter anything outside the clothing area.${note ? ` ${note}` : ""}`
}

export async function POST(req: NextRequest) {
  try {
    const {
      templateId,
      additionalImageUrls = [],
      dressLength,
      promptNote = "",
    } = await req.json()

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    }

    // Fetch the template to get the reference image
    const { data: template, error: tmplErr } = await supabaseAdmin
      .from("ai_content_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (tmplErr || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Reference image always goes first, then additional product images
    const inputImageUrls: string[] = [template.reference_image_url, ...additionalImageUrls]

    const prompt = buildDressPrompt(dressLength || "full length", promptNote)

    // Create job record
    const { data: job, error } = await supabaseAdmin
      .from("ai_content_jobs")
      .insert({
        type: "image",
        prompt,
        input_image_urls: inputImageUrls,
        template_id: templateId,
        dress_length: dressLength,
        status: "pending",
      })
      .select()
      .single()

    if (error || !job) {
      return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 })
    }

    // Fire Inngest event
    await inngest.send({
      name: "ai-content/image.requested",
      data: { jobId: job.id, prompt, inputImageUrls },
    })

    return NextResponse.json({ jobId: job.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
