import { redirect } from "next/navigation";

export default async function TasksPage({
	params,
}: {
	params: Promise<{ orgHandle: string; factoryId: string }>;
}) {
	const { orgHandle, factoryId } = await params;

	redirect(`/${orgHandle}/factories/${factoryId}`);
}
