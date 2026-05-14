import { NextResponse } from "next/server";
import {
  consumeClaimToken,
  getClaimTokenPreview,
} from "@/actions/member-claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consuming the claim token writes a session cookie via Better Auth. Cookie
 * writes are not allowed inside Server Component render, so this lives in a
 * Route Handler instead.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const origin = new URL(request.url).origin;
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  const preview = await getClaimTokenPreview(token);
  if (preview.status === "expired") return to("/claim?error=expired");
  if (preview.status === "consumed")
    return to("/auth/login?notice=already-claimed");
  if (preview.status === "linked")
    return to("/auth/login?notice=already-linked");
  if (preview.status !== "valid") return to("/claim?error=invalid");

  try {
    const result = await consumeClaimToken(token);
    if (result.kind === "existing-account") {
      const sp = new URLSearchParams({
        email: result.email,
        notice: "existing-account",
      });
      return to(`/auth/login?${sp.toString()}`);
    }
    return to("/me/profile?claimed=1");
  } catch (err) {
    console.error("[claim] consume failed:", err);
    return to("/claim?error=invalid");
  }
}
