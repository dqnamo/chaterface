const CACHE_NAME = "chaterface-v1";
const APP_SHELL = ["/", "/offline.html", "/icons/icon-192.png"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalDevelopment = LOCAL_HOSTS.has(self.location.hostname);

if (isLocalDevelopment) {
	self.addEventListener("install", (event) => {
		event.waitUntil(self.skipWaiting());
	});

	self.addEventListener("activate", (event) => {
		event.waitUntil(
			caches
				.keys()
				.then((keys) =>
					Promise.all(
						keys
							.filter((key) => key.startsWith("chaterface-"))
							.map((key) => caches.delete(key)),
					),
				)
				.then(() => self.registration.unregister())
				.then(() => self.clients.claim()),
		);
	});
} else {
	self.addEventListener("install", (event) => {
		event.waitUntil(
			caches
				.open(CACHE_NAME)
				.then((cache) => cache.addAll(APP_SHELL))
				.then(() => self.skipWaiting()),
		);
	});

	self.addEventListener("activate", (event) => {
		event.waitUntil(
			caches
				.keys()
				.then((keys) =>
					Promise.all(
						keys
							.filter((key) => key !== CACHE_NAME)
							.map((key) => caches.delete(key)),
					),
				)
				.then(() => self.clients.claim()),
		);
	});

	self.addEventListener("fetch", (event) => {
		const { request } = event;

		if (request.method !== "GET") {
			return;
		}

		const url = new URL(request.url);

		if (url.origin !== self.location.origin) {
			return;
		}

		if (request.mode === "navigate") {
			event.respondWith(
				fetch(request)
					.then((response) => {
						const responseClone = response.clone();
						caches
							.open(CACHE_NAME)
							.then((cache) => cache.put(request, responseClone));
						return response;
					})
					.catch(() =>
						caches.match(request).then((cachedResponse) => {
							return cachedResponse || caches.match("/offline.html");
						}),
					),
			);
			return;
		}

		if (
			url.pathname.startsWith("/_next/static/") ||
			url.pathname.startsWith("/icons/")
		) {
			event.respondWith(
				caches.match(request).then((cachedResponse) => {
					return (
						cachedResponse ||
						fetch(request).then((response) => {
							const responseClone = response.clone();
							caches
								.open(CACHE_NAME)
								.then((cache) => cache.put(request, responseClone));
							return response;
						})
					);
				}),
			);
		}
	});
}
