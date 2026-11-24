import { z } from "zod";

const smsProviderKey = z.enum(["arkesel", "hubtel"]);

export const smsProvidersSchema = z
  .array(z.object({ key: smsProviderKey, enabled: z.boolean() }))
  .min(1)
  .refine((list) => new Set(list.map((s) => s.key)).size === list.length, "Duplicate provider");

export const testSmsSchema = z.object({
  provider: smsProviderKey,
  phone: z.string().trim().min(9, "Enter a phone number"),
});

export type SmsProvidersInput = z.infer<typeof smsProvidersSchema>;
export type TestSmsInput = z.infer<typeof testSmsSchema>;
