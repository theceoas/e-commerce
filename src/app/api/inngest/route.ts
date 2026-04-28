import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest"
import { generateImage, sendOrderConfirmation, sendOrderStatusEmail } from "@/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  functions: [generateImage, sendOrderConfirmation, sendOrderStatusEmail],
})
