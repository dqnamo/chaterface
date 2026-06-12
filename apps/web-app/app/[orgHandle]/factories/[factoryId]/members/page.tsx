import { redirect } from "next/navigation";

export default async function MembersPage({
	params,
}: {
	params: Promise<{ orgHandle: string; factoryId: string }>;
}) {
	const { orgHandle, factoryId } = await params;

	redirect(
		`/${orgHandle}/factories/${factoryId}/organisation/settings/members`,
	);
}
