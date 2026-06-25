export async function processEventWorkflow(payload: { eventId: string }) {
	"use workflow";

	await postInternalWorkflow("process-event", payload);
}

async function postInternalWorkflow(
	workflow: "process-event",
	payload: { eventId: string },
) {
	"use step";

	const response = await fetch(
		new URL(`/api/internal/workflows/${workflow}`, getWebAppOrigin()),
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-chaterface-internal-workflow-secret": getInternalWorkflowSecret(),
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw new Error(
			`Internal workflow ${workflow} failed with ${response.status}: ${await response.text()}`,
		);
	}
}

const getWebAppOrigin = () => {
	const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

	if (configured) {
		return configured.replace(/\/+$/, "");
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return `http://localhost:${process.env.PORT ?? "3001"}`;
};

const getInternalWorkflowSecret = () => {
	const secret =
		process.env.WORKFLOW_INTERNAL_SECRET?.trim() ??
		process.env.SECRET_ENCRYPTION_KEY?.trim();

	if (!secret) {
		throw new Error(
			"WORKFLOW_INTERNAL_SECRET or SECRET_ENCRYPTION_KEY is required to start internal workflows.",
		);
	}

	return secret;
};
