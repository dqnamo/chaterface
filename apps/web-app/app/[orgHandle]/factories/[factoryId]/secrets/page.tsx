"use client";

import db from "@/instant.client";
import { useParams } from "next/navigation";
import { useState } from "react";

const getApiUrl = (path: string) => {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
	return new URL(path, apiBaseUrl).toString();
};

export default function SecretsPage() {
	const { factoryId } = useParams();
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const { data } = db.useQuery({
		secrets: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});
	const secrets = data?.secrets;

	const [name, setName] = useState("");
	const [value, setValue] = useState("");
	const [error, setError] = useState<string>();
	const [isCreating, setIsCreating] = useState(false);

	const createSecret = async () => {
		setError(undefined);

		if (!user?.refresh_token) {
			setError("You must be signed in to create a secret");
			return;
		}

		setIsCreating(true);

		try {
			const response = await fetch(getApiUrl("/secrets/create"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					token: user.refresh_token,
				},
				body: JSON.stringify({
					factoryId: currentFactoryId,
					name,
					value,
				}),
			});

			if (!response.ok) {
				throw new Error(await getErrorMessage(response));
			}

			setName("");
			setValue("");
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to create secret",
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div>
			<h1>Secrets</h1>
			<ul>
				{secrets?.map((secret) => (
					<li key={secret.id}>{secret.name}</li>
				))}
			</ul>

			<div className="flex flex-col gap-4">
				<h2>Create Secret</h2>
				<input
					type="text"
					placeholder="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Value"
					value={value}
					onChange={(e) => setValue(e.target.value)}
				/>
				{error ? <p>{error}</p> : null}
				<button
					type="button"
					disabled={isCreating}
					onClick={() => {
						createSecret();
					}}
				>
					{isCreating ? "Creating..." : "Create"}
				</button>
			</div>
		</div>
	);
}

const getErrorMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { error?: unknown };

		if (typeof body.error === "string") {
			return body.error;
		}
	} catch {
		return "Failed to create secret";
	}

	return "Failed to create secret";
};
