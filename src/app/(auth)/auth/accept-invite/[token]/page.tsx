import Link from "next/link";
import { getMemberInvitePreview } from "@/actions/member-invites";
import { AcceptInviteForm } from "./_components/accept-invite-form";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getMemberInvitePreview(token);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-mikado-yellow text-lg font-bold text-black">
            PN
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Accept invite
          </h1>
          {preview.status === "valid" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Set up portal access for {preview.memberName} using{" "}
              {preview.email}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              This invite is {preview.status}. Ask a PHANET admin for a new
              link.
            </p>
          )}
        </div>
        {preview.status === "valid" ? (
          <AcceptInviteForm token={token} />
        ) : (
          <Link
            href="/auth/login"
            className="block rounded-md border p-3 text-center text-sm font-medium hover:bg-muted"
          >
            Go to member login
          </Link>
        )}
      </div>
    </main>
  );
}
