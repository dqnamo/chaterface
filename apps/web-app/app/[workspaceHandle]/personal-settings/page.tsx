"use client";

import { PersonalSettingsContent } from "@/components/PersonalSettings";
import { ExpandSidebarButton } from "@/components/SidebarContext";

export default function PersonalSettingsPage() {
	return (
		<div className="relative h-full w-full overflow-y-auto bg-grayscale-1">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="mx-auto w-full max-w-3xl px-4 py-14 md:px-8">
				<PersonalSettingsContent />
			</div>
		</div>
	);
}
