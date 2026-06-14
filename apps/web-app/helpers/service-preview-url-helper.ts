const previewsDomain =
	process.env.NEXT_PUBLIC_FACTORYPLANE_PREVIEWS_DOMAIN ??
	"previews.factoryplane.com";

type PublicServiceUrlInput = {
	serviceId?: string | null;
	url?: string | null;
};

export function getPublicServiceUrl({ serviceId, url }: PublicServiceUrlInput) {
	if (url && !isSandboxProviderUrl(url)) {
		return url;
	}

	return serviceId ? `https://${serviceId}.${previewsDomain}` : undefined;
}

function isSandboxProviderUrl(url: string) {
	try {
		const hostname = new URL(url).hostname;
		return hostname.endsWith(".box.upstash.com") || hostname.includes(".box.");
	} catch {
		return url.includes(".box.");
	}
}
