import { z } from "zod";

export const postmarkInboundSchema = z.object({
  From: z.string(),
  FromName: z.string().optional(),
  Subject: z.string(),
  MessageID: z.string().optional(),
  Date: z.string().optional(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
  Headers: z
    .array(z.object({ Name: z.string(), Value: z.string() }))
    .optional(),
});

export type PostmarkInbound = z.infer<typeof postmarkInboundSchema>;
