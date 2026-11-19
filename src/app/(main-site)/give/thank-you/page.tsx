import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { SuccessCelebration } from "@/app/components/success-celebration";
import { settlePaymentIntent } from "@/lib/payments/settle";
import { formatMoney } from "@/lib/format";

function ordinal(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

export const metadata = { title: "Thank you | Phanerosis Prayer Network", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Paystack sends the giver back here with ?reference=…. The webhook normally
 * settles the payment first; settling again here is a no-op, and covers the
 * case where the webhook is slow or misconfigured.
 */
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref;
  const result = reference ? await settlePaymentIntent(reference) : ({ status: "unknown" } as const);

  const view =
    result.status === "completed"
      ? {
          icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
          title: "Thank you for your gift!",
          body:
            `We received ${formatMoney(result.amount)} towards ${result.givenTo}. A receipt is on its way to your email.` +
            (result.monthly?.active
              ? ` Your monthly gift is set up — we'll charge your card on the ${ordinal(result.monthly.dayOfMonth)} of each month. You can cancel anytime from your member portal.`
              : result.monthly
                ? " We couldn't save this card for monthly giving, so this was a one-time gift. You can try again with a different card."
                : ""),
        }
      : result.status === "pending"
        ? {
            icon: <Clock className="h-12 w-12 text-amber-500" />,
            title: "Your payment is processing",
            body: "Mobile Money payments can take a minute to confirm. You'll get an email receipt once it clears — no need to pay again.",
          }
        : result.status === "failed"
          ? {
              icon: <XCircle className="h-12 w-12 text-red-500" />,
              title: "The payment didn't go through",
              body: "No money was taken. You can try again, or use a different payment method.",
            }
          : {
              icon: <XCircle className="h-12 w-12 text-gray-400" />,
              title: "We couldn't find that payment",
              body: "If you were charged, please contact us with your payment reference.",
            };

  return (
    <main className="bg-white pt-32 pb-24">
      <div className="container mx-auto max-w-xl px-4 text-center">
        {result.status === "completed" ? (
          <SuccessCelebration title={<h1 className="text-2xl font-bold">{view.title}</h1>}>
            <p>{view.body}</p>
          </SuccessCelebration>
        ) : (
          <>
            <div className="flex justify-center">{view.icon}</div>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">{view.title}</h1>
            <p className="mt-3 text-gray-700">{view.body}</p>
          </>
        )}
        {reference && <p className="mt-2 text-xs text-gray-500">Reference: {reference}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/give" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium hover:border-gray-500">
            Give again
          </Link>
          <Link href="/" className="rounded-full bg-crayola px-5 py-2.5 text-sm font-medium text-white hover:bg-crayola/90">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
