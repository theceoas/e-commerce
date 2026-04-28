import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest"
import { generateImage, sendOrderConfirmation, sendOrderStatusEmail } from "@/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateImage, sendOrderConfirmation, sendOrderStatusEmail],
})
