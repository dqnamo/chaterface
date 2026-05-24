import { type ErrorResponse, Resend } from "resend";
import { getAppPublicUrl } from "@/lib/app-url";

const resendApiKey = process.env.RESEND_API_KEY;
const resendEmailFrom = process.env.RESEND_EMAIL_FROM;
const resendEmailFromName =
  process.env.RESEND_EMAIL_FROM_NAME ?? "Factoryplane";

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
  if (!resendApiKey) {
    return {
      skipped: true,
      reason: "RESEND_API_KEY is not configured",
    } as const;
  }

  if (!resendEmailFrom) {
    return {
      skipped: true,
      reason: "RESEND_EMAIL_FROM is not configured",
    } as const;
  }

  const factoryUrl = `${getAppPublicUrl(request)}/factory/${factoryId}`;
  const inviter = invitedByEmail
    ? `${invitedByEmail} invited you`
    : "You were invited";
  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({
    from: formatFromAddress(resendEmailFrom, resendEmailFromName),
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
  });

  if (error) {
    throw new Error(getResendEmailErrorMessage(error));
  }

  return {
    id: data.id,
    status: "sent",
    skipped: false,
  } as const;
}

function getResendEmailErrorMessage(error: ErrorResponse) {
  return error.statusCode
    ? `Resend email error (${error.statusCode} ${error.name}): ${error.message}`
    : `Resend email error (${error.name}): ${error.message}`;
}

function formatFromAddress(address: string, name: string) {
  const safeAddress = address.trim().replaceAll(/[\r\n]/g, "");
  const safeName = name.trim().replaceAll(/[\r\n]/g, " ");

  return safeName ? `${safeName} <${safeAddress}>` : safeAddress;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
