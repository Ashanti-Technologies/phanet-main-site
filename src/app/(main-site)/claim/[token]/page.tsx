import { redirect } from "next/navigation";
import {
  consumeClaimToken,
  getClaimTokenPreview,
} from "@/actions/member-claim";

export const dynamic = "force-dynamic";

export default async function ClaimConsumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getClaimTokenPreview(token);

  if (preview.status !== "valid") {
    const reason = preview.status === "expired" ? "expired" : "invalid";
    redirect(`/claim?error=${reason}`);
  }

  try {
    await consumeClaimToken(token);
  } catch {
    redirect("/claim?error=invalid");
  }

  redirect("/me/profile?claimed=1");
}
