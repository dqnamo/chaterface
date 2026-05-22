import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { getStripePaymentLinkUrl } from "@/lib/stripe-billing.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type FactoryRecord = {
  id: string;
  owner?: { id?: string };
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId } = await context.params;
  const factory = await getOwnedFactory<FactoryRecord>(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  try {
    return Response.json({
      url: getStripePaymentLinkUrl({
        factoryId,
        ownerEmail: user.email,
      }),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Billing upgrade could not be started.",
      },
      { status: 500 },
    );
  }
}
