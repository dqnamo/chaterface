"use client";

import { useEffect, useState } from "react";

export function ServicePreviewFrame({
	className = "h-full w-full",
	serviceId,
	serviceName,
	userToken,
}: {
	className?: string;
	serviceId: string;
	serviceName: string;
	userToken: string | undefined;
}) {
	const [src, setSrc] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!userToken) {
			setSrc(null);
			return;
		}

		let cancelled = false;

		const createPreviewSession = async () => {
			setError(null);

			try {
				const response = await fetch("/api/previews/session", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${userToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ serviceId }),
				});

				if (!response.ok) {
					const errorMessage = await getPreviewSessionError(response);
					throw new Error(errorMessage);
				}

				const data = await response.json();

				if (!cancelled) {
					setSrc(typeof data.url === "string" ? data.url : null);
				}
			} catch (error) {
				if (!cancelled) {
					setError(
						error instanceof Error
							? error.message
							: "Failed to create preview session",
					);
				}
			}
		};

		createPreviewSession();

		return () => {
			cancelled = true;
		};
	}, [serviceId, userToken]);

	if (error) {
		return (
			<div className="flex h-full items-center justify-center text-xs text-red-10">
				{error}
			</div>
		);
	}

	if (!src) {
		return (
			<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
				Loading preview...
			</div>
		);
	}

	return (
		<iframe src={src} title={`${serviceName} preview`} className={className} />
	);
}

async function getPreviewSessionError(response: Response) {
	try {
		const data = await response.json();

		if (typeof data.message === "string") {
			return data.message;
		}
	} catch {
		return "Failed to create preview session";
	}

	return "Failed to create preview session";
}
