import "server-only";
import Stripe from "stripe";
import { env } from "@/config/env";
import { prisma } from "./prisma";
import { getBaseUrl } from "./url";
import { normalizeSeats } from "@/config/pricing";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export async function createOrUpdateCustomer(organizationId: string, name: string) {
  if (!stripe) throw new Error("Stripe not configured");
  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (subscription?.stripeCustomerId) {
    await stripe.customers.update(subscription.stripeCustomerId, { name });
    return subscription.stripeCustomerId;
  }
  const customer = await stripe.customers.create({ name });
  await prisma.subscription.upsert({
    where: { organizationId },
    update: { stripeCustomerId: customer.id },
    create: { organizationId, status: "incomplete", stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createCheckoutSession(organizationId: string, seats: number) {
  if (!stripe) throw new Error("Stripe not configured");
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("Pricing not configured");
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error("Organization not found");
  const quantity = normalizeSeats(seats);

  const customerId = await createOrUpdateCustomer(organizationId, org.name);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity }],
    customer: customerId,
    success_url: `${getBaseUrl()}/app/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/app/billing`,
  });
  return session.url;
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const legacyCurrentPeriodEnd = (sub as any).current_period_end as number | undefined;
      const legacyTrialEnd = (sub as any).trial_end as number | undefined;
      const orgSub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (orgSub) {
        await prisma.subscription.update({
          where: { organizationId: orgSub.organizationId },
          data: {
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodEnd: legacyCurrentPeriodEnd ? new Date(legacyCurrentPeriodEnd * 1000) : null,
            trialEndsAt: legacyTrialEnd ? new Date(legacyTrialEnd * 1000) : null,
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: sub.id },
      });
      if (orgSub) {
        await prisma.subscription.update({
          where: { organizationId: orgSub.organizationId },
          data: { status: "canceled" },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const orgSub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: inv.customer as string },
      });
      if (orgSub) {
        await prisma.subscription.update({
          where: { organizationId: orgSub.organizationId },
          data: { status: "past_due" },
        });
      }
      break;
    }
    default:
      break;
  }
}

export function verifyStripeSignature(rawBody: string, sig: string | null) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe webhook not configured");
  return stripe.webhooks.constructEvent(rawBody, sig ?? "", env.STRIPE_WEBHOOK_SECRET);
}
