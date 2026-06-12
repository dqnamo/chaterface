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
	status: "pending" | "uploading" | "uploaded" | "failed";
	error?: string;
	uploaded?: UploadedImageAttachment;
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

type UseImageAttachmentsOptions = {
	taskId?: string;
	uploadImmediately?: boolean;
};

export function useImageAttachments({
	taskId,
	uploadImmediately = false,
}: UseImageAttachmentsOptions = {}) {
	const [attachments, setAttachments] = useState<ImageAttachmentDraft[]>([]);
	const attachmentsRef = useRef<ImageAttachmentDraft[]>([]);
	const uploadsRef = useRef(
		new Map<string, Promise<UploadedImageAttachment>>(),
	);
	const uploadedRef = useRef(new Map<string, UploadedImageAttachment>());

	const startUpload = useCallback(
		(attachment: ImageAttachmentDraft) => {
			if (!taskId) {
				return;
			}

			const existingUpload = uploadsRef.current.get(attachment.id);

			if (existingUpload) {
				return;
			}

			const upload = uploadImageAttachment(taskId, attachment)
				.then((uploaded) => {
					uploadedRef.current.set(attachment.id, uploaded);
					setAttachments((current) =>
						current.map((item) =>
							item.id === attachment.id
								? { ...item, status: "uploaded", uploaded, error: undefined }
								: item,
						),
					);

					return uploaded;
				})
				.catch((error) => {
					setAttachments((current) =>
						current.map((item) =>
							item.id === attachment.id
								? {
										...item,
										status: "failed",
										error:
											error instanceof Error ? error.message : String(error),
									}
								: item,
						),
					);

					throw error;
				})
				.finally(() => {
					uploadsRef.current.delete(attachment.id);
				});

			uploadsRef.current.set(attachment.id, upload);
			void upload.catch(() => {});
			setAttachments((current) =>
				current.map((item) =>
					item.id === attachment.id
						? { ...item, status: "uploading", error: undefined }
						: item,
				),
			);
		},
		[taskId],
	);

	const addFiles = useCallback(
		(files: FileList | File[]) => {
			const images = Array.from(files).filter((file) =>
				file.type.startsWith("image/"),
			);

			if (images.length === 0) {
				return;
			}

			const nextAttachments = images.map((file) => {
				const attachmentId =
					typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

				return {
					id: attachmentId,
					file,
					previewUrl: URL.createObjectURL(file),
					name: file.name || getDefaultImageName(file.type),
					contentType: file.type || "application/octet-stream",
					size: file.size,
					status:
						uploadImmediately && taskId
							? ("uploading" as const)
							: ("pending" as const),
				};
			});

			setAttachments((current) => [...current, ...nextAttachments]);

			if (uploadImmediately) {
				for (const attachment of nextAttachments) {
					startUpload(attachment);
				}
			}
		},
		[startUpload, taskId, uploadImmediately],
	);

	const removeAttachment = useCallback((attachmentId: string) => {
		setAttachments((current) => {
			const attachment = current.find((item) => item.id === attachmentId);

			if (attachment) {
				URL.revokeObjectURL(attachment.previewUrl);
			}

			return current.filter((item) => item.id !== attachmentId);
		});
		uploadsRef.current.delete(attachmentId);
		uploadedRef.current.delete(attachmentId);
	}, []);

	const clearAttachments = useCallback(() => {
		setAttachments((current) => {
			for (const attachment of current) {
				URL.revokeObjectURL(attachment.previewUrl);
			}

			return [];
		});
		uploadsRef.current.clear();
		uploadedRef.current.clear();
	}, []);

	const uploadAttachments = useCallback(
		async (fallbackTaskId?: string) => {
			const uploadTaskId = fallbackTaskId ?? taskId;

			if (!uploadTaskId) {
				throw new Error("Cannot upload images without a task id");
			}

			const currentAttachments = attachmentsRef.current;
			const uploaded: UploadedImageAttachment[] = [];

			for (const attachment of currentAttachments) {
				const completedUpload =
					attachment.uploaded ?? uploadedRef.current.get(attachment.id);

				if (completedUpload) {
					uploaded.push(completedUpload);
					continue;
				}

				let upload = uploadsRef.current.get(attachment.id);

				if (!upload) {
					upload = uploadImageAttachment(uploadTaskId, attachment)
						.then((result) => {
							uploadedRef.current.set(attachment.id, result);
							setAttachments((current) =>
								current.map((item) =>
									item.id === attachment.id
										? {
												...item,
												status: "uploaded",
												uploaded: result,
												error: undefined,
											}
										: item,
								),
							);

							return result;
						})
						.catch((error) => {
							setAttachments((current) =>
								current.map((item) =>
									item.id === attachment.id
										? {
												...item,
												status: "failed",
												error:
													error instanceof Error
														? error.message
														: String(error),
											}
										: item,
								),
							);

							throw error;
						})
						.finally(() => {
							uploadsRef.current.delete(attachment.id);
						});
					uploadsRef.current.set(attachment.id, upload);
					void upload.catch(() => {});
					setAttachments((current) =>
						current.map((item) =>
							item.id === attachment.id
								? { ...item, status: "uploading", error: undefined }
								: item,
						),
					);
				}

				uploaded.push(await upload);
			}

			return uploaded;
		},
		[taskId],
	);

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

	return {
		attachments,
		addFiles,
		removeAttachment,
		clearAttachments,
		uploadAttachments,
	};
}

export function hasImageFiles(dataTransfer: DataTransfer | null) {
	if (!dataTransfer) {
		return false;
	}

	return Array.from(dataTransfer.items).some(
		(item) => item.kind === "file" && item.type.startsWith("image/"),
	);
}

export function getImageFiles(dataTransfer: DataTransfer | null) {
	if (!dataTransfer) {
		return [];
	}

	const filesFromItems = Array.from(dataTransfer.items).flatMap((item) => {
		if (item.kind !== "file" || !item.type.startsWith("image/")) {
			return [];
		}

		const file = item.getAsFile();
		return file ? [file] : [];
	});

	if (filesFromItems.length > 0) {
		return filesFromItems;
	}

	return Array.from(dataTransfer.files).filter((file) =>
		file.type.startsWith("image/"),
	);
}

export async function uploadImageAttachments(
	taskId: string,
	attachments: ImageAttachmentDraft[],
): Promise<UploadedImageAttachment[]> {
	return Promise.all(
		attachments.map((attachment) =>
			attachment.uploaded
				? Promise.resolve(attachment.uploaded)
				: uploadImageAttachment(taskId, attachment),
		),
	);
}

async function uploadImageAttachment(
	taskId: string,
	attachment: ImageAttachmentDraft,
): Promise<UploadedImageAttachment> {
	const filename = sanitizeStorageFileName(attachment.name);
	const path = `tasks/${taskId}/images/${attachment.id}/${filename}`;
	const result = await db.storage.uploadFile(path, attachment.file, {
		contentType: attachment.contentType,
		contentDisposition: `inline; filename="${filename.replaceAll('"', "")}"`,
	});
	const data = result.data as UploadResultData;

	return {
		id: data.id ?? attachment.id,
		path: data.path ?? path,
		url: data.url,
		name: attachment.name,
		contentType: attachment.contentType,
		size: attachment.size,
	};
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
								<p className="truncate text-[11px] text-grayscale-10">
									{getAttachmentStatusLabel(attachment)}
								</p>
							</div>
							<button
								aria-label={`Remove ${attachment.name}`}
								className="absolute right-1 top-1 flex size-6 items-center justify-center bg-grayscale-1/95 text-grayscale-11 ring-1 ring-grayscale-4 transition-colors hover:text-red-10"
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
					aria-label="Attach images"
					className="flex h-7 shrink-0 items-center justify-center gap-1.5 bg-grayscale-2 px-2 text-grayscale-11 ring-1 ring-grayscale-4 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50 sm:size-7 sm:px-0"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
					title="Attach images"
					type="button"
				>
					<ImageIcon className="size-4 shrink-0" weight="bold" />
					<span className="text-xs sm:hidden">Add images</span>
				</button>
				<span className="hidden text-xs text-grayscale-10 sm:inline">
					Drop images here
				</span>
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

function getDefaultImageName(contentType: string) {
	const extension = contentType.split("/")[1]?.split("+")[0] || "png";
	return `image.${extension}`;
}

function getAttachmentStatusLabel(attachment: ImageAttachmentDraft) {
	if (attachment.status === "uploading") {
		return "Uploading...";
	}

	if (attachment.status === "failed") {
		return attachment.error || "Upload failed";
	}

	if (attachment.status === "uploaded") {
		return "Uploaded";
	}

	return formatFileSize(attachment.size);
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
