import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function BillingSuccessPage({ searchParams }: { searchParams?: { orderId?: string } }) {
  const user = await getCurrentUser();
  const orderId = typeof searchParams?.orderId === "string" ? searchParams.orderId : null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in required</h1>
        <p className="text-sm text-slate-600">Please sign in to view payment status.</p>
        <Link className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white" href="/signin">
          Sign in
        </Link>
      </div>
    );
  }

  const payment = orderId
    ? await prisma.payment.findUnique({
        where: { id: orderId },
      })
    : null;

  const isOwner = payment && (payment.userId === user.id || payment.organizationId === user.organizationId);
  const status = isOwner ? payment?.status : null;
  const isTopUp = Boolean(payment && payment.planId === "topup");
  if (!orderId || !payment || !isOwner) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Payment not found</h1>
        <p className="text-sm text-slate-600">We could not locate this payment. Please try again.</p>
        <Link className="inline-flex rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700" href="/app/settings/billing">
          Back to billing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        {status === "succeeded" ? "Payment succeeded" : status === "canceled" ? "Payment canceled" : "Payment pending"}
      </h1>
      <p className="text-sm text-slate-600">
        {status === "succeeded"
          ? isTopUp
            ? "Thanks! Your balance will be updated shortly."
            : "Thanks! Billing access has been updated."
          : status === "canceled"
            ? "Please try again or choose another payment method."
            : "We are verifying the payment status. Refresh in a minute."}
      </p>
      <Link className="inline-flex rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700" href="/app/settings/billing">
        Back to billing
      </Link>
    </div>
  );
}
