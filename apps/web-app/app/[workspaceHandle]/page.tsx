"use client";

import { PlusCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/Button";
import Logo from "@/components/Logo";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { ExpandSidebarButton } from "@/components/SidebarContext";

export default function WorkspacePage() {
	const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

	return (
		<div className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 md:px-0">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<Logo size={7} />
			<div className="flex max-w-md flex-col items-center justify-center gap-px text-center">
				<h1 className="text-lg font-medium text-grayscale-12">
					What do you want to build?
				</h1>
				<p className="text-balance text-sm text-grayscale-11">
					Create a fresh task and start an agent session.
				</p>
			</div>
			<Button
				type="button"
				className="mt-4"
				onClick={() => setIsNewTaskOpen(true)}
			>
				<PlusCircleIcon weight="bold" className="size-4" />
				New task
			</Button>
			<NewTaskDialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen} />
		</div>
	);
}
