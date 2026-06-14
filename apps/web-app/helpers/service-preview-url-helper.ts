const previewsDomain =
	process.env.NEXT_PUBLIC_FACTORYPLANE_PREVIEWS_DOMAIN ??
	"previews.factoryplane.com";

type PublicServiceUrlInput = {
	serviceId?: string | null;
	url?: string | null;
};

export function getPublicServiceUrl({ serviceId, url }: PublicServiceUrlInput) {
	if (url && !isE2bUrl(url)) {
		return url;
	}

	return serviceId ? `https://${serviceId}.${previewsDomain}` : undefined;
}

function isE2bUrl(url: string) {
	try {
		return new URL(url).hostname.endsWith(".e2b.app");
	} catch {
		return url.includes(".e2b.app");
	}
}
