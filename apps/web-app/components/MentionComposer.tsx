"use client";

import {
	CubeIcon,
	GitBranchIcon,
	PlugsConnectedIcon,
	SparkleIcon,
} from "@phosphor-icons/react";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	type ComponentType,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { cn } from "@/helpers/classname-helper";

export type MentionKind = "skill" | "repository" | "mcp";

export type MentionComposerItem = {
	id: string;
	kind: MentionKind;
	label: string;
	title: string;
	subtitle?: string;
};

export type MentionableSkill = {
	description?: string;
	id: string;
	name: string;
	removedAt?: string | Date | null;
	slug?: string;
};

export type MentionableRepository = {
	branch?: string | null;
	id: string;
	path?: string | null;
	url: string;
};

export type MentionableMcpServer = {
	enabled?: boolean | null;
	id: string;
	name: string;
	url: string;
};

type MentionState = {
	from: number;
	query: string;
};

type MentionComposerProps = {
	"aria-label"?: string;
	autoFocus?: boolean;
	className?: string;
	disabled?: boolean;
	mentionMenuPlacement?: "bottom" | "top";
	mentionItems?: MentionComposerItem[];
	onBlur?: () => void;
	onChange: (value: string) => void;
	onFocus?: () => void;
	onSubmit?: () => void;
	placeholder?: string;
	value: string;
};

const kindLabel: Record<MentionKind, string> = {
	skill: "Skill",
	repository: "Repo",
	mcp: "MCP",
};

const kindOrder: Record<MentionKind, number> = {
	skill: 0,
	repository: 1,
	mcp: 2,
};

const kindIcon: Record<MentionKind, ComponentType<{ className?: string }>> = {
	skill: SparkleIcon,
	repository: GitBranchIcon,
	mcp: PlugsConnectedIcon,
};

const MentionToken = Mention.extend({
	addAttributes() {
		const parentAttributes = this.parent?.() ?? {};

		return {
			...parentAttributes,
			kind: {
				default: null,
			},
		};
	},
});

export function MentionComposer({
	"aria-label": ariaLabel,
	autoFocus,
	className,
	disabled,
	mentionMenuPlacement = "top",
	mentionItems = [],
	onBlur,
	onChange,
	onFocus,
	onSubmit,
	placeholder,
	value,
}: MentionComposerProps) {
	const [mentionState, setMentionState] = useState<MentionState | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const editorExtensions = useMemo(
		() => [
			StarterKit.configure({
				blockquote: false,
				codeBlock: false,
				heading: false,
				horizontalRule: false,
			}),
			MentionToken.configure({
				HTMLAttributes: {
					class: "mention-composer-token",
				},
				renderText({ node }) {
					return `@${node.attrs.label}`;
				},
				renderHTML({ node }) {
					return [
						"span",
						{
							class: "mention-composer-token",
							"data-mention-kind": node.attrs.kind,
							"data-mention-id": node.attrs.id,
						},
						`@${node.attrs.label}`,
					];
				},
			}),
			Placeholder.configure({
				placeholder: placeholder ?? "",
			}),
		],
		[placeholder],
	);

	const sortedMentionItems = useMemo(
		() =>
			[...mentionItems].sort((first, second) => {
				const kindComparison =
					kindOrder[first.kind] - kindOrder[second.kind] ||
					first.label.localeCompare(second.label);
				return kindComparison;
			}),
		[mentionItems],
	);

	const filteredMentionItems = useMemo(() => {
		const query = mentionState?.query.trim().toLowerCase() ?? "";

		return sortedMentionItems
			.filter((item) => {
				if (!query) {
					return true;
				}

				return [item.label, item.title, item.subtitle, item.kind]
					.filter(Boolean)
					.some((value) => value?.toLowerCase().includes(query));
			})
			.slice(0, 8);
	}, [mentionState?.query, sortedMentionItems]);

	const closeMentionMenu = useCallback(() => {
		setMentionState(null);
		setActiveIndex(0);
	}, []);

	const updateMentionMenu = useCallback(
		(editor: ReturnType<typeof useEditor>) => {
			if (!editor?.isFocused || !editor.state.selection.empty) {
				closeMentionMenu();
				return;
			}

			const cursorPosition = editor.state.selection.from;
			const searchStart = Math.max(0, cursorPosition - 80);
			const textBeforeCursor = editor.state.doc.textBetween(
				searchStart,
				cursorPosition,
				"\n",
				"\0",
			);
			const match = /(?:^|\s)@([\w./:-]*)$/.exec(textBeforeCursor);

			if (!match) {
				closeMentionMenu();
				return;
			}

			const query = match[1] ?? "";

			setMentionState({
				from: cursorPosition - query.length - 1,
				query,
			});
			setActiveIndex(0);
		},
		[closeMentionMenu],
	);

	const editor = useEditor({
		extensions: editorExtensions,
		content: plainTextToDocument(value),
		editable: !disabled,
		editorProps: {
			attributes: {
				"aria-label": ariaLabel ?? "Composer",
				class:
					"mention-composer-content min-h-24 w-full whitespace-pre-wrap break-words outline-none",
			},
			handleKeyDown(_view, event) {
				if (mentionState) {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setActiveIndex((index) =>
							filteredMentionItems.length === 0
								? 0
								: (index + 1) % filteredMentionItems.length,
						);
						return true;
					}

					if (event.key === "ArrowUp") {
						event.preventDefault();
						setActiveIndex((index) =>
							filteredMentionItems.length === 0
								? 0
								: (index - 1 + filteredMentionItems.length) %
									filteredMentionItems.length,
						);
						return true;
					}

					if (event.key === "Escape") {
						event.preventDefault();
						closeMentionMenu();
						return true;
					}

					if (event.key === "Enter" || event.key === "Tab") {
						const selectedItem = filteredMentionItems[activeIndex];

						if (selectedItem) {
							event.preventDefault();
							insertMention(selectedItem);
							return true;
						}
					}
				}

				if (event.key !== "Enter" || !onSubmit) {
					return false;
				}

				if (event.metaKey || event.ctrlKey) {
					return false;
				}

				event.preventDefault();
				onSubmit();
				return true;
			},
		},
		immediatelyRender: false,
		onBlur,
		onFocus({ editor }) {
			onFocus?.();
			updateMentionMenu(editor);
		},
		onSelectionUpdate({ editor }) {
			updateMentionMenu(editor);
		},
		onUpdate({ editor }) {
			onChange(editor.getText({ blockSeparator: "\n" }));
			updateMentionMenu(editor);
		},
	});

	useEffect(() => {
		if (!editor) {
			return;
		}

		editor.setEditable(!disabled);
	}, [disabled, editor]);

	useEffect(() => {
		if (!editor || value === editor.getText({ blockSeparator: "\n" })) {
			return;
		}

		editor.commands.setContent(plainTextToDocument(value), {
			emitUpdate: false,
		});
		closeMentionMenu();
	}, [closeMentionMenu, editor, value]);

	useEffect(() => {
		if (!editor || !autoFocus) {
			return;
		}

		window.requestAnimationFrame(() => {
			editor.commands.focus("end");
		});
	}, [autoFocus, editor]);

	const insertMention = useCallback(
		(item: MentionComposerItem) => {
			if (!editor || !mentionState) {
				return;
			}

			editor
				.chain()
				.focus()
				.deleteRange({
					from: mentionState.from,
					to: editor.state.selection.from,
				})
				.insertContent([
					{
						type: "mention",
						attrs: {
							id: item.id,
							kind: item.kind,
							label: item.label,
						},
					},
					{ type: "text", text: " " },
				])
				.run();
			closeMentionMenu();
		},
		[closeMentionMenu, editor, mentionState],
	);

	return (
		<div
			className={cn(
				"relative w-full rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs text-grayscale-12 outline-none transition-colors duration-150 hover:bg-grayscale-2 focus-within:border-grayscale-8 focus-within:bg-grayscale-1 focus-within:ring-2 focus-within:ring-grayscale-4/60",
				disabled && "cursor-not-allowed opacity-60 hover:bg-grayscale-1",
				className,
			)}
		>
			<EditorContent editor={editor} />
			{mentionState ? (
				<div
					className={cn(
						"absolute left-2 z-50 max-h-72 w-[min(32rem,calc(100%-1rem))] overflow-y-auto rounded-md border border-grayscale-5 bg-grayscale-1 p-1 shadow-lg",
						mentionMenuPlacement === "bottom"
							? "top-full mt-1"
							: "bottom-full mb-1",
					)}
				>
					{filteredMentionItems.length > 0 ? (
						filteredMentionItems.map((item, index) => {
							const Icon = kindIcon[item.kind] ?? CubeIcon;

							return (
								<button
									type="button"
									key={`${item.kind}:${item.id}`}
									className={cn(
										"flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
										index === activeIndex
											? "bg-accent-3 text-grayscale-12"
											: "text-grayscale-11 hover:bg-grayscale-2 hover:text-grayscale-12",
									)}
									onMouseDown={(event) => {
										event.preventDefault();
										insertMention(item);
									}}
								>
									<span className="flex size-6 shrink-0 items-center justify-center rounded border border-grayscale-5 bg-grayscale-2 text-grayscale-11">
										<Icon className="size-3.5" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="flex min-w-0 items-center gap-1.5">
											<span className="truncate font-medium text-grayscale-12">
												@{item.label}
											</span>
											<span className="shrink-0 rounded border border-grayscale-5 px-1 text-[10px] uppercase tracking-normal text-grayscale-10">
												{kindLabel[item.kind]}
											</span>
										</span>
										{item.subtitle ? (
											<span className="block truncate text-[11px] text-grayscale-10">
												{item.subtitle}
											</span>
										) : null}
									</span>
								</button>
							);
						})
					) : (
						<p className="px-2 py-1.5 text-xs text-grayscale-10">
							No matching mentions
						</p>
					)}
				</div>
			) : null}
		</div>
	);
}

export function buildWorkspaceMentionItems({
	mcpServers,
	repositories,
	skills,
}: {
	mcpServers?: MentionableMcpServer[];
	repositories?: MentionableRepository[];
	skills?: MentionableSkill[];
}): MentionComposerItem[] {
	const skillItems =
		skills
			?.filter((skill) => !skill.removedAt)
			.map((skill) => ({
				id: skill.id,
				kind: "skill" as const,
				label: `skill/${skill.slug || skill.name}`,
				title: skill.name,
				subtitle: skill.description,
			})) ?? [];
	const repositoryItems =
		repositories?.map((repository) => {
			const label = repository.path || getRepositoryName(repository.url);

			return {
				id: repository.id,
				kind: "repository" as const,
				label: `repo/${label}`,
				title: label,
				subtitle: repository.branch
					? `${repository.url} (${repository.branch})`
					: repository.url,
			};
		}) ?? [];
	const mcpItems =
		mcpServers?.map((mcpServer) => ({
			id: mcpServer.id,
			kind: "mcp" as const,
			label: `mcp/${mcpServer.name}`,
			title: mcpServer.name,
			subtitle:
				mcpServer.enabled === false
					? `${mcpServer.url} (disabled)`
					: mcpServer.url,
		})) ?? [];

	return [...skillItems, ...repositoryItems, ...mcpItems];
}

function getRepositoryName(url: string) {
	const trimmedUrl = url.replace(/\.git$/, "");
	const pathParts = trimmedUrl.split(/[/:]/).filter(Boolean);
	return pathParts.at(-1) || "repository";
}

function plainTextToDocument(value: string) {
	const lines = value.split("\n");

	return {
		type: "doc",
		content: lines.length
			? lines.map((line) => ({
					type: "paragraph",
					...(line
						? {
								content: [
									{
										type: "text",
										text: line,
									},
								],
							}
						: {}),
				}))
			: [{ type: "paragraph" }],
	};
}
