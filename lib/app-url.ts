export function getAppPublicUrl(request?: Request) {
  const configuredUrl = process.env.APP_PUBLIC_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (!request) {
    throw new Error("APP_PUBLIC_URL is required.");
  }

  const url = new URL(request.url);

  return url.origin.replace(/\/$/, "");
}

export function getMcpCallbackUrl({
  factoryId,
  request,
}: {
  factoryId: string;
  request: Request;
}) {
  return `${getAppPublicUrl(request)}/api/factories/${factoryId}/mcp/oauth/callback`;
}

export function getFactoryMcpGatewayUrl() {
  return `${getAppPublicUrl()}/api/mcp/factory`;
}
