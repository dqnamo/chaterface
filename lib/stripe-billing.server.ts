import "server-only";

import Stripe from "stripe";
import { getAppPublicUrl } from "@/lib/app-url";
import { BASIC_BILLING_PLAN, PRO_BILLING_PLAN } from "@/lib/billing";
import { getAdminDb } from "@/lib/db.server";

type FactoryForSeats = {
  owner?: { id?: string };
  supervisors?: { status?: string }[];
};

let stripeClient: Stripe | null = null;

export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeEvent = Stripe.Event;
export type StripeSubscription = Stripe.Subscription;

export function getStripePaymentLinkUrl({
  factoryId,
  ownerEmail,
}: {
  factoryId: string;
  ownerEmail?: null | string;
}) {
  const configuredUrl = process.env.STRIPE_PRO_PAYMENT_LINK_URL?.trim();

  if (!configuredUrl) {
    throw new Error("Missing STRIPE_PRO_PAYMENT_LINK_URL");
  }

  const url = new URL(configuredUrl);

  url.searchParams.set("client_reference_id", factoryId);

  if (ownerEmail) {
    url.searchParams.set("prefilled_email", ownerEmail);
  }

  return url.toString();
}

export function verifyStripeWebhookEvent({
  body,
  signatureHeader,
}: {
  body: string;
  signatureHeader: null | string;
}) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  if (!signatureHeader) {
    throw new Error("Missing Stripe signature");
  }

  return getStripe().webhooks.constructEvent(
    body,
    signatureHeader,
    webhookSecret,
  );
}

export async function createStripeBillingPortalSession({
  customerId,
  factoryId,
  request,
}: {
  customerId: string;
  factoryId: string;
  request: Request;
}) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppPublicUrl(request)}/factory/${factoryId}/settings#billing`,
  });
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

export async function syncFactoryStripeSeatQuantity(factoryId: string) {
  const db = getAdminDb();
  const result = await db.query({
    factoryStripeBillings: {
      $: { where: { id: factoryId } },
      factory: {
        owner: {},
        supervisors: {},
      },
    },
  });
  const billing = result.factoryStripeBillings[0] as
    | (StripeBillingRecord & {
        factory?: FactoryForSeats;
      })
    | undefined;

  if (
    !billing?.stripeSubscriptionId ||
    !isPaidStripeStatus(billing.stripeSubscriptionStatus)
  ) {
    return;
  }

  const seatCount = getFactorySeatCount(billing.factory);
  const subscriptionItemId =
    billing.stripeSubscriptionItemId ??
    (await retrieveStripeSubscription(billing.stripeSubscriptionId)).items
      .data[0]?.id;

  if (!subscriptionItemId) {
    return;
  }

  await getStripe().subscriptionItems.update(subscriptionItemId, {
    quantity: seatCount,
  });

  await db.transact(
    db.tx.factoryStripeBillings[factoryId].update({
      stripeSubscriptionItemId: subscriptionItemId,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function updateFactoryBillingFromStripeSubscription({
  eventId,
  factoryId,
  subscription,
}: {
  eventId: string;
  factoryId: string;
  subscription: StripeSubscription;
}) {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const status = subscription.status ?? "unknown";
  const customerId = getStripeObjectId(subscription.customer);
  const subscriptionItem = subscription.items.data[0];
  const isPaid = isPaidStripeStatus(status);
  const existingBillingResult = await db.query({
    factoryStripeBillings: {
      $: { where: { id: factoryId } },
    },
  });
  const existingBilling = existingBillingResult.factoryStripeBillings[0] as
    | { createdAt?: string }
    | undefined;

  await db.transact([
    db.tx.factories[factoryId].update({
      billingPlan: isPaid ? PRO_BILLING_PLAN : BASIC_BILLING_PLAN,
      billingUpdatedAt: now,
    }),
    db.tx.factoryStripeBillings[factoryId].update({
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      createdAt: existingBilling?.createdAt ?? now,
      currentPeriodEnd: subscriptionItem?.current_period_end
        ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
        : null,
      lastWebhookEventId: eventId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: subscriptionItem?.id,
      stripeSubscriptionStatus: status,
      updatedAt: now,
    }),
    db.tx.factoryStripeBillings[factoryId].link({
      factory: factoryId,
    }),
  ]);

  if (isPaid) {
    await syncFactoryStripeSeatQuantity(factoryId);
  }
}

export async function updateFactoryBillingFromSubscriptionEvent({
  eventId,
  subscription,
}: {
  eventId: string;
  subscription: StripeSubscription;
}) {
  const db = getAdminDb();
  const result = await db.query({
    factoryStripeBillings: {
      $: { where: { stripeSubscriptionId: subscription.id } },
      factory: {},
    },
  });
  const billing = result.factoryStripeBillings[0] as
    | (StripeBillingRecord & { factory?: { id?: string } })
    | undefined;
  const factoryId = billing?.factory?.id;

  if (!factoryId) {
    return false;
  }

  await updateFactoryBillingFromStripeSubscription({
    eventId,
    factoryId,
    subscription,
  });

  return true;
}

function getFactorySeatCount(factory: FactoryForSeats | undefined) {
  const supervisorCount = (factory?.supervisors ?? []).filter(
    (supervisor) => supervisor.status !== "removed",
  ).length;

  return 1 + supervisorCount;
}

function getStripeObjectId(value: StripeSubscription["customer"]) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id;
}

function isPaidStripeStatus(status?: string) {
  return status === "active" || status === "trialing";
}

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeClient ??= new Stripe(stripeSecretKey);

  return stripeClient;
}

type StripeBillingRecord = {
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  stripeSubscriptionStatus?: string;
};
