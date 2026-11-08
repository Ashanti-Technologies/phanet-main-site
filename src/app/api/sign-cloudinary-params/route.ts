import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";

export const runtime = "nodejs";

// Cloudinary signature: sorted `k=v` pairs joined by `&`, + API secret, SHA-1.
// https://cloudinary.com/documentation/authentication_signatures
function signParams(
  params: Record<string, unknown>,
  secret: string,
): string {
  const toSign = Object.keys(params)
    .filter((k) => !["file", "cloud_name", "resource_type", "api_key"].includes(k))
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => {
      const v = params[k];
      return `${k}=${Array.isArray(v) ? v.join(",") : String(v)}`;
    })
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const { paramsToSign } = (await req.json().catch(() => ({}))) as {
    paramsToSign?: Record<string, unknown>;
  };
  if (!paramsToSign || typeof paramsToSign !== "object") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return NextResponse.json({ signature: signParams(paramsToSign, secret) });
}
