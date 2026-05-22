export const BASIC_BILLING_PLAN = "basic";
export const PRO_BILLING_PLAN = "pro";
export const BASIC_SUPERVISOR_LIMIT = 3;
export const FACTORY_TRIAL_DAYS = 14;

export type BillingPlan = typeof BASIC_BILLING_PLAN | typeof PRO_BILLING_PLAN;

export type FactoryBillingFields = {
  billingPlan?: string;
  trialEndsAt?: string;
};

export function getTrialEndsAt(createdAt: Date) {
  const trialEndsAt = new Date(createdAt);

  trialEndsAt.setDate(trialEndsAt.getDate() + FACTORY_TRIAL_DAYS);

  return trialEndsAt.toISOString();
}

export function getEffectiveBillingPlan(
  factory: FactoryBillingFields | undefined,
  now = new Date(),
): BillingPlan {
  if (
    factory?.billingPlan === PRO_BILLING_PLAN ||
    isFactoryTrialing(factory, now)
  ) {
    return PRO_BILLING_PLAN;
  }

  return BASIC_BILLING_PLAN;
}

export function isFactoryTrialing(
  factory: FactoryBillingFields | undefined,
  now = new Date(),
) {
  if (!factory?.trialEndsAt) {
    return false;
  }

  const trialEndsAt = Date.parse(factory.trialEndsAt);

  return Number.isFinite(trialEndsAt) && trialEndsAt > now.getTime();
}
