import {
  retrieveStripeSubscription,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeSubscription,
  updateFactoryBillingFromStripeSubscription,
  updateFactoryBillingFromSubscriptionEvent,
  verifyStripeWebhookEvent,
} from "@/lib/stripe-billing.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();

  let event: StripeEvent;

  try {
    event = verifyStripeWebhookEvent({
      body,
      signatureHeader: request.headers.get("stripe-signature"),
    });
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.id,
          event.data.object as StripeCheckoutSession,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.deleted":
      case "customer.subscription.updated":
        await updateFactoryBillingFromSubscriptionEvent({
          eventId: event.id,
          subscription: event.data.object as StripeSubscription,
        });
        break;
      default:
        break;
    }

    return new Response("ok");
  } catch (error) {
    console.error("[stripe-webhook] Processing failed", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook could not be processed.",
      },
      { status: 500 },
    );
  }
}

async function handleCheckoutSessionCompleted(
  eventId: string,
  session: StripeCheckoutSession,
) {
  const factoryId = session.client_reference_id?.trim();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription.trim()
      : session.subscription?.id;

  if (!factoryId || !subscriptionId) {
    console.warn("[stripe-webhook] Checkout session missing billing context", {
      checkoutSessionId: session.id,
      factoryId,
      subscriptionId,
    });
    return;
  }

  const subscription = await retrieveStripeSubscription(subscriptionId);

  await updateFactoryBillingFromStripeSubscription({
    eventId,
    factoryId,
    subscription,
  });
}
