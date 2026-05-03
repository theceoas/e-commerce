import { inngest } from "@/lib/inngest"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Resend } from "resend"
import {
  orderConfirmationEmail,
  outForDeliveryEmail,
  deliveredEmail,
  orderCompletedEmail,
} from "@/lib/email-templates"

const KIE_API_KEY = process.env.KIE_AI_API_KEY!
const KIE_BASE = "https://api.kie.ai"
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || "orders@favoritethingslifestyle.com"

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function fetchOrderForEmail(orderId: string) {
  const { data } = await supabaseAdmin
    .from("orders")
    .select(`
      id, order_number, total_amount, subtotal, shipping_cost,
      guest_email, shipping_address,
      order_items (
        id, quantity, size, unit_price, total_price,
        products ( name, thumbnail_url )
      )
    `)
    .eq("id", orderId)
    .single()
  return data
}

// ── Credits refund helper ─────────────────────────────────────────────────────

const CREDITS_PER_JOB = 30
const CREDITS_PER_ANGLE = 10

async function refundCredit(clientId: string, jobId: string, amount = CREDITS_PER_JOB) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("credits_balance")
    .eq("id", clientId)
    .single()
  if (!client) return
  const newBalance = (client.credits_balance ?? 0) + amount
  await supabaseAdmin
    .from("clients")
    .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", clientId)
  await supabaseAdmin.from("credit_transactions").insert({
    client_id: clientId,
    type: "refund",
    amount,
    balance_after: newBalance,
    description: `Refund — generation failed (job ${jobId})`,
  })
}

// ── 1. Image generation (nano-banana-pro) ────────────────────────────────────

export const generateImage = inngest.createFunction(
  { id: "generate-image", retries: 1, triggers: [{ event: "ai-content/image.requested" }] },
  async ({ event, step }) => {
    const { jobId, prompt, inputImageUrls, clientId } = event.data as {
      jobId: string
      prompt: string
      inputImageUrls: string[]
      clientId: string
    }

    // Verify client is active before spending compute
    await step.run("verify-client", async () => {
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id, status")
        .eq("id", clientId)
        .single()
      if (!client) throw new Error("Client not found")
      if (client.status === "suspended") throw new Error("Client account suspended")
    })

    const taskId = await step.run("create-image-task", async () => {
      const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nano-banana-pro",
          input: {
            prompt,
            image_input: inputImageUrls,
            aspect_ratio: "9:16",
            resolution: "2K",
            output_format: "png",
          },
        }),
      })
      const json = await res.json()
      if (json.code !== 200) throw new Error(json.msg || "kie.ai task creation failed")
      return json.data.taskId as string
    })

    await step.run("save-task-id", async () => {
      await supabaseAdmin
        .from("ai_content_jobs")
        .update({ task_id: taskId, status: "processing" })
        .eq("id", jobId)
    })

    for (let i = 0; i < 40; i++) {
      await step.sleep(`poll-wait-${i}`, "20 seconds")

      const state = await step.run(`poll-image-${i}`, async () => {
        const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        })
        const json = await res.json()
        return json.data as { state: string; resultJson?: string; failMsg?: string }
      })

      if (state.state === "success") {
        const resultUrls = JSON.parse(state.resultJson || "{}").resultUrls || []
        await step.run("save-success", async () => {
          await supabaseAdmin
            .from("ai_content_jobs")
            .update({ status: "success", result_urls: resultUrls })
            .eq("id", jobId)
        })
        return { status: "success", resultUrls }
      }

      if (state.state === "fail") {
        await step.run("save-failure-refund", async () => {
          await supabaseAdmin
            .from("ai_content_jobs")
            .update({ status: "failed", error_msg: state.failMsg || "Generation failed" })
            .eq("id", jobId)
          await refundCredit(clientId, jobId)
        })
        return { status: "failed" }
      }
    }

    // Timed out
    await step.run("save-timeout-refund", async () => {
      await supabaseAdmin
        .from("ai_content_jobs")
        .update({ status: "failed", error_msg: "Timed out waiting for result" })
        .eq("id", jobId)
      await refundCredit(clientId, jobId)
    })

    return { status: "timeout" }
  }
)

// ── 2. Order confirmation email ───────────────────────────────────────────────

export const sendOrderConfirmation = inngest.createFunction(
  { id: "send-order-confirmation", retries: 2, triggers: [{ event: "order/purchase.completed" }] },
  async ({ event, step }) => {
    const { orderId, customerEmail, customerName } = event.data as {
      orderId: string
      customerEmail: string
      customerName: string
    }

    await step.run("send-email", async () => {
      const order = await fetchOrderForEmail(orderId)
      if (!order) throw new Error(`Order ${orderId} not found`)

      const emailData = {
        orderNumber: order.order_number,
        customerName: customerName || "there",
        customerEmail,
        items: (order.order_items || []).map((i: any) => ({
          name: i.products?.name || "Item",
          quantity: i.quantity,
          size: i.size,
          unit_price: i.unit_price,
          total_price: i.total_price,
          thumbnail_url: i.products?.thumbnail_url,
        })),
        subtotal: order.subtotal || 0,
        shippingCost: order.shipping_cost || 0,
        total: order.total_amount || 0,
        shippingAddress: order.shipping_address || {},
      }

      const { subject, html } = orderConfirmationEmail(emailData)

      const { error } = await resend.emails.send({ from: FROM, to: customerEmail, subject, html })
      if (error) throw new Error(`Resend error: ${error.message}`)
    })

    return { sent: true }
  }
)

// ── 3. Order status change emails ─────────────────────────────────────────────

export const sendOrderStatusEmail = inngest.createFunction(
  { id: "send-order-status-email", retries: 2, triggers: [{ event: "order/status.changed" }] },
  async ({ event, step }) => {
    const { orderId, newStatus, customerEmail, customerName } = event.data as {
      orderId: string
      newStatus: string
      customerEmail: string
      customerName: string
    }

    // Only act on statuses we care about
    if (newStatus !== "shipped" && newStatus !== "delivered" && newStatus !== "completed") {
      return { skipped: true, reason: `Status ${newStatus} does not trigger email` }
    }

    await step.run("send-status-email", async () => {
      const order = await fetchOrderForEmail(orderId)
      if (!order) throw new Error(`Order ${orderId} not found`)

      const emailData = {
        orderNumber: order.order_number,
        customerName: customerName || "there",
        customerEmail,
        items: (order.order_items || []).map((i: any) => ({
          name: i.products?.name || "Item",
          quantity: i.quantity,
          size: i.size,
          unit_price: i.unit_price,
          total_price: i.total_price,
          thumbnail_url: i.products?.thumbnail_url,
        })),
        subtotal: order.subtotal || 0,
        shippingCost: order.shipping_cost || 0,
        total: order.total_amount || 0,
        shippingAddress: order.shipping_address || {},
      }

      const emailFn = newStatus === "shipped" ? outForDeliveryEmail
        : newStatus === "completed" ? orderCompletedEmail
        : deliveredEmail
      const { subject, html } = emailFn(emailData)

      const { error } = await resend.emails.send({ from: FROM, to: customerEmail, subject, html })
      if (error) throw new Error(`Resend error: ${error.message}`)
    })

    return { sent: true, status: newStatus }
  }
)

// ── Angle variations (nano-banana-2, 10 credits each) ────────────────────────

export const generateAngles = inngest.createFunction(
  { id: "ft-generate-angles", retries: 1, triggers: [{ event: "ft/angles.requested" }] },
  async ({ event, step }) => {
    const { jobId, prompt, inputImageUrls, clientId } = event.data as {
      jobId: string; prompt: string; inputImageUrls: string[]; clientId: string
    }

    const taskId = await step.run("create-angle-task", async () => {
      const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nano-banana-2",
          input: { prompt, image_input: inputImageUrls, aspect_ratio: "2:3", resolution: "1K", output_format: "jpg" },
        }),
      })
      const json = await res.json()
      if (json.code !== 200) throw new Error(json.msg || "kie.ai task creation failed")
      return json.data.taskId as string
    })

    await step.run("save-task-id", async () => {
      await supabaseAdmin.from("ai_content_jobs").update({ task_id: taskId, status: "processing" }).eq("id", jobId)
    })

    for (let i = 0; i < 40; i++) {
      await step.sleep(`angle-wait-${i}`, "20 seconds")
      const state = await step.run(`angle-poll-${i}`, async () => {
        const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        })
        return (await res.json()).data as { state: string; resultJson?: string; failMsg?: string }
      })
      if (state.state === "success") {
        const resultUrls = JSON.parse(state.resultJson || "{}").resultUrls || []
        await step.run("save-angle-success", async () => {
          await supabaseAdmin.from("ai_content_jobs").update({ status: "success", result_urls: resultUrls }).eq("id", jobId)
        })
        return { status: "success", resultUrls }
      }
      if (state.state === "fail") {
        await step.run("save-angle-failure", async () => {
          await supabaseAdmin.from("ai_content_jobs").update({ status: "failed", error_msg: state.failMsg || "Failed" }).eq("id", jobId)
          await refundCredit(clientId, jobId, CREDITS_PER_ANGLE)
        })
        return { status: "failed" }
      }
    }

    await step.run("angle-timeout", async () => {
      await supabaseAdmin.from("ai_content_jobs").update({ status: "failed", error_msg: "Timed out" }).eq("id", jobId)
      await refundCredit(clientId, jobId, CREDITS_PER_ANGLE)
    })
    return { status: "timeout" }
  }
)
