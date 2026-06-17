"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CornerBrackets from "@/components/CornerBrackets";
import { ServicePreviewFrame } from "@/components/ServicePreviewFrame";
import db from "@/instant.client";

export default function FullscreenServicePreviewPage() {
	const { serviceId } = useParams();
	const currentServiceId = serviceId as string;
	const { user } = db.useAuth();
	const { data, error, isLoading } = db.useQuery({
		services: {
			$: {
				where: {
					id: currentServiceId,
				},
			},
			task: {
				workspace: {},
			},
		},
	});
	const service = data?.services?.[0];
	const task = service?.task;
	const workspace = task?.workspace;
	const taskHref =
		task && workspace ? `/${workspace.handle}/tasks/${task.id}` : undefined;

	if (isLoading) {
		return (
			<main className="flex h-full w-full items-center justify-center text-xs text-grayscale-10">
				Loading preview...
			</main>
		);
	}

	if (error) {
		return (
			<main className="flex h-full w-full items-center justify-center text-xs text-red-10">
				Error: {error.message}
			</main>
		);
	}

	if (!service) {
		return (
			<main className="flex h-full w-full items-center justify-center text-xs text-grayscale-10">
				Service not found
			</main>
		);
	}

	return (
		<main className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-grayscale-1">
			<header className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-grayscale-4 px-3 py-2">
				<div className="min-w-0">
					<p className="truncate text-sm text-grayscale-12">
						{task?.name ?? "Task preview"}
					</p>
					<p className="truncate text-xs text-grayscale-10">{service.name}</p>
				</div>
				{taskHref ? (
					<Link
						href={taskHref}
						className="bg-grayscale-3 shrink-0 p-1.5 px-3 flex flex-row items-center gap-2 group relative hover:bg-accent-3"
					>
						<CornerBrackets
							placement="inside"
							spacing={1}
							translate={1.5}
							size={6}
							color="var(--color-accent-9)"
						/>
						<ArrowLeftIcon weight="bold" className="size-4 text-accent-9" />
						<p className="text-xs text-grayscale-12">Back to task</p>
					</Link>
				) : null}
			</header>
			<div className="min-h-0 flex-1">
				{service.url ? (
					<ServicePreviewFrame
						serviceId={service.id}
						serviceName={service.name}
						userToken={user?.refresh_token}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
						Service has no preview URL
					</div>
				)}
			</div>
		</main>
	);
}
