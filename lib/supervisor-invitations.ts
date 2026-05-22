import { Resend } from "resend";
import { getAppPublicUrl } from "@/lib/app-url";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Factoryplane <onboarding@resend.dev>";

let resendClient: Resend | null = null;

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

  resendClient ??= new Resend(resendApiKey);

  const factoryUrl = `${getAppPublicUrl(request)}/factory/${factoryId}`;
  const inviter = invitedByEmail
    ? `${invitedByEmail} invited you`
    : "You were invited";
  const { data, error } = await resendClient.emails.send({
    from: resendFromEmail,
    to: [supervisorEmail],
    subject: `You were invited to supervise ${factoryName}`,
    text: [
      `${inviter} to supervise ${factoryName} on Factoryplane.`,
      "",
      "Sign in with this email address to accept the invite:",
      factoryUrl,
    ].join("\n"),
    html: [
      `<p>${escapeHtml(inviter)} to supervise <strong>${escapeHtml(
        factoryName,
      )}</strong> on Factoryplane.</p>`,
      `<p>Sign in with this email address to accept the invite:</p>`,
      `<p><a href="${escapeHtml(factoryUrl)}">Open ${escapeHtml(
        factoryName,
      )}</a></p>`,
    ].join(""),
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    emailId: data?.id,
    skipped: false,
  } as const;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
