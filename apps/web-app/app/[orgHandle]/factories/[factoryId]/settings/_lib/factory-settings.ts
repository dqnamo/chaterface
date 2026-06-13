import type { InstaQLEntity } from "@instantdb/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";

export type Repository = InstaQLEntity<AppSchema, "repositories">;
export type EnvironmentFile = InstaQLEntity<AppSchema, "environmentFiles">;
export type SkillRepository = InstaQLEntity<AppSchema, "skillRepositories">;
export type Skill = InstaQLEntity<AppSchema, "skills">;

export type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};

export const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;

export const repositoryTx = (repositoryId: string) => {
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		throw new Error(`Repository transaction builder ${repositoryId} not found`);
	}

	return tx;
};

export const environmentFileTx = (fileId: string) => {
	const tx = db.tx.environmentFiles[fileId];

	if (!tx) {
		throw new Error(`Environment file transaction builder ${fileId} not found`);
	}

	return tx;
};

export const skillRepositoryTx = (skillRepositoryId: string) => {
	const tx = db.tx.skillRepositories[skillRepositoryId];

	if (!tx) {
		throw new Error(
			`Skill repository transaction builder ${skillRepositoryId} not found`,
		);
	}

	return tx;
};

export const skillTx = (skillId: string) => {
	const tx = db.tx.skills[skillId];

	if (!tx) {
		throw new Error(`Skill transaction builder ${skillId} not found`);
	}

	return tx;
};

export const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

export const getFormString = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

export const optionalString = (value: string) =>
	value.length > 0 ? value : undefined;

export const parsePackageText = (value: string) => {
	const seen = new Set<string>();
	const packages: string[] = [];

	for (const line of value.split(/\r?\n|,/)) {
		const packageName = line.trim();

		if (!packageName) {
			continue;
		}

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName)) {
			return undefined;
		}

		if (seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

export const parseEnvironmentPackages = (value: unknown) => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter(
			(packageName): packageName is string => typeof packageName === "string",
		)
		.filter((packageName) => APT_PACKAGE_NAME_PATTERN.test(packageName));
};

export const optionalRepositoryPath = (value: string) => {
	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.length > 0 ? segments.join("/") : undefined;
};

export const getEnvironmentFilePath = (value: string) => {
	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.join("/");
};

export const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	return (
		"id" in value &&
		"name" in value &&
		"valueEncrypted" in value &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string"
	);
};

export const getApiErrorMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: unknown };

		if (typeof body.message === "string") {
			return body.message;
		}
	} catch {
		return "Request failed";
	}

	return "Request failed";
};
