import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectiveBillingPlan,
  getFactorySeatCount,
  isPaidStripeStatus,
} from "../../lib/billing.ts";
import {
  getCheckoutSessionBillingContext,
  isSupportedStripeBillingEvent,
} from "../../lib/stripe-webhook-events.ts";

test("billing plan treats active trials as pro access", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");

  assert.equal(
    getEffectiveBillingPlan(
      { billingPlan: "basic", trialEndsAt: "2026-05-25T12:00:00.000Z" },
      now,
    ),
    "pro",
  );
  assert.equal(
    getEffectiveBillingPlan(
      { billingPlan: "basic", trialEndsAt: "2026-05-23T12:00:00.000Z" },
      now,
    ),
    "basic",
  );
});

test("seat counts include the owner and non-removed supervisors", () => {
  assert.equal(
    getFactorySeatCount({
      owner: { id: "owner" },
      supervisors: [
        { status: "active" },
        { status: "invited" },
        { status: "removed" },
      ],
    }),
    3,
  );
});

test("paid Stripe statuses are explicit", () => {
  assert.equal(isPaidStripeStatus("active"), true);
  assert.equal(isPaidStripeStatus("trialing"), true);
  assert.equal(isPaidStripeStatus("past_due"), false);
  assert.equal(isPaidStripeStatus("canceled"), false);
});

test("checkout sessions expose the factory and subscription ids needed by webhooks", () => {
  assert.deepEqual(
    getCheckoutSessionBillingContext({
      client_reference_id: " factory-123 ",
      subscription: { id: " sub-123 " },
    }),
    {
      factoryId: "factory-123",
      subscriptionId: "sub-123",
    },
  );
  assert.deepEqual(
    getCheckoutSessionBillingContext({
      client_reference_id: "factory-123",
      subscription: " sub-456 ",
    }),
    {
      factoryId: "factory-123",
      subscriptionId: "sub-456",
    },
  );
  assert.equal(
    getCheckoutSessionBillingContext({
      client_reference_id: "",
      subscription: "sub-456",
    }),
    null,
  );
});

test("only billing-relevant Stripe events are handled", () => {
  assert.equal(
    isSupportedStripeBillingEvent("checkout.session.completed"),
    true,
  );
  assert.equal(
    isSupportedStripeBillingEvent("customer.subscription.updated"),
    true,
  );
  assert.equal(isSupportedStripeBillingEvent("invoice.created"), false);
});
