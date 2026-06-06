"use client";

import db from "@repo/db/client";
import { useParams } from "next/navigation";
import { useState } from "react";
import {id, lookup } from "@instantdb/react";
import { DateTime } from "luxon";

const getApiUrl = (path: string) => {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
	return new URL(path, apiBaseUrl).toString();
};

export default function SecretsPage() {
	const { orgHandle, factoryId } = useParams();
	const currentOrganisationHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrganisationHandle,
				},
			},
			members: {},
		},
	});
	const organisation = data?.organisations[0];
	const members = data?.organisations[0]?.members;

	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");


	const createMember = async () => {
		const memberId = id();
		await db.transact(db.tx.members[memberId]!.create({
			createdAt: DateTime.now().toISO(),
			role,
		}).link({ organisation: organisation?.id }));
		
		await fetch("/members/invite"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				token: user?.refresh_token,
			},
			body: JSON.stringify({
				organisationId: organisation?.id,
				memberId,
				email,
				role,
			}),
		}
	};
	return (
		<div>
			<h1>Members</h1>
			<ul>
				{members?.map((member) => (
					<li key={member.id}>{member.role}</li>
				))}
			</ul>

			<div className="flex flex-col gap-4">
				<h2>Create Member</h2>
				<input
					type="text"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Role"
					value={role}
					onChange={(e) => setRole(e.target.value)}
				/>
				<button
					type="button"
					onClick={() => {
						createMember();
					}}
				>
					Create
				</button>
			</div>
		</div>
	);
}