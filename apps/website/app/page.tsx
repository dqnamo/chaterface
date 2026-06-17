import {
	ArrowRightIcon,
	CheckCircleIcon,
	CornersOutIcon,
	DesktopTowerIcon,
	FadersIcon,
	FileCodeIcon,
	FilesIcon,
	GithubLogoIcon,
	GitPullRequestIcon,
	PaperclipIcon,
	PlayCircleIcon,
	PlugsConnectedIcon,
	RocketLaunchIcon,
	SidebarSimpleIcon,
	TerminalWindowIcon,
	TextboxIcon,
	UsersThreeIcon,
	XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import Logo from "@/components/Logo";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import PixelTrail from "@/components/public/PixelTrail";

export const metadata: Metadata = {
	title: "Chaterface",
	applicationName: "Chaterface",
	description:
		"Open source, collaborative software workspace running in the cloud using your existing codex agents.",
	appleWebApp: {
		title: "Chaterface",
	},
};

const featureCards = [
	{
		description:
			"Spin up a dedicated cloud worker for every prompt — including queued follow-ups and long-running jobs.",
		icon: <RocketLaunchIcon size={18} weight="bold" />,
		iconClassName: "text-accent-11",
		title: "Cloud workers",
	},
	{
		description:
			"Invite supervisors into the same workspace so product, engineering, and ops can steer the work together.",
		icon: <UsersThreeIcon size={18} weight="bold" />,
		iconClassName: "text-green-11",
		title: "Shared supervision",
	},
	{
		description:
			"Plug in MCP servers and external tools without rebuilding your agent environment from scratch.",
		icon: <PlugsConnectedIcon size={18} weight="bold" />,
		iconClassName: "text-cyan-11",
		title: "Tool integrations",
	},
	{
		description:
			"Install reusable skills onto the workspace computer so the workflows you run again and again just work.",
		icon: <FilesIcon size={18} weight="bold" />,
		iconClassName: "text-orange-11",
		title: "Skills library",
	},
	{
		description:
			"Store secrets at the workspace level so every worker can use them securely.",
		icon: <TextboxIcon size={18} weight="bold" />,
		iconClassName: "text-crimson-11",
		title: "Secret handling",
	},
	{
		description:
			"Point workers at your repos and Git credentials so their changes can land cleanly.",
		icon: <GithubLogoIcon size={18} weight="bold" />,
		iconClassName: "text-grayscale-11",
		title: "GitHub setup",
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
					<div className="pointer-events-auto flex w-fit max-w-full flex-col gap-px p-2">
						<div className="flex flex-row items-center gap-1.5">
							<Logo className="size-9 rounded-md" />
							<p className="text-md font-medium leading-6 text-grayscale-12">
								Chaterface
							</p>
						</div>
						<p className="max-w-lg text-balance text-lg font-medium leading-6 text-grayscale-12 mt-8">
							Open source, collaborative software workspace running in the cloud
							using your existing codex agents.
						</p>
						<p className="max-w-lg text-balance text-sm leading-6 text-grayscale-11 mt-1">
							Spin up workers in the cloud, invite supervisors, and steer the
							work together — all from one place.
						</p>
						<div className="mt-4 flex flex-row flex-wrap items-center gap-2">
							<Button
								className="text-xs"
								href="https://app.chaterface.com"
								variant="primary"
							>
								<RocketLaunchIcon size={16} weight="bold" />
								Get Started
							</Button>
							<Button
								className="text-xs"
								href="https://github.com/dqnamo/chaterface"
								target="_blank"
								variant="secondary"
							>
								<GithubLogoIcon size={16} weight="bold" />
								GitHub repo
							</Button>
						</div>
					</div>

					<ChaterfaceDesktopPreview />
					<FeatureGrid />

					<div className="pointer-events-auto mt-8 flex flex-col gap-2">
						<div className="flex flex-col gap-px p-2">
							<h2 className="font-medium text-grayscale-12">Pricing & plans</h2>
							<p className="text-sm text-grayscale-11">
								Start free with Builder for solo use, then move to Team when you
								need more members.
							</p>
						</div>

						<Card
							layer={0}
							className="p-1.5 grid grid-cols-3 gap-1.5 rounded-[16px]"
						>
							<Card
								layer={0}
								className="p-0 bg-grayscale-1 dark:bg-grayscale-3 dark:border-grayscale-5 rounded-[13px] small-shadow"
							>
								<div className="flex flex-col h-full">
									<div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
										<p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
											Open source
										</p>
									</div>
									<div className="p-4">
										<div className="flex flex-col">
											<h3 className="text-lg font-medium text-grayscale-12">
												Free
											</h3>
											<p className="text-xs text-grayscale-10">Forever</p>
										</div>
										<p className="text-sm text-grayscale-10 mt-4">
											Run it yourself on your own infrastructure.
										</p>
									</div>
									<div className="flex flex-row p-2 mt-auto w-full">
										<Button
											className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
											href="https://github.com/dqnamo/chaterface"
											target="_blank"
											variant="secondary"
										>
											View on GitHub
											<ArrowRightIcon size={14} weight="bold" />
										</Button>
									</div>
								</div>
							</Card>
							<Card
								layer={0}
								className="p-0 bg-grayscale-1 dark:bg-grayscale-3 dark:border-grayscale-5 dark:divide-grayscale-4 col-span-2 grid grid-cols-2 divide-x divide-grayscale-3 rounded-[13px] small-shadow"
							>
								<div className="flex flex-col">
									<div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
										<p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
											Builder
										</p>
									</div>
									<div className="p-4">
										<div className="flex flex-col">
											<h3 className="text-lg font-medium text-grayscale-12">
												Free
											</h3>
											<p className="text-xs text-grayscale-10">Forever</p>
										</div>

										<div className="flex flex-col mt-4 w-full gap-1">
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">
													Bring your own agents
												</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9"
												/>
											</div>
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">1 member</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9"
												/>
											</div>
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">
													Unlimited workers
												</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9 "
												/>
											</div>
										</div>
									</div>
									<div className="flex flex-row p-2 w-full mt-auto">
										<Button
											className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
											href="/login"
											variant="secondary"
										>
											Get Started
											<ArrowRightIcon size={14} weight="bold" />
										</Button>
									</div>
								</div>

								<div className="flex flex-col">
									<div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
										<p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
											Team
										</p>
									</div>
									<div className="p-4">
										<div className="flex flex-col">
											<h3 className="text-lg font-medium text-grayscale-12">
												US$50
											</h3>
											<p className="text-xs text-grayscale-10">
												Per member/month
											</p>
										</div>

										<div className="flex flex-col mt-4 w-full gap-1">
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">
													Bring your own agents
												</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9"
												/>
											</div>
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">
													Unlimited members
												</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9"
												/>
											</div>
											<div className="flex flex-row items-center justify-between">
												<p className="text-sm text-grayscale-10">
													Unlimited workers
												</p>
												<CheckCircleIcon
													size={14}
													weight="fill"
													className="text-accent-9"
												/>
											</div>
										</div>
									</div>

									<div className="flex flex-row p-2 w-full mt-auto">
										<Button
											className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
											href="/login"
											variant="secondary"
										>
											Start team plan
											<ArrowRightIcon size={14} weight="bold" />
										</Button>
									</div>
								</div>
							</Card>
						</Card>
					</div>

					<Footer className="pointer-events-auto p-2 mt-8" />
				</div>
			</div>
		</main>
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
							<PreviewNavItem icon={<FadersIcon size={15} weight="bold" />}>
								Workspace Settings
							</PreviewNavItem>
							<PreviewNavItem icon={<UsersThreeIcon size={15} weight="bold" />}>
								Personal Settings
							</PreviewNavItem>
							<PreviewNavItem
								icon={<DesktopTowerIcon size={15} weight="bold" />}
							>
								Workspace Settings
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
										Collaborative software workspace running in the cloud.
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
