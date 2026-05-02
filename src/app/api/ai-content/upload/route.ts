import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const KIE_API_KEY = process.env.KIE_AI_API_KEY!

// type=template  → Supabase (permanent, reused across generations)
// type=input     → kie.ai temp upload (auto-deleted after 3 days, saves storage)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "input"

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (type === "template") {
      // Ensure bucket exists
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket("brand-images", { public: true })
      if (bucketErr && !bucketErr.message.includes("already exists")) {
        return NextResponse.json({ error: "Bucket error: " + bucketErr.message }, { status: 500 })
      }

      const ext = file.name.split(".").pop()
      const fileName = `ai-content/templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabaseAdmin.storage
        .from("brand-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { data: urlData } = supabaseAdmin.storage.from("brand-images").getPublicUrl(data.path)
      return NextResponse.json({ url: urlData.publicUrl })
    }

    // Temporary kie.ai upload for generation input images (auto-deleted after 3 days)
    const kieForm = new FormData()
    kieForm.append("file", file)
    kieForm.append("uploadPath", "ai-content/inputs")
    kieForm.append("fileName", `${Date.now()}-${file.name}`)

    const kieRes = await fetch("https://kieai.redpandaai.co/api/file-stream-upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      body: kieForm,
    })
    const kieJson = await kieRes.json()
    if (!kieRes.ok || !kieJson.data?.downloadUrl) {
      return NextResponse.json({ error: kieJson.msg || "kie.ai upload failed" }, { status: 500 })
    }

    return NextResponse.json({ url: kieJson.data.downloadUrl })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    )
  }
}
