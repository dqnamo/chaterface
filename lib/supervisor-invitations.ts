import { getAppPublicUrl } from "@/lib/app-url";

const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareEmailApiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN;
const cloudflareEmailFrom = process.env.CLOUDFLARE_EMAIL_FROM;
const cloudflareEmailFromName =
  process.env.CLOUDFLARE_EMAIL_FROM_NAME ?? "Factoryplane";

type CloudflareEmailSendResponse = {
  errors?: { code?: number; message?: string }[];
  messages?: { code?: number; message?: string }[];
  result?: {
    delivered?: string[];
    permanent_bounces?: string[];
    queued?: string[];
  } | null;
  success?: boolean;
};

export function normalizeSupervisorEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendSupervisorInviteEmail({
  factoryId,
  factoryName,
  request,
  invitedByEmail,
  supervisorEmail,
}: {
  factoryId: string;
  factoryName: string;
  invitedByEmail?: string;
  request?: Request;
  supervisorEmail: string;
}) {
  if (!cloudflareAccountId) {
    return {
      skipped: true,
      reason: "CLOUDFLARE_ACCOUNT_ID is not configured",
    } as const;
  }

  if (!cloudflareEmailApiToken) {
    return {
      skipped: true,
      reason: "CLOUDFLARE_EMAIL_API_TOKEN is not configured",
    } as const;
  }

  if (!cloudflareEmailFrom) {
    return {
      skipped: true,
      reason: "CLOUDFLARE_EMAIL_FROM is not configured",
    } as const;
  }

  const factoryUrl = `${getAppPublicUrl(request)}/factory/${factoryId}`;
  const inviter = invitedByEmail
    ? `${invitedByEmail} invited you`
    : "You were invited";
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/email/sending/send`,
    {
      body: JSON.stringify({
        from: { address: cloudflareEmailFrom, name: cloudflareEmailFromName },
        html: [
          `<p>${escapeHtml(inviter)} to supervise <strong>${escapeHtml(
            factoryName,
          )}</strong> on Factoryplane.</p>`,
          `<p>Sign in with this email address to accept the invite:</p>`,
          `<p><a href="${escapeHtml(factoryUrl)}">Open ${escapeHtml(
            factoryName,
          )}</a></p>`,
        ].join(""),
        subject: `You were invited to supervise ${factoryName}`,
        text: [
          `${inviter} to supervise ${factoryName} on Factoryplane.`,
          "",
          "Sign in with this email address to accept the invite:",
          factoryUrl,
        ].join("\n"),
        to: supervisorEmail,
      }),
      headers: {
        Authorization: `Bearer ${cloudflareEmailApiToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const body = (await response
    .json()
    .catch(() => null)) as CloudflareEmailSendResponse | null;

  if (!response.ok || !body?.success) {
    throw new Error(getCloudflareEmailErrorMessage(body, response.status));
  }

  return {
    status: getCloudflareEmailStatus(body.result),
    skipped: false,
  } as const;
}

function getCloudflareEmailErrorMessage(
  body: CloudflareEmailSendResponse | null,
  status: number,
) {
  const errorMessage = body?.errors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join(", ");

  return errorMessage
    ? `Cloudflare Email Service error: ${errorMessage}`
    : `Cloudflare Email Service request failed with status ${status}`;
}

function getCloudflareEmailStatus(
  result: CloudflareEmailSendResponse["result"],
) {
  if (result?.permanent_bounces?.length) {
    return "permanent_bounce";
  }

  if (result?.queued?.length) {
    return "queued";
  }

  if (result?.delivered?.length) {
    return "delivered";
  }

  return "sent";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
