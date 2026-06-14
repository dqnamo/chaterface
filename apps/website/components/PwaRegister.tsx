"use client";

import { useEffect } from "react";

export default function PwaRegister() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		if (process.env.NODE_ENV !== "production") {
			navigator.serviceWorker
				.getRegistrations()
				.then((registrations) =>
					Promise.all(
						registrations.map((registration) => registration.unregister()),
					),
				)
				.catch(() => {
					// PWA cleanup should never block local development.
				});

			if ("caches" in window) {
				caches
					.keys()
					.then((cacheNames) =>
						Promise.all(
							cacheNames
								.filter((cacheName) => cacheName.startsWith("factoryplane-"))
								.map((cacheName) => caches.delete(cacheName)),
						),
					)
					.catch(() => {
						// Cache cleanup should never block local development.
					});
			}

			return;
		}

		const registerServiceWorker = async () => {
			try {
				await navigator.serviceWorker.register("/sw.js");
			} catch {
				// PWA support should never block the app shell.
			}
		};

		registerServiceWorker();
	}, []);

	return null;
}
