"use client";

import {
	CheckIcon,
	FloppyDiskIcon,
	MoonIcon,
	SignOutIcon,
	SunIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input } from "@/components/Input";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import SignOutButton from "@/components/SignOutButton";
import {
	CHAT_VIEW_MODES,
	type ChatViewMode,
	DEFAULT_CHAT_VIEW_MODE,
	getStoredDefaultChatViewMode,
	setStoredDefaultChatViewMode,
} from "@/helpers/chat-view-helper";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";

const THEME_OPTIONS = [
	{
		value: "light",
		label: "Light",
		Icon: SunIcon,
	},
	{
		value: "dark",
		label: "Dark",
		Icon: MoonIcon,
	},
] as const;

const CHAT_VIEW_LABELS: Record<ChatViewMode, string> = {
	minified: "Minified",
	full: "Full",
};

const userTx = (userId: string) => {
	const tx = db.tx.$users[userId];

	if (!tx) {
		throw new Error(`User transaction builder ${userId} not found`);
	}

	return tx;
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

export default function PersonalSettingsPage() {
	return (
		<div className="relative h-full w-full overflow-y-auto bg-grayscale-1">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
				<div className="flex flex-col gap-1">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Personal Settings
					</p>
					<h1 className="text-lg font-medium text-grayscale-12">
						Your preferences
					</h1>
					<p className="text-sm text-grayscale-10">
						Appearance and account controls for your workspace.
					</p>
				</div>

				<section className="relative border border-grayscale-4 bg-grayscale-1">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<UserCircleIcon weight="bold" className="size-4" />
							Identity
						</div>
					</div>
					<div className="flex flex-col gap-3 p-3">
						<ProfileNameSetting />
					</div>
				</section>

				<section className="relative border border-grayscale-4 bg-grayscale-1">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<UserCircleIcon weight="bold" className="size-4" />
							Appearance
						</div>
					</div>
					<div className="flex flex-col gap-3 p-3">
						<Field label="Theme">
							<ThemeSetting />
						</Field>
						<Field label="Default chat view">
							<DefaultChatViewSetting />
						</Field>
					</div>
				</section>

				<section className="relative border border-grayscale-4 bg-grayscale-1">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<SignOutIcon weight="bold" className="size-4" />
							Account
						</div>
					</div>
					<div className="flex p-3">
						<SignOutButton />
					</div>
				</section>
			</div>
		</div>
	);
}

function ProfileNameSetting() {
	const { orgHandle } = useParams();
	const currentOrgHandle = orgHandle as string;
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";
	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			members: {
				user: {},
			},
		},
	});
	const member = data?.organisations?.[0]?.members?.find(
		(member) => member.user?.id === currentUserId,
	);
	const userRecord = member?.user;
	const [userName, setUserName] = useState("");
	const [memberName, setMemberName] = useState("");
	const [status, setStatus] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setUserName(userRecord?.name ?? "");
		setMemberName(member?.name ?? "");
	}, [member?.name, userRecord?.name]);

	const saveProfile = async () => {
		if (!user?.id || isSaving) {
			return;
		}

		setStatus(undefined);
		setIsSaving(true);

		try {
			await db.transact([
				userTx(user.id).update({
					name: normalizeName(userName),
				}),
				...(member?.id
					? [
							memberTx(member.id).update({
								name: normalizeName(memberName),
							}),
						]
					: []),
			]);

			setStatus("Saved.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to save.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="grid gap-3 md:grid-cols-2">
				<Field label="User name">
					<Input
						placeholder="Your name"
						value={userName}
						onChange={(event) => setUserName(event.target.value)}
						onSubmit={saveProfile}
					/>
				</Field>
				<Field label="Member name">
					<Input
						placeholder="Organisation display name"
						value={memberName}
						onChange={(event) => setMemberName(event.target.value)}
						onSubmit={saveProfile}
					/>
				</Field>
			</div>
			<div className="flex items-center justify-between gap-3">
				<p className="min-w-0 text-xs text-grayscale-10">
					{status ?? "Member name overrides user name in this organisation."}
				</p>
				<Button
					type="button"
					disabled={isSaving || !user?.id}
					onClick={saveProfile}
					className="shrink-0"
				>
					<FloppyDiskIcon weight="bold" className="size-4" />
					{isSaving ? "Saving..." : "Save"}
				</Button>
			</div>
		</div>
	);
}

function normalizeName(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function ThemeSetting() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const selectedTheme = mounted && theme === "dark" ? "dark" : "light";

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2">
			{THEME_OPTIONS.map(({ value, label, Icon }) => {
				const selected = selectedTheme === value;

				return (
					<button
						key={value}
						type="button"
						aria-pressed={selected}
						onClick={() => setTheme(value)}
						className={cn(
							"group relative flex min-h-12 items-center justify-between gap-3 border border-grayscale-4 bg-grayscale-2 px-3 py-2 text-left transition-colors hover:border-grayscale-6 hover:bg-grayscale-3",
							selected ? "border-accent-8 bg-accent-2" : "",
						)}
					>
						<CornerBrackets
							placement="inside"
							color={selected ? "accent-9" : "grayscale-8"}
							size={6}
							active={selected}
						/>
						<span className="flex min-w-0 items-center gap-2">
							<Icon
								weight="bold"
								className="size-4 shrink-0 text-grayscale-11"
							/>
							<span className="truncate text-sm font-medium text-grayscale-12">
								{label}
							</span>
						</span>
						{selected ? (
							<CheckIcon
								weight="bold"
								className="size-4 shrink-0 text-accent-9"
							/>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

function DefaultChatViewSetting() {
	const [selectedView, setSelectedView] = useState<ChatViewMode>(
		DEFAULT_CHAT_VIEW_MODE,
	);

	useEffect(() => {
		setSelectedView(getStoredDefaultChatViewMode());
	}, []);

	const selectView = (value: ChatViewMode) => {
		setSelectedView(value);
		setStoredDefaultChatViewMode(value);
	};

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2">
			{CHAT_VIEW_MODES.map((value) => {
				const selected = selectedView === value;

				return (
					<button
						key={value}
						type="button"
						aria-pressed={selected}
						onClick={() => selectView(value)}
						className={cn(
							"group relative flex min-h-12 items-center justify-between gap-3 border border-grayscale-4 bg-grayscale-2 px-3 py-2 text-left transition-colors hover:border-grayscale-6 hover:bg-grayscale-3",
							selected ? "border-accent-8 bg-accent-2" : "",
						)}
					>
						<CornerBrackets
							placement="inside"
							color={selected ? "accent-9" : "grayscale-8"}
							size={6}
							active={selected}
						/>
						<span className="truncate text-sm font-medium text-grayscale-12">
							{CHAT_VIEW_LABELS[value]}
						</span>
						{selected ? (
							<CheckIcon
								weight="bold"
								className="size-4 shrink-0 text-accent-9"
							/>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<p className="text-xs text-grayscale-11">{label}</p>
			{children}
		</div>
	);
}
