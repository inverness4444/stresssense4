import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleStripeWebhookEvent, verifyStripeSignature } from "@/lib/billing";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = (await headers()).get("stripe-signature");
  try {
    const event = verifyStripeSignature(rawBody, sig);
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
