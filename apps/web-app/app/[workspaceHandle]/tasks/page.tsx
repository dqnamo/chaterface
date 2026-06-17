import { redirect } from "next/navigation";

export default async function TasksPage({
	params,
}: {
	params: Promise<{ workspaceHandle: string }>;
}) {
	const { workspaceHandle } = await params;

	redirect(`/${workspaceHandle}`);
}
