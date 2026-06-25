import {
	ArrowRightIcon,
	CheckCircleIcon,
	CornersOutIcon,
	DesktopTowerIcon,
	FileCodeIcon,
	FilesIcon,
	GithubLogoIcon,
	GitPullRequestIcon,
	PaperclipIcon,
	PlayCircleIcon,
	PlugsConnectedIcon,
	SidebarSimpleIcon,
	TerminalWindowIcon,
	TextboxIcon,
	UsersThreeIcon,
	XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Arvo } from "next/font/google";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { HolographicFoil } from "@/components/HolographicFoil";
import Logo from "@/components/Logo";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";
import PixelTrail from "@/components/public/PixelTrail";

const arvo = Arvo({
	subsets: ["latin"],
	weight: ["400", "700"],
});

export const metadata: Metadata = {
	title: "Chaterface",
	applicationName: "Chaterface",
	description: "Open source multiplayer cloud workspace for background agents.",
	appleWebApp: {
		title: "Chaterface",
	},
};

const featureCards = [
	{
		description:
			"Create tasks, add follow-up instructions, and keep the conversation, files, previews, and terminal output in one place.",
		icon: <PlayCircleIcon size={18} weight="bold" />,
		iconClassName: "text-accent-11",
		title: "Task workspace",
	},
	{
		description:
			"Give product, engineering, and operations the same workspace so people can supervise agent work together.",
		icon: <UsersThreeIcon size={18} weight="bold" />,
		iconClassName: "text-green-11",
		title: "Shared supervision",
	},
	{
		description:
			"Connect MCP servers and workspace tools so agents can use the same capabilities every time they run.",
		icon: <PlugsConnectedIcon size={18} weight="bold" />,
		iconClassName: "text-cyan-11",
		title: "MCP and tools",
	},
	{
		description:
			"Install reusable skills, packages, and setup commands once at the workspace level instead of rebuilding context per task.",
		icon: <FilesIcon size={18} weight="bold" />,
		iconClassName: "text-orange-11",
		title: "Reusable setup",
	},
	{
		description:
			"Store encrypted workspace secrets for APIs, deployments, and integrations without pasting credentials into prompts.",
		icon: <TextboxIcon size={18} weight="bold" />,
		iconClassName: "text-crimson-11",
		title: "Secret handling",
	},
	{
		description:
			"Connect GitHub repositories so agent changes can become branches, pull requests, and reviewable code.",
		icon: <GithubLogoIcon size={18} weight="bold" />,
		iconClassName: "text-grayscale-11",
		title: "Repository workflow",
	},
];

const techStackCards = [
	{
		description:
			"Serves the public website and the authenticated workspace interface.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/nextjs.png"
				width={20}
			/>
		),
		title: "Next.js",
	},
	{
		description:
			"Runs the API that agent sandboxes call for files, tasks, services, and repositories.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/hono.svg"
				width={20}
			/>
		),
		title: "Hono",
	},
	{
		description:
			"Stores realtime workspace data for tasks, members, agents, secrets, and settings.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/instantdb.png"
				width={20}
			/>
		),
		title: "InstantDB",
	},
	{
		description:
			"Runs durable background workflows for agent events, device auth, and sandbox lifecycle work.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/vercel.svg"
				width={20}
			/>
		),
		title: "Vercel Workflows",
	},
	{
		description:
			"Provides the isolated computers where Codex sessions run commands and edit repos.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/e2b.svg"
				width={20}
			/>
		),
		title: "E2B",
	},
	{
		description:
			"Styles the landing page, workspace shell, task view, settings, and preview UI.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/tailwind.png"
				width={20}
			/>
		),
		title: "Tailwind CSS",
	},
	{
		description:
			"Keeps shared app, API, database, and encryption code typed across the monorepo.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/typescript.svg"
				width={20}
			/>
		),
		title: "TypeScript",
	},
	{
		description:
			"Coordinates builds and checks across the website, web app, API, previews, and packages.",
		logo: (
			<Image
				alt=""
				className="size-5 object-contain"
				height={20}
				src="/logos/turborepo.svg"
				width={20}
			/>
		),
		title: "Turborepo",
	},
];

export default function Home() {
	return (
		<main className="landing-page-colors relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-grayscale-1">
			<PixelTrail
				className="pointer-events-auto absolute inset-0 z-0"
				fadeDuration={650}
				pixelClassName="rounded bg-accent-9"
				pixelGap={4}
				pixelSize={24}
			/>

			<div className="pointer-events-none relative z-10 flex w-full flex-col divide-y divide-grayscale-3 dark:divide-grayscale-2">
				<MobileHeader />

				<div className="relative mx-auto flex w-full max-w-7xl flex-col border-x border-grayscale-3 p-4 pt-[4.5rem] dark:border-grayscale-2 md:p-8 lg:p-10">
					<section className="flex flex-col gap-10 md:flex-row relative p-2 md:min-h-[22rem]">
						<div className="w-full pointer-events-auto flex w-fit max-w-full flex-col gap-px">
							<div className="flex flex-row items-center gap-1.5">
								<Logo className="size-9 rounded-md" />
								<p className="text-md font-medium leading-6 text-grayscale-12">
									Chaterface
								</p>
							</div>
							<p className="max-w-lg text-balance text-2xl font-medium leading-8 text-grayscale-12 mt-8">
								Open source multiplayer cloud workspace for background agents.
							</p>
							<p className="max-w-lg text-balance text-sm leading-6 text-grayscale-11 mt-1">
								Self-host tasks, agent sessions, previews, secrets, and pull
								requests in one place.
							</p>
							<div className="mt-4 flex flex-row flex-wrap items-center gap-2">
								<Button
									className="text-xs"
									href="https://github.com/dqnamo/chaterface"
									target="_blank"
									variant="primary"
								>
									<GithubLogoIcon size={16} weight="bold" />
									View on GitHub
								</Button>
								<Button
									className="text-xs"
									href="https://github.com/dqnamo/chaterface#quick-start"
									target="_blank"
									variant="secondary"
								>
									<TerminalWindowIcon size={16} weight="bold" />
									Run locally
								</Button>
							</div>
						</div>

						<div className="pointer-events-auto justify-end self-end hidden md:block ">
							<HolographicSticker />
						</div>
					</section>

					<ChaterfaceDesktopPreview />
					<FeatureGrid />
					<TechStackSection />
					<Footer className="pointer-events-auto mt-10 p-2" />
				</div>
			</div>
		</main>
	);
}

function HolographicSticker() {
	return (
		<a
			aria-label="Open Interface Company of London"
			className="block w-fit"
			href="https://interface.london"
			rel="noreferrer"
			target="_blank"
		>
			<HolographicFoil
				aria-label="Interactive holographic Interface Company of London sticker"
				className="group h-36 w-72 cursor-pointer rounded-xl shadow-sm sm:h-40 sm:w-80"
				role="img"
			>
				<div className="relative h-full">
					<div className="absolute top-0 left-0 flex h-10 items-center justify-start p-3">
						<p className="font-mono font-semibold text-[10px] text-grayscale-8 leading-none uppercase">
							A product by
						</p>
					</div>
					<div
						className={`${arvo.className} absolute bottom-6 left-5 flex flex-col items-start gap-px text-left text-grayscale-12 leading-none uppercase sm:left-6`}
					>
						<span className="mb-px font-medium text-grayscale-9 text-[11px] leading-none transition-colors duration-200 group-hover:text-grayscale-11">
							THE
						</span>
						<span className="font-medium text-grayscale-11 text-lg leading-none transition-colors duration-200 group-hover:text-grayscale-12">
							INTERFACE
						</span>
						<span className="font-medium text-grayscale-11 text-lg leading-none transition-colors duration-200 group-hover:text-grayscale-12">
							COMPANY
						</span>
						<span className="mt-px font-medium text-grayscale-9 text-[11px] leading-none transition-colors duration-200 group-hover:text-grayscale-11">
							OF LONDON
						</span>
					</div>
					<div className="absolute right-0 bottom-0 flex h-10 items-center justify-end p-3">
						<div className="flex size-5 items-center justify-center rounded-full bg-grayscale-7/30 transition-colors duration-200 group-hover:bg-accent-9">
							<ArrowRightIcon
								className="size-3 text-grayscale-11 transition-colors duration-200 group-hover:text-grayscale-1"
								weight="bold"
							/>
						</div>
					</div>
				</div>
			</HolographicFoil>
		</a>
	);
}

function ChaterfaceDesktopPreview() {
	return (
		<section className="pointer-events-auto mt-8">
			<div
				aria-label="Chaterface desktop UI preview"
				className="small-shadow overflow-x-auto rounded-[16px] border border-grayscale-3 bg-grayscale-2 p-1.5 dark:border-grayscale-4 dark:bg-grayscale-3"
				role="img"
			>
				<div className="flex h-[540px] min-w-[1080px] overflow-hidden rounded-[13px] border border-grayscale-3 bg-grayscale-1 text-[11px] leading-4 text-grayscale-12 dark:border-grayscale-4">
					<aside className="flex w-64 shrink-0 flex-col border-grayscale-3 border-r bg-grayscale-1 p-2 dark:border-grayscale-4">
						<div className="mb-2 flex items-start justify-between gap-2 bg-grayscale-1 pb-2">
							<div className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1">
								<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-9 font-semibold text-[10px] text-white">
									CF
								</div>
								<span className="flex min-w-0 flex-1 flex-col text-left">
									<span className="truncate text-sm leading-tight text-grayscale-12">
										Chaterface
									</span>
									<span className="truncate text-[11px] leading-tight text-grayscale-10">
										Acme Labs
									</span>
								</span>
							</div>
							<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-grayscale-2 text-grayscale-11">
								<SidebarSimpleIcon size={16} weight="bold" />
							</span>
						</div>
						<div className="flex flex-col gap-px">
							<PreviewNavItem
								icon={<TerminalWindowIcon size={15} weight="bold" />}
							>
								Agent Environment
							</PreviewNavItem>
							<PreviewNavItem icon={<UsersThreeIcon size={15} weight="bold" />}>
								Humans
							</PreviewNavItem>
							<PreviewNavItem
								icon={<DesktopTowerIcon size={15} weight="bold" />}
							>
								Agents
							</PreviewNavItem>
						</div>
						<PreviewButton className="mt-2 w-full justify-start" shortcut="N">
							<PlayCircleIcon weight="bold" className="size-4 shrink-0" />
							<p className="min-w-0 flex-1 truncate text-current">New Task</p>
						</PreviewButton>
						<div className="mt-3 flex items-center justify-between px-3">
							<p className="font-mono font-semibold text-[11px] leading-none text-grayscale-10 uppercase">
								Active Tasks
							</p>
							<p className="font-mono font-semibold text-[11px] leading-none text-grayscale-10 uppercase">
								4
							</p>
						</div>
						<div className="mt-2 flex min-w-0 flex-col gap-px">
							<PreviewTask
								active
								name="Refresh homepage preview"
								status="running"
							/>
							<PreviewTask name="Wire Slack install callback" status="idle" />
							<PreviewTask name="Review MCP server scopes" status="queued" />
							<PreviewTask
								name="Polish secrets settings copy"
								status="complete"
							/>
						</div>
					</aside>

					<section className="flex min-w-0 flex-1 flex-col overflow-hidden">
						<div className="flex shrink-0 items-center justify-between border-grayscale-4 border-b p-1.5">
							<div className="flex min-w-0 flex-row items-center">
								<span className="flex size-6 shrink-0 items-center justify-center text-grayscale-11">
									<SidebarSimpleIcon size={16} weight="bold" />
								</span>
								<p className="truncate p-1 text-grayscale-11 text-sm">
									Refresh homepage preview
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-1.5">
								<PreviewButton variant="secondary" className="h-7">
									<GitPullRequestIcon weight="bold" className="size-4" />
									<span>View PR</span>
								</PreviewButton>
								<PreviewButton variant="secondary" className="h-7">
									<CheckCircleIcon weight="bold" className="size-4 shrink-0" />
									Mark as complete
								</PreviewButton>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2 border-grayscale-4 border-b px-3 py-1.5">
							<div className="relative flex min-w-0 flex-1 flex-row items-center gap-1.5 overflow-x-auto rounded-md">
								<PreviewSession active label="Codex" status="running" />
								<PreviewSession label="Review" status="idle" />
							</div>
							<PreviewButton variant="secondary" className="h-7 shrink-0">
								<PlayCircleIcon weight="bold" className="size-4" />
								Add session
							</PreviewButton>
							<PreviewTabs active="Minified" items={["Minified", "Full"]} />
						</div>
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
								<div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
									<PreviewEvent
										label="You"
										text="Make the landing-page preview match the current task workspace and give the page more room."
									/>
									<PreviewEvent
										label="Codex"
										tone="agent"
										text="Updated the website hero mock to show the task sidebar, session tabs, composer, and preview panel."
									/>
									<div className="rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 dark:border-grayscale-4">
										<div className="mb-2 flex items-center gap-2">
											<FileCodeIcon
												size={15}
												weight="bold"
												className="text-accent-9"
											/>
											<p className="font-mono text-[11px] text-grayscale-11">
												app/page.tsx
											</p>
											<p className="ml-auto font-mono text-[11px] text-green-10">
												+214
											</p>
										</div>
										<div className="space-y-1 font-mono text-[10px]">
											<div className="rounded bg-green-3 px-2 py-1 text-green-11">
												+ &lt;PreviewSession active label=&quot;Codex&quot;
												/&gt;
											</div>
											<div className="rounded bg-red-3 px-2 py-1 text-red-11">
												- &lt;h3&gt;Spawn a new worker&lt;/h3&gt;
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="shrink-0 px-2">
								<div className="mx-auto w-full max-w-3xl rounded-t-xl border border-grayscale-3 bg-grayscale-2 px-1.5 pt-1.5 dark:border-grayscale-4">
									<div className="overflow-hidden rounded-t-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-3">
										<div className="min-h-20 p-3 text-grayscale-10 text-sm">
											Tighten the mobile spacing and verify the new preview on
											desktop.
										</div>
										<div className="flex items-center justify-between p-3">
											<div className="flex items-center gap-2">
												<PreviewButton variant="secondary" className="h-7">
													<PaperclipIcon weight="bold" className="size-4" />
													Attach
												</PreviewButton>
												<span className="group relative flex flex-row items-center justify-between gap-2 rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-grayscale-11 text-xs opacity-100 outline-none transition-colors duration-150">
													GPT-5 Codex
												</span>
											</div>
											<PreviewButton>Send Message</PreviewButton>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					<aside className="flex w-[390px] shrink-0 flex-col border-grayscale-4 border-l bg-grayscale-1">
						<div className="flex items-center gap-1.5 border-grayscale-4 border-b p-1.5">
							<PreviewTabs
								active="Previews"
								items={["Previews", "PRs", "Changes", "Terminal"]}
							/>
							<span className="ml-auto flex size-6 items-center justify-center text-grayscale-11">
								<SidebarSimpleIcon
									size={16}
									weight="bold"
									className="-scale-x-100"
								/>
							</span>
						</div>
						<div className="flex items-center justify-between gap-2 border-grayscale-4 border-b p-2">
							<p className="truncate text-grayscale-10 text-xs">
								pnpm --filter web-app dev
							</p>
							<div className="flex shrink-0 gap-1.5">
								<span className="group relative flex flex-row items-center gap-2 bg-grayscale-3 p-1.5 px-3 text-grayscale-12 text-xs hover:bg-accent-3">
									<CornersOutIcon
										weight="bold"
										className="size-4 text-accent-9"
									/>
									Fullscreen
								</span>
								<span className="group relative flex flex-row items-center gap-2 bg-grayscale-3 p-1.5 px-3 text-grayscale-12 text-xs hover:bg-red-3">
									<XCircleIcon weight="bold" className="size-4 text-red-9" />
									Stop
								</span>
							</div>
						</div>
						<div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-grayscale-2">
							<div className="flex h-8 items-center gap-2 border-grayscale-3 border-b bg-grayscale-2 px-3 dark:border-grayscale-4 dark:bg-grayscale-3">
								<span className="size-2 rounded-full bg-red-9" />
								<span className="size-2 rounded-full bg-amber-9" />
								<span className="size-2 rounded-full bg-green-9" />
								<p className="ml-2 truncate font-mono text-[10px] text-grayscale-10">
									localhost:3001
								</p>
							</div>
							<div className="flex flex-1 flex-col overflow-hidden p-3">
								<div className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4">
									<div className="flex items-center gap-2">
										<Logo className="size-6 rounded" />
										<p className="font-medium text-grayscale-12">Chaterface</p>
									</div>
									<p className="mt-4 max-w-56 text-balance font-medium text-grayscale-12 text-sm">
										Open-source workspace for supervised agent tasks.
									</p>
									<div className="mt-4 h-24 rounded-lg border border-grayscale-3 bg-grayscale-2 p-2 dark:border-grayscale-4 dark:bg-grayscale-3">
										<div className="mb-2 h-2 w-28 rounded bg-grayscale-5" />
										<div className="grid grid-cols-3 gap-2">
											<div className="h-14 rounded bg-accent-3" />
											<div className="h-14 rounded bg-green-3" />
											<div className="h-14 rounded bg-orange-3" />
										</div>
									</div>
								</div>
								<div className="mt-3 grid grid-cols-2 gap-2">
									<div className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4">
										<GitPullRequestIcon
											size={16}
											weight="bold"
											className="text-green-9"
										/>
										<p className="mt-2 text-grayscale-12 text-xs">PR ready</p>
										<p className="text-[11px] text-grayscale-10">2 files</p>
									</div>
									<div className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4">
										<TerminalWindowIcon
											size={16}
											weight="bold"
											className="text-accent-9"
										/>
										<p className="mt-2 text-grayscale-12 text-xs">Terminal</p>
										<p className="text-[11px] text-grayscale-10">running</p>
									</div>
								</div>
							</div>
						</div>
					</aside>
				</div>
			</div>
		</section>
	);
}

function PreviewNavItem({
	children,
	icon,
}: {
	children: React.ReactNode;
	icon: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-grayscale-11 text-sm">
			<span className="shrink-0">{icon}</span>
			<span className="min-w-0 flex-1 truncate">{children}</span>
		</div>
	);
}

function PreviewButton({
	children,
	className = "",
	shortcut,
	variant = "primary",
}: {
	children: React.ReactNode;
	className?: string;
	shortcut?: string;
	variant?: "primary" | "secondary";
}) {
	const variantClassName = {
		primary:
			"border-grayscale-12 bg-grayscale-12 text-grayscale-1 hover:border-grayscale-11 hover:bg-grayscale-11",
		secondary:
			"border-grayscale-4 bg-grayscale-1 text-grayscale-12 hover:border-grayscale-5 hover:bg-grayscale-2",
	};

	return (
		<span
			className={`group relative flex h-8 min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 font-medium text-xs whitespace-nowrap transition-colors duration-150 [&>svg]:shrink-0 ${variantClassName[variant]} ${shortcut ? "pr-1.5" : ""} ${className}`}
		>
			{children}
			{shortcut ? (
				<kbd className="hidden min-h-5 min-w-5 shrink-0 items-center justify-center rounded border border-grayscale-11 bg-grayscale-11 px-1.5 py-1 font-mono font-medium text-[11px] text-grayscale-1 leading-none uppercase transition-colors sm:inline-flex">
					{shortcut}
				</kbd>
			) : null}
		</span>
	);
}

function PreviewTabs({ active, items }: { active: string; items: string[] }) {
	return (
		<div className="relative flex flex-row items-center gap-1.5 overflow-x-auto rounded-md">
			{items.map((item) => (
				<span
					className={`group relative z-10 shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-xs transition-colors duration-150 ${item === active ? "bg-grayscale-3 text-grayscale-12" : "text-grayscale-10"}`}
					key={item}
				>
					<span className="relative z-10">{item}</span>
				</span>
			))}
		</div>
	);
}

function PreviewTask({
	active = false,
	name,
	status,
}: {
	active?: boolean;
	name: string;
	status: "complete" | "idle" | "queued" | "running";
}) {
	return (
		<div
			className={`relative rounded-md px-3 py-1.5 text-sm text-grayscale-11 ${active ? "bg-grayscale-3 text-grayscale-12" : ""}`}
		>
			<span className="flex min-w-0 items-center gap-2.5">
				<span className="min-w-0 flex-1 truncate">{name}</span>
				{status === "complete" ? null : (
					<PreviewTaskStatusDots
						status={status === "running" ? "running" : "idle"}
					/>
				)}
			</span>
		</div>
	);
}

function PreviewSession({
	active = false,
	label,
	status,
}: {
	active?: boolean;
	label: string;
	status: "idle" | "running";
}) {
	return (
		<span
			className={`group relative z-10 shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-grayscale-10 text-xs transition-colors duration-150 ${active ? "bg-grayscale-3 text-grayscale-12" : ""}`}
		>
			<span className="relative z-10 flex min-w-0 items-center gap-2">
				<PreviewTaskStatusDots status={status} />
				<span className="truncate">{label}</span>
			</span>
		</span>
	);
}

function PreviewTaskStatusDots({
	status,
}: {
	status: "failed" | "idle" | "running";
}) {
	const dotIndexes = [0, 1, 2, 3, 4, 5];

	return (
		<span className="grid w-max shrink-0 grid-cols-2 gap-px" role="status">
			{dotIndexes.map((index) => {
				const isRunning = status === "running";

				return (
					<span
						className={`task-status-dot size-[3px] rounded-[1px] ${
							status === "failed"
								? "bg-red-9"
								: isRunning
									? "task-status-dot--running bg-accent-9"
									: "bg-green-9"
						}`}
						key={`preview-task-status-dot-${status}-${index}`}
						style={
							isRunning ? { animationDelay: `${index * 0.12}s` } : undefined
						}
					/>
				);
			})}
		</span>
	);
}

function PreviewEvent({
	label,
	text,
	tone = "user",
}: {
	label: string;
	text: string;
	tone?: "agent" | "user";
}) {
	return (
		<div className="flex items-start gap-2">
			<div
				className={`flex size-6 shrink-0 items-center justify-center rounded-md font-semibold text-[10px] text-white ${tone === "agent" ? "bg-accent-9" : "bg-orange-9"}`}
			>
				{label.slice(0, 2).toUpperCase()}
			</div>
			<div className="min-w-0 flex-1 rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 text-grayscale-11 text-xs dark:border-grayscale-4">
				<p className="mb-1 font-medium text-grayscale-12">{label}</p>
				<p>{text}</p>
			</div>
		</div>
	);
}

function FeatureGrid() {
	return (
		<section className="pointer-events-auto mt-8">
			<div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
				{featureCards.map((feature) => (
					<div
						className="flex flex-col items-start gap-2 p-2"
						key={feature.title}
					>
						<div className={feature.iconClassName}>{feature.icon}</div>
						<div>
							<h3 className="font-medium text-grayscale-12 text-sm">
								{feature.title}
							</h3>
							<p className="mt-1 text-grayscale-11 text-sm leading-5">
								{feature.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function TechStackSection() {
	return (
		<section className="pointer-events-auto mt-14 px-2">
			<h2 className="font-medium text-grayscale-12 text-sm">Tech stack</h2>
			<p className="mt-1 max-w-xl text-grayscale-11 text-sm leading-5">
				Chaterface is built from familiar web app tools and agent infrastructure
				you can run, inspect, and connect yourself.
			</p>

			<div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
				{techStackCards.map((item) => (
					<div className="flex flex-col items-start gap-2 p-2" key={item.title}>
						<div className="flex size-8 items-center justify-start text-grayscale-12">
							{item.logo}
						</div>
						<div>
							<h3 className="font-medium text-grayscale-12 text-sm">
								{item.title}
							</h3>
							<p className="mt-1 text-grayscale-11 text-sm leading-5">
								{item.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
