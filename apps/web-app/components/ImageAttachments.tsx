"use client";

import { ImageIcon, XIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/helpers/classname-helper";

export type ImageAttachmentDraft = {
	id: string;
	file: File;
	previewUrl: string;
	name: string;
	contentType: string;
	size: number;
};

export type UploadedImageAttachment = {
	id: string;
	path: string;
	url?: string;
	name: string;
	contentType: string;
	size: number;
};

type UploadResultData = {
	id?: string;
	path?: string;
	url?: string;
};

export function useImageAttachments() {
	const [attachments, setAttachments] = useState<ImageAttachmentDraft[]>([]);
	const attachmentsRef = useRef<ImageAttachmentDraft[]>([]);

	const addFiles = useCallback((files: FileList | File[]) => {
		const images = Array.from(files).filter((file) =>
			file.type.startsWith("image/"),
		);

		if (images.length === 0) {
			return;
		}

		setAttachments((current) => [
			...current,
			...images.map((file) => {
				const attachmentId =
					typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

				return {
					id: attachmentId,
					file,
					previewUrl: URL.createObjectURL(file),
					name: file.name || "image",
					contentType: file.type || "application/octet-stream",
					size: file.size,
				};
			}),
		]);
	}, []);

	const removeAttachment = useCallback((attachmentId: string) => {
		setAttachments((current) => {
			const attachment = current.find((item) => item.id === attachmentId);

			if (attachment) {
				URL.revokeObjectURL(attachment.previewUrl);
			}

			return current.filter((item) => item.id !== attachmentId);
		});
	}, []);

	const clearAttachments = useCallback(() => {
		setAttachments((current) => {
			for (const attachment of current) {
				URL.revokeObjectURL(attachment.previewUrl);
			}

			return [];
		});
	}, []);

	useEffect(() => {
		attachmentsRef.current = attachments;
	}, [attachments]);

	useEffect(
		() => () => {
			for (const attachment of attachmentsRef.current) {
				URL.revokeObjectURL(attachment.previewUrl);
			}
		},
		[],
	);

	return { attachments, addFiles, removeAttachment, clearAttachments };
}

export function hasImageFiles(dataTransfer: DataTransfer) {
	return Array.from(dataTransfer.items).some(
		(item) => item.kind === "file" && item.type.startsWith("image/"),
	);
}

export async function uploadImageAttachments(
	taskId: string,
	attachments: ImageAttachmentDraft[],
): Promise<UploadedImageAttachment[]> {
	const uploaded: UploadedImageAttachment[] = [];

	for (const attachment of attachments) {
		const filename = sanitizeStorageFileName(attachment.name);
		const path = `tasks/${taskId}/images/${attachment.id}/${filename}`;
		const result = await db.storage.uploadFile(path, attachment.file, {
			contentType: attachment.contentType,
			contentDisposition: `inline; filename="${filename.replaceAll('"', "")}"`,
		});
		const data = result.data as UploadResultData;

		uploaded.push({
			id: data.id ?? attachment.id,
			path: data.path ?? path,
			url: data.url,
			name: attachment.name,
			contentType: attachment.contentType,
			size: attachment.size,
		});
	}

	return uploaded;
}

export function ImageAttachments({
	attachments,
	className,
	disabled = false,
	onAddFiles,
	onRemoveAttachment,
}: {
	attachments: ImageAttachmentDraft[];
	className?: string;
	disabled?: boolean;
	onAddFiles: (files: FileList | File[]) => void;
	onRemoveAttachment: (attachmentId: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{attachments.length > 0 ? (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
					{attachments.map((attachment) => (
						<div
							className="group relative min-w-0 overflow-hidden border border-grayscale-4 bg-grayscale-2"
							key={attachment.id}
						>
							{/* biome-ignore lint/performance/noImgElement: previews use browser object URLs from local File objects. */}
							<img
								alt={attachment.name}
								className="aspect-square w-full object-cover"
								src={attachment.previewUrl}
							/>
							<div className="min-w-0 px-2 py-1">
								<p className="truncate text-xs text-grayscale-12">
									{attachment.name}
								</p>
								<p className="text-[11px] text-grayscale-10">
									{formatFileSize(attachment.size)}
								</p>
							</div>
							<button
								aria-label={`Remove ${attachment.name}`}
								className="absolute right-1 top-1 flex size-6 items-center justify-center bg-white/95 text-grayscale-11 ring-1 ring-grayscale-4 transition-colors hover:text-red-10"
								disabled={disabled}
								onClick={() => onRemoveAttachment(attachment.id)}
								type="button"
							>
								<XIcon className="size-3.5" weight="bold" />
							</button>
						</div>
					))}
				</div>
			) : null}
			<div className="flex items-center gap-2">
				<button
					aria-label="Add images"
					className="flex h-7 shrink-0 items-center justify-center gap-1.5 bg-grayscale-2 px-2 text-grayscale-11 ring-1 ring-grayscale-4 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
					title="Add images"
					type="button"
				>
					<ImageIcon className="size-4 shrink-0" weight="bold" />
					<span className="text-xs">Add images</span>
				</button>
				<input
					accept="image/*"
					className="hidden"
					disabled={disabled}
					multiple
					onChange={(event) => {
						if (event.currentTarget.files) {
							onAddFiles(event.currentTarget.files);
						}
						event.currentTarget.value = "";
					}}
					ref={inputRef}
					type="file"
				/>
			</div>
		</div>
	);
}

function sanitizeStorageFileName(value: string) {
	const normalized = value
		.trim()
		.replaceAll("\\", "-")
		.replaceAll("/", "-")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "image";
}

function formatFileSize(size: number) {
	if (!Number.isFinite(size) || size <= 0) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB"];
	let value = size;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
