export type StripeCheckoutSessionBillingFields = {
  client_reference_id?: null | string;
  subscription?: { id?: null | string } | null | string;
};

export function getCheckoutSessionBillingContext(
  session: StripeCheckoutSessionBillingFields,
) {
  const factoryId = session.client_reference_id?.trim();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription.trim()
      : session.subscription?.id?.trim();

  if (!factoryId || !subscriptionId) {
    return null;
  }

  return { factoryId, subscriptionId };
}

export function isSupportedStripeBillingEvent(eventType: string) {
  return (
    eventType === "checkout.session.completed" ||
    eventType === "customer.subscription.created" ||
    eventType === "customer.subscription.deleted" ||
    eventType === "customer.subscription.updated"
  );
}
