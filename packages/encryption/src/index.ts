const ENCRYPTION_VERSION = "v1";
const IV_BYTE_LENGTH = 12;

export type EncryptionService = {
	encrypt(value: string): Promise<string>;
	decrypt(value: string): Promise<string>;
};

export const createEncryptionService = (
	secretKey: string,
): EncryptionService => {
	if (secretKey.trim().length === 0) {
		throw new Error("Encryption secret key must not be empty");
	}

	return {
		async encrypt(value) {
			const crypto = getCrypto();
			const key = await importAesKey(secretKey);
			const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
			const encrypted = await crypto.subtle.encrypt(
				{
					name: "AES-GCM",
					iv,
				},
				key,
				new TextEncoder().encode(value),
			);

			return [
				ENCRYPTION_VERSION,
				toBase64Url(iv),
				toBase64Url(new Uint8Array(encrypted)),
			].join(":");
		},
		async decrypt(value) {
			const [version, encodedIv, encodedEncryptedValue] = value.split(":");

			if (
				version !== ENCRYPTION_VERSION ||
				!encodedIv ||
				!encodedEncryptedValue
			) {
				throw new Error("Encrypted value has an invalid format");
			}

			const crypto = getCrypto();
			const key = await importAesKey(secretKey);
			const decrypted = await crypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: fromBase64Url(encodedIv),
				},
				key,
				fromBase64Url(encodedEncryptedValue),
			);

			return new TextDecoder().decode(decrypted);
		},
	};
};

const importAesKey = async (secretKey: string) => {
	const crypto = getCrypto();
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(secretKey),
	);

	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
};

const getCrypto = () => {
	if (!globalThis.crypto?.subtle) {
		throw new Error("Web Crypto API is not available");
	}

	return globalThis.crypto;
};

const toBase64Url = (bytes: Uint8Array) => {
	let binary = "";
	const chunkSize = 0x8000;

	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}

	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
};

const fromBase64Url = (value: string) => {
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const paddedBase64 = base64.padEnd(
		base64.length + ((4 - (base64.length % 4)) % 4),
		"=",
	);
	const binary = atob(paddedBase64);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
};
