import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "favethingsng",
  signingKey: process.env.INNGEST_SIGNING_KEY?.trim() || undefined,
})
