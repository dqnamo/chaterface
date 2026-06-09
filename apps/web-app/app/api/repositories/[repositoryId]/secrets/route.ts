import { randomUUID } from "node:crypto";
import db from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { type NextRequest, NextResponse } from "next/server";

type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};

const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ repositoryId: string }> },
) {
	const { repositoryId } = await params;

	if (!(await authenticate(req))) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = (await req.json()) as { name?: unknown; value?: unknown };
	const name = getSecretName(body.name);
	const value = typeof body.value === "string" ? body.value : undefined;

	if (!name || value === undefined) {
		return NextResponse.json(
			{ message: "A valid secret name and value are required" },
			{ status: 400 },
		);
	}

	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		return NextResponse.json(
			{ message: "Secret encryption key is not configured" },
			{ status: 500 },
		);
	}

	const repository = await getRepository(repositoryId);

	if (!repository) {
		return NextResponse.json(
			{ message: "Repository not found" },
			{ status: 404 },
		);
	}

	const encryptionService = createEncryptionService(encryptionKey);
	const secret: RepositorySecret = {
		id: randomUUID(),
		name,
		valueEncrypted: await encryptionService.encrypt(value),
		createdAt: new Date().toISOString(),
	};
	const existingSecrets = getRepositorySecrets(repository.secrets);
	const nextSecrets = [
		...existingSecrets.filter((existingSecret) => existingSecret.name !== name),
		secret,
	];
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		return NextResponse.json(
			{ message: "Repository not found" },
			{ status: 404 },
		);
	}

	await db.transact(tx.update({ secrets: nextSecrets }));

	return NextResponse.json({
		secret: {
			id: secret.id,
			name: secret.name,
			createdAt: secret.createdAt,
		},
	});
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ repositoryId: string }> },
) {
	const { repositoryId } = await params;

	if (!(await authenticate(req))) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = (await req.json()) as { secretId?: unknown };
	const secretId =
		typeof body.secretId === "string" ? body.secretId : undefined;

	if (!secretId) {
		return NextResponse.json(
			{ message: "secretId is required" },
			{ status: 400 },
		);
	}

	const repository = await getRepository(repositoryId);

	if (!repository) {
		return NextResponse.json(
			{ message: "Repository not found" },
			{ status: 404 },
		);
	}

	const nextSecrets = getRepositorySecrets(repository.secrets).filter(
		(secret) => secret.id !== secretId,
	);
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		return NextResponse.json(
			{ message: "Repository not found" },
			{ status: 404 },
		);
	}

	await db.transact(tx.update({ secrets: nextSecrets }));

	return NextResponse.json({ status: "deleted" });
}

const authenticate = async (req: NextRequest) => {
	const authorizationHeader = req.headers.get("Authorization");
	const refreshToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice("Bearer ".length)
		: undefined;

	if (!refreshToken) {
		return undefined;
	}

	try {
		return await db.auth.verifyToken(refreshToken);
	} catch {
		return undefined;
	}
};

const getRepository = async (repositoryId: string) => {
	return db
		.query({
			repositories: {
				$: {
					where: {
						id: repositoryId,
					},
					fields: ["secrets"],
				},
			},
		})
		.then((data) => data.repositories[0]);
};

const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string"
	);
};

const getSecretName = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return SECRET_NAME_PATTERN.test(trimmed) ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
