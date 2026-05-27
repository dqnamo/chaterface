const defaultAppPublicUrl = "https://app.factoryplane.com";

export function getAppPublicUrl(request?: Request) {
  const configuredUrl = process.env.APP_PUBLIC_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (request) {
    const url = new URL(request.url);

    return url.origin.replace(/\/$/, "");
  }

  return defaultAppPublicUrl;
}

export function getAppPublicHost() {
  return new URL(getAppPublicUrl()).host;
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
