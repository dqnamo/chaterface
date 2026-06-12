"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	BuildingsIcon,
	EnvelopeSimpleIcon,
	PlusIcon,
	TrashIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { ExpandSidebarButton } from "@/components/SidebarContext";

type Member = InstaQLEntity<AppSchema, "members">;

const ROLE_OPTIONS = [
	{ value: "member", label: "Member" },
	{ value: "admin", label: "Admin" },
	{ value: "owner", label: "Owner" },
] as const;

const organisationTx = (organisationId: string) => {
	const tx = db.tx.organisations[organisationId];

	if (!tx) {
		throw new Error(
			`Organisation transaction builder ${organisationId} not found`,
		);
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

const getFormString = (formData: FormData, key: string) => {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
};

export default function OrganisationSettingsPage() {
	const router = useRouter();
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");
	const [inviteStatus, setInviteStatus] = useState<string>();

	const { data, isLoading, error } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			members: {},
		},
	});

	const organisation = data?.organisations?.[0];
	const members = [...(organisation?.members ?? [])].sort(
		(firstMember, secondMember) =>
			new Date(firstMember.createdAt ?? 0).getTime() -
			new Date(secondMember.createdAt ?? 0).getTime(),
	);

	const updateOrganisation = async (form: HTMLFormElement) => {
		if (!organisation) {
			return;
		}

		const formData = new FormData(form);
		const name = getFormString(formData, "name");
		const handle = getFormString(formData, "handle");

		if (!name || !handle) {
			return;
		}

		await db.transact(
			organisationTx(organisation.id).update({
				name,
				handle,
			}),
		);

		if (handle !== currentOrgHandle) {
			router.replace(
				`/${handle}/factories/${currentFactoryId}/organisation/settings`,
			);
		}
	};

	const createMember = async () => {
		setInviteStatus(undefined);

		if (!organisation || !email.trim()) {
			setInviteStatus("Enter an email address.");
			return;
		}

		const memberId = id();
		const response = await fetch("/api/members/invite", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${user?.refresh_token}`,
			},
			body: JSON.stringify({
				organisationId: organisation.id,
				memberId,
				email: email.trim(),
				role,
			}),
		});

		if (!response.ok) {
			setInviteStatus("Member created, but invite delivery failed.");
			return;
		}

		setEmail("");
		setRole("member");
		setInviteStatus("Invite sent.");
	};

	const deleteMember = async (member: Member) => {
		await db.transact(memberTx(member.id).delete());
	};

	return (
		<div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto bg-grayscale-1">
			<ExpandSidebarButton className="absolute top-2 left-2 z-20" />
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
				<div className="flex flex-col gap-1">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Organisation Settings
					</p>
					<h1 className="text-lg font-medium text-grayscale-12">
						{organisation?.name ?? currentOrgHandle}
					</h1>
					<p className="text-sm text-grayscale-10">
						Organisation identity, membership, and shared access settings.
					</p>
				</div>

				{error ? <p className="text-sm text-red-11">{error.message}</p> : null}

				<section className="relative border border-grayscale-4 bg-white">
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
							<BuildingsIcon weight="bold" className="size-4" />
							Organisation
						</div>
					</div>
					<form
						className="flex flex-col gap-3 p-3"
						onSubmit={(event) => {
							event.preventDefault();
							void updateOrganisation(event.currentTarget);
						}}
					>
						<div className="grid gap-3 md:grid-cols-2">
							<Field label="Name">
								<Input
									name="name"
									type="text"
									placeholder="Organisation name"
									defaultValue={organisation?.name ?? ""}
								/>
							</Field>
							<Field label="Handle">
								<Input
									name="handle"
									type="text"
									placeholder="organisation-handle"
									defaultValue={organisation?.handle ?? currentOrgHandle}
								/>
							</Field>
						</div>
						<div className="flex justify-end">
							<Button type="submit">Save Organisation</Button>
						</div>
					</form>
				</section>

				<section className="relative border border-grayscale-4 bg-white">
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
							<UsersIcon weight="bold" className="size-4" />
							Members
						</div>
					</div>
					<div className="flex flex-col divide-y divide-grayscale-4">
						{isLoading ? (
							<p className="p-3 text-sm text-grayscale-10">
								Loading members...
							</p>
						) : members.length > 0 ? (
							members.map((member) => (
								<div
									key={member.id}
									className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
								>
									<div className="flex min-w-0 flex-col gap-1">
										<p className="truncate text-sm font-medium text-grayscale-12">
											{member.role ?? "member"}
										</p>
										<p className="text-xs text-grayscale-10">
											{member.joinedAt ? "Joined" : "Pending invite"}
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											void deleteMember(member);
										}}
										className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
									>
										<TrashIcon weight="bold" className="size-3.5" />
										Delete
									</button>
								</div>
							))
						) : (
							<p className="p-3 text-sm text-grayscale-10">
								No members configured.
							</p>
						)}
					</div>

					<div className="flex flex-col gap-3 border-t border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-xs font-medium text-grayscale-11">
							<PlusIcon weight="bold" className="size-3.5" />
							Add Member
						</div>
						<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
							<Field label="Email">
								<Input
									type="email"
									placeholder="teammate@example.com"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
								/>
							</Field>
							<Field label="Role">
								<Select.Root
									items={ROLE_OPTIONS}
									value={role}
									onValueChange={(value) => setRole(value ?? "member")}
								>
									<Select.Trigger>
										<Select.Value />
										<Select.Icon />
									</Select.Trigger>
									<Select.Portal>
										<Select.Positioner>
											<Select.Popup>
												<Select.List>
													{ROLE_OPTIONS.map((item) => (
														<Select.Item value={item.value} key={item.value}>
															<Select.ItemText>{item.label}</Select.ItemText>
															<Select.ItemIndicator />
														</Select.Item>
													))}
												</Select.List>
											</Select.Popup>
										</Select.Positioner>
									</Select.Portal>
								</Select.Root>
							</Field>
						</div>
						{inviteStatus ? (
							<p className="text-xs text-grayscale-10">{inviteStatus}</p>
						) : null}
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => {
									void createMember();
								}}
							>
								<EnvelopeSimpleIcon weight="bold" className="size-4" />
								Send Invite
							</Button>
						</div>
					</div>
				</section>
			</div>
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
