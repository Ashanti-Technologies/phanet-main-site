import { z } from "zod";

export const startClaimByEmailSchema = z.object({
  email: z
    .email("Enter a valid email")
    .trim()
    .min(1, "Email is required")
    .max(200)
    .transform((value) => value.toLowerCase()),
});

export const startClaimByPhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(6, "Enter the phone number on file")
    .max(40),
});

export const verifyClaimOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(6)
    .max(40),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type StartClaimByEmailInput = z.input<typeof startClaimByEmailSchema>;
export type StartClaimByPhoneInput = z.input<typeof startClaimByPhoneSchema>;
export type VerifyClaimOtpInput = z.input<typeof verifyClaimOtpSchema>;
