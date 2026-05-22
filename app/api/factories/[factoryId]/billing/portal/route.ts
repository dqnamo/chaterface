import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { createStripeBillingPortalSession } from "@/lib/stripe-billing.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type FactoryRecord = {
  owner?: { id?: string };
  stripeBilling?: {
    stripeCustomerId?: string;
  };
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId } = await context.params;
  const factory = await getOwnedFactory<FactoryRecord>(factoryId, user, {
    stripeBilling: {},
  });
  const customerId = factory?.stripeBilling?.stripeCustomerId;

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  if (!customerId) {
    return Response.json(
      { error: "No Stripe customer is linked to this factory." },
      { status: 404 },
    );
  }

  try {
    const session = await createStripeBillingPortalSession({
      customerId,
      factoryId,
      request,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a billing portal URL.");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Billing portal could not be opened.",
      },
      { status: 500 },
    );
  }
}
