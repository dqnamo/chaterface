"use client";

import {
	ArrowClockwiseIcon,
	FileCodeIcon,
	FloppyDiskIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import {
	FileTree,
	useFileTree,
	useFileTreeSearch,
	useFileTreeSelection,
} from "@pierre/trees/react";
import dynamic from "next/dynamic";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/Button";

const MonacoEditor = dynamic(
	() => import("@monaco-editor/react").then((module) => module.default),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
				Loading editor...
			</div>
		),
	},
);

type TaskCodeEditorProps = {
	hasSandbox: boolean;
	taskId: string;
	userToken?: string;
};

type DirectoryEntry = {
	path: string;
	type: "directory" | "file";
};

type DirectoryListResponse = {
	directory: string;
	entries: DirectoryEntry[];
	root: string;
};

type FileContentResponse = {
	content: string;
	path: string;
	root: string;
};

const TREE_UNSAFE_CSS = `
	:host {
		font-family: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
	}
	button[data-type='item'] {
		border-radius: 4px;
	}
`;

export function TaskCodeEditor({
	hasSandbox,
	taskId,
	userToken,
}: TaskCodeEditorProps) {
	const [treePaths, setTreePaths] = useState<string[]>([]);
	const [filePaths, setFilePaths] = useState<Set<string>>(() => new Set());
	const [directoryPaths, setDirectoryPaths] = useState<Set<string>>(
		() => new Set(),
	);
	const [loadedDirectories, setLoadedDirectories] = useState<Set<string>>(
		() => new Set(),
	);
	const [loadingDirectories, setLoadingDirectories] = useState<Set<string>>(
		() => new Set(),
	);
	const [root, setRoot] = useState<string | null>(null);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [content, setContent] = useState("");
	const [savedContent, setSavedContent] = useState("");
	const [isLoadingFiles, setIsLoadingFiles] = useState(false);
	const [isLoadingFile, setIsLoadingFile] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { model } = useFileTree({
		fileTreeSearchMode: "hide-non-matches",
		initialExpansion: 1,
		paths: [],
		search: true,
		unsafeCSS: TREE_UNSAFE_CSS,
	});
	const search = useFileTreeSearch(model);
	const selectedPaths = useFileTreeSelection(model);
	const isDirty = content !== savedContent;
	const canUseEditor = Boolean(hasSandbox && userToken);
	const saveRef = useRef<() => Promise<void>>(async () => {});
	const treeStyle = {
		"--trees-bg-override": "var(--color-grayscale-2)",
		"--trees-border-color-override": "var(--color-grayscale-4)",
		"--trees-fg-override": "var(--color-grayscale-12)",
		"--trees-muted-fg-override": "var(--color-grayscale-10)",
		"--trees-selected-bg-override": "var(--color-accent-3)",
		"--trees-selected-fg-override": "var(--color-accent-12)",
	} as CSSProperties;

	const loadDirectory = useCallback(
		async (directoryPath: string, options: { reset?: boolean } = {}) => {
			if (!canUseEditor) {
				setTreePaths([]);
				setFilePaths(new Set());
				setDirectoryPaths(new Set());
				setLoadedDirectories(new Set());
				setLoadingDirectories(new Set());
				return;
			}

			const normalizedDirectoryPath = normalizeDirectoryPath(directoryPath);

			if (options.reset) {
				setSelectedPath(null);
				setContent("");
				setSavedContent("");
			}

			setIsLoadingFiles(options.reset === true);
			setLoadingDirectories((current) =>
				new Set(current).add(normalizedDirectoryPath),
			);
			setError(null);

			try {
				const response = await fetch(
					`/api/tasks/${taskId}/files?directory=${encodeURIComponent(
						normalizedDirectoryPath,
					)}`,
					{
						cache: "no-store",
						headers: {
							Authorization: `Bearer ${userToken}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error(
						await getResponseMessage(response, "Failed to load directory"),
					);
				}

				const result = (await response.json()) as DirectoryListResponse;
				const directoryEntries = result.entries.filter(
					(entry) => entry.type === "directory",
				);
				const fileEntries = result.entries.filter(
					(entry) => entry.type === "file",
				);
				const nextTreePaths = result.entries.map(getTreePathForEntry);

				setTreePaths((current) =>
					mergeTreePaths(options.reset ? [] : current, nextTreePaths),
				);
				setDirectoryPaths((current) =>
					mergePathSet(
						options.reset ? new Set() : current,
						directoryEntries.map((entry) => entry.path),
					),
				);
				setFilePaths((current) =>
					mergePathSet(
						options.reset ? new Set() : current,
						fileEntries.map((entry) => entry.path),
					),
				);
				setLoadedDirectories((current) =>
					mergePathSet(options.reset ? new Set() : current, [result.directory]),
				);
				setRoot(result.root);
			} catch (error) {
				if (options.reset) {
					setTreePaths([]);
					setFilePaths(new Set());
					setDirectoryPaths(new Set());
					setLoadedDirectories(new Set());
				}
				setError(error instanceof Error ? error.message : String(error));
			} finally {
				setIsLoadingFiles(false);
				setLoadingDirectories((current) => {
					const next = new Set(current);
					next.delete(normalizedDirectoryPath);
					return next;
				});
			}
		},
		[canUseEditor, taskId, userToken],
	);

	const openFile = useCallback(
		async (path: string) => {
			if (!canUseEditor) {
				return;
			}

			if (isDirty && selectedPath !== path) {
				const shouldDiscard = window.confirm(
					"Discard unsaved changes and open another file?",
				);

				if (!shouldDiscard) {
					if (selectedPath) {
						model.getItem(selectedPath)?.select();
					}
					return;
				}
			}

			setIsLoadingFile(true);
			setError(null);

			try {
				const response = await fetch(
					`/api/tasks/${taskId}/files?path=${encodeURIComponent(path)}`,
					{
						cache: "no-store",
						headers: {
							Authorization: `Bearer ${userToken}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error(
						await getResponseMessage(response, "Failed to open file"),
					);
				}

				const result = (await response.json()) as FileContentResponse;
				setSelectedPath(result.path);
				setContent(result.content);
				setSavedContent(result.content);
				setRoot(result.root);
			} catch (error) {
				setError(error instanceof Error ? error.message : String(error));
			} finally {
				setIsLoadingFile(false);
			}
		},
		[canUseEditor, isDirty, model, selectedPath, taskId, userToken],
	);

	const saveFile = useCallback(async () => {
		if (!canUseEditor || !selectedPath || !isDirty) {
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			const response = await fetch(`/api/tasks/${taskId}/files`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${userToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content,
					path: selectedPath,
				}),
			});

			if (!response.ok) {
				throw new Error(
					await getResponseMessage(response, "Failed to save file"),
				);
			}

			setSavedContent(content);
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setIsSaving(false);
		}
	}, [canUseEditor, content, isDirty, selectedPath, taskId, userToken]);

	useEffect(() => {
		saveRef.current = saveFile;
	}, [saveFile]);

	useHotkeys(
		"ctrl+s, meta+s",
		(event) => {
			event.preventDefault();
			void saveRef.current();
		},
		{
			enabled: canUseEditor && Boolean(selectedPath),
			preventDefault: true,
		},
		[canUseEditor, selectedPath],
	);

	useEffect(() => {
		if (!canUseEditor) {
			setTreePaths([]);
			setFilePaths(new Set());
			setDirectoryPaths(new Set());
			setLoadedDirectories(new Set());
			setLoadingDirectories(new Set());
			setSelectedPath(null);
			setContent("");
			setSavedContent("");
			return;
		}

		void loadDirectory("", { reset: true });
	}, [canUseEditor, loadDirectory]);

	useEffect(() => {
		model.resetPaths(treePaths, {
			initialExpandedPaths: [...loadedDirectories].filter(Boolean),
		});
	}, [loadedDirectories, model, treePaths]);

	useEffect(() => {
		const [nextPath] = selectedPaths;
		const normalizedPath = normalizeDirectoryPath(nextPath ?? "");

		if (!normalizedPath || normalizedPath === selectedPath) {
			return;
		}

		if (filePaths.has(normalizedPath)) {
			void openFile(normalizedPath);
			return;
		}

		if (
			directoryPaths.has(normalizedPath) &&
			!loadedDirectories.has(normalizedPath) &&
			!loadingDirectories.has(normalizedPath)
		) {
			const item = model.getItem(normalizedPath);

			if (item && "expand" in item) {
				item.expand();
			}

			void loadDirectory(normalizedPath);
		}
	}, [
		directoryPaths,
		filePaths,
		loadDirectory,
		loadedDirectories,
		loadingDirectories,
		model,
		openFile,
		selectedPath,
		selectedPaths,
	]);

	return (
		<div className="flex h-full min-h-0 flex-col bg-grayscale-1">
			<div className="flex min-h-0 flex-1 flex-row">
				<aside className="flex w-48 shrink-0 flex-col border-r border-grayscale-4 bg-grayscale-2">
					<div className="flex h-10 shrink-0 items-center gap-2 border-b border-grayscale-4 px-2">
						<label className="relative min-w-0 flex-1">
							<MagnifyingGlassIcon
								weight="bold"
								className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-grayscale-10"
							/>
							<input
								value={search.value}
								onChange={(event) => {
									search.setValue(event.target.value || null);
								}}
								placeholder="Search files"
								className="h-7 w-full rounded-md border border-grayscale-4 bg-grayscale-1 pr-2 pl-7 font-mono text-xs text-grayscale-12 outline-none transition-colors placeholder:text-grayscale-10 focus:border-accent-7"
							/>
						</label>
						<button
							type="button"
							aria-label="Refresh files"
							onClick={() => void loadDirectory("", { reset: true })}
							disabled={!canUseEditor || isLoadingFiles}
							className="flex size-7 shrink-0 items-center justify-center rounded-md border border-grayscale-4 bg-grayscale-1 text-grayscale-11 transition-colors hover:border-grayscale-5 hover:bg-grayscale-2 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<ArrowClockwiseIcon weight="bold" className="size-4" />
						</button>
					</div>
					<div className="min-h-0 flex-1">
						{canUseEditor && treePaths.length > 0 ? (
							<FileTree
								model={model}
								className="h-full w-full"
								style={treeStyle}
							/>
						) : (
							<EditorEmptyState
								title={getTreeEmptyTitle({
									canUseEditor,
									hasSandbox,
									isLoadingFiles,
								})}
								message={getTreeEmptyMessage({
									canUseEditor,
									pathCount: treePaths.length,
									hasSandbox,
									isLoadingFiles,
								})}
							/>
						)}
					</div>
				</aside>
				<section className="flex min-w-0 flex-1 flex-col">
					<div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-grayscale-4 px-3">
						<div className="flex min-w-0 items-center gap-2">
							<FileCodeIcon
								weight="bold"
								className="size-4 shrink-0 text-grayscale-10"
							/>
							<div className="min-w-0">
								<p className="truncate font-mono text-xs text-grayscale-12">
									{selectedPath ?? "No file selected"}
								</p>
								<p className="truncate text-[11px] text-grayscale-10">
									{root ?? "Sandbox workspace"}
								</p>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{isDirty ? (
								<span className="text-[11px] text-accent-11">Unsaved</span>
							) : selectedPath ? (
								<span className="text-[11px] text-grayscale-10">Saved</span>
							) : null}
							<Button
								type="button"
								variant="secondary"
								shortcut="Ctrl/Cmd+S"
								className="h-7"
								disabled={!selectedPath || !isDirty || isSaving}
								onClick={() => void saveFile()}
							>
								<FloppyDiskIcon weight="bold" className="size-4" />
								{isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
					{error ? (
						<div className="shrink-0 border-b border-red-5 bg-red-2 px-3 py-2 text-xs text-red-11">
							{error}
						</div>
					) : null}
					<div className="min-h-0 flex-1">
						{selectedPath ? (
							<MonacoEditor
								height="100%"
								language={getMonacoLanguage(selectedPath)}
								path={selectedPath}
								theme="vs-dark"
								value={content}
								onChange={(value) => {
									setContent(value ?? "");
								}}
								loading={
									<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
										Loading editor...
									</div>
								}
								options={{
									automaticLayout: true,
									fontFamily: "var(--font-jetbrains-mono)",
									fontSize: 12,
									lineHeight: 18,
									minimap: { enabled: false },
									padding: { bottom: 16, top: 12 },
									scrollBeyondLastLine: false,
									tabSize: 2,
									wordWrap: "on",
								}}
							/>
						) : (
							<EditorEmptyState
								title={
									isLoadingFile ? "Opening file" : "Select a file from the tree"
								}
								message="Edits are saved directly into the running E2B sandbox for this task."
							/>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

function EditorEmptyState({
	message,
	title,
}: {
	message: string;
	title: string;
}) {
	return (
		<div className="flex h-full min-h-0 flex-1 items-center justify-center text-xs text-grayscale-10">
			<div className="flex max-w-xs flex-col items-center justify-center gap-px p-6 text-center">
				<p className="text-sm text-grayscale-12">{title}</p>
				<p className="text-xs text-grayscale-10">{message}</p>
			</div>
		</div>
	);
}

const getTreeEmptyTitle = ({
	canUseEditor,
	hasSandbox,
	isLoadingFiles,
}: {
	canUseEditor: boolean;
	hasSandbox: boolean;
	isLoadingFiles: boolean;
}) => {
	if (isLoadingFiles) {
		return "Loading files";
	}

	if (!hasSandbox) {
		return "No sandbox yet";
	}

	if (!canUseEditor) {
		return "Sign in required";
	}

	return "No files found";
};

const getTreeEmptyMessage = ({
	canUseEditor,
	hasSandbox,
	isLoadingFiles,
	pathCount,
}: {
	canUseEditor: boolean;
	hasSandbox: boolean;
	isLoadingFiles: boolean;
	pathCount: number;
}) => {
	if (isLoadingFiles) {
		return "Loading the sandbox directory.";
	}

	if (!hasSandbox) {
		return "Start the task before opening the code editor.";
	}

	if (!canUseEditor) {
		return "The editor needs your session token to access task files.";
	}

	if (pathCount === 0) {
		return "This sandbox directory has no supported files or folders to show.";
	}

	return "";
};

const getTreePathForEntry = (entry: DirectoryEntry) =>
	entry.type === "directory" ? `${entry.path}/` : entry.path;

const mergePathSet = (current: Set<string>, paths: string[]) => {
	const next = new Set(current);

	for (const path of paths) {
		next.add(normalizeDirectoryPath(path));
	}

	return next;
};

const mergeTreePaths = (current: string[], paths: string[]) => {
	const next = new Set(current);

	for (const path of paths) {
		if (path) {
			next.add(path);
		}
	}

	return [...next].sort(compareTreePaths);
};

const compareTreePaths = (left: string, right: string) => {
	const leftDirectory = left.endsWith("/");
	const rightDirectory = right.endsWith("/");
	const leftParent = getParentPath(left);
	const rightParent = getParentPath(right);

	if (leftParent === rightParent && leftDirectory !== rightDirectory) {
		return leftDirectory ? -1 : 1;
	}

	return left.localeCompare(right);
};

const getParentPath = (treePath: string) => {
	const normalized = normalizeDirectoryPath(treePath);
	const slashIndex = normalized.lastIndexOf("/");

	return slashIndex === -1 ? "" : normalized.slice(0, slashIndex);
};

const normalizeDirectoryPath = (value: string) => value.replace(/\/+$/g, "");

const getResponseMessage = async (response: Response, fallback: string) => {
	const result = (await response.json().catch(() => null)) as {
		message?: string;
	} | null;

	return result?.message ?? fallback;
};

const getMonacoLanguage = (filePath: string) => {
	const lowerPath = filePath.toLowerCase();
	const extension = lowerPath.split(".").pop();

	if (lowerPath.endsWith(".d.ts")) {
		return "typescript";
	}

	switch (extension) {
		case "cjs":
		case "js":
		case "jsx":
		case "mjs":
			return "javascript";
		case "cts":
		case "mts":
		case "ts":
		case "tsx":
			return "typescript";
		case "css":
			return "css";
		case "html":
			return "html";
		case "json":
		case "jsonc":
			return "json";
		case "md":
		case "mdx":
			return "markdown";
		case "py":
			return "python";
		case "rb":
			return "ruby";
		case "rs":
			return "rust";
		case "go":
			return "go";
		case "java":
			return "java";
		case "c":
		case "h":
			return "c";
		case "cc":
		case "cpp":
		case "hpp":
			return "cpp";
		case "cs":
			return "csharp";
		case "php":
			return "php";
		case "sh":
		case "bash":
		case "zsh":
			return "shell";
		case "sql":
			return "sql";
		case "xml":
			return "xml";
		case "yaml":
		case "yml":
			return "yaml";
		default:
			return "plaintext";
	}
};
