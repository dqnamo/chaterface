"use client";

import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import db from "@/instant.client";

type InviteMember = {
	id: string;
	joinedAt?: string;
	role?: string;
	user?: {
		email?: string;
	};
	workspace?: {
		name?: string;
		handle?: string;
	};
};

export default function InvitePage() {
	const { inviteToken } = useParams();
	const router = useRouter();
	const { user } = db.useAuth();
	const token = typeof inviteToken === "string" ? inviteToken : "";
	const [status, setStatus] = useState<string>();
	const [isAccepting, setIsAccepting] = useState(false);
	const { data, isLoading, error } = db.useQuery({
		members: {
			$: {
				where: {
					inviteToken: token || "__missing__",
				},
			},
			user: {},
			workspace: {},
		},
	});
	const member = data?.members?.[0] as InviteMember | undefined;
	const invitedEmail = member?.user?.email;
	const userEmail = user?.email;
	const isSignedInAsInvitee = useMemo(() => {
		if (!invitedEmail || !userEmail) {
			return false;
		}

		return invitedEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();
	}, [invitedEmail, userEmail]);

	const acceptInvite = async () => {
		if (!token || !user?.refresh_token || isAccepting) {
			return;
		}

		setIsAccepting(true);
		setStatus(undefined);

		try {
			const response = await fetch(`/api/invites/${token}/accept`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.refresh_token}`,
				},
			});
			const result = (await response.json().catch(() => null)) as {
				message?: string;
				redirectTo?: string;
			} | null;

			if (!response.ok) {
				throw new Error(result?.message ?? "Failed to accept invite");
			}

			router.replace(result?.redirectTo ?? "/");
		} catch (error) {
			setStatus(
				error instanceof Error ? error.message : "Failed to accept invite",
			);
		} finally {
			setIsAccepting(false);
		}
	};

	return (
		<main className="flex h-full w-full flex-col items-center justify-center gap-4 px-4">
			<Logo size={6} />
			<section className="relative flex w-full max-w-md flex-col border border-grayscale-4 bg-grayscale-1">
				<CornerBrackets
					placement="outside"
					spacing={3}
					translate={12}
					size={6}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="flex flex-col gap-1 border-b border-grayscale-4 p-3">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Workspace invite
					</p>
					<h1 className="text-lg font-medium text-grayscale-12">
						{member?.workspace?.name
							? `Join ${member.workspace.name}`
							: "Join Chaterface"}
					</h1>
				</div>
				<div className="flex flex-col gap-3 p-3">
					{isLoading ? (
						<p className="text-sm text-grayscale-10">Loading invite...</p>
					) : error ? (
						<p className="text-sm text-red-11">{error.message}</p>
					) : member ? (
						<>
							<p className="text-sm text-grayscale-11">
								This invite was sent to{" "}
								<span className="font-medium text-grayscale-12">
									{invitedEmail ?? "this account"}
								</span>
								.
							</p>
							<p className="text-xs text-grayscale-10">
								You are signed in as {userEmail ?? "this account"}.
							</p>
							{isSignedInAsInvitee ? null : (
								<p className="border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
									Sign in with the invited email address before joining.
								</p>
							)}
						</>
					) : (
						<p className="text-sm text-red-11">
							This invite is invalid or has already been accepted.
						</p>
					)}
					{status ? (
						<p className="border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
							{status}
						</p>
					) : null}
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-grayscale-4 p-3">
					<SignOutButton />
					<Button
						type="button"
						disabled={!member || !isSignedInAsInvitee || isAccepting}
						onClick={acceptInvite}
						className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{isAccepting ? (
							<CheckCircleIcon weight="bold" className="size-4" />
						) : (
							<ArrowRightIcon weight="bold" className="size-4" />
						)}
						{isAccepting ? "Joining..." : "Join workspace"}
					</Button>
				</div>
			</section>
		</main>
	);
}
