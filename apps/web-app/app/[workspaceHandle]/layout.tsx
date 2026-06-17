"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
	Group,
	Panel,
	type PanelImperativeHandle,
	Separator,
} from "react-resizable-panels";
import MobileDrawer from "@/components/MobileDrawer";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import { rememberLastWorkspace } from "@/helpers/last-workspace-helper";
import db from "@/instant.client";

const MIN_SIDEBAR_SIZE = "160px";
const MAX_SIDEBAR_SIZE = "480px";
const DEFAULT_SIDEBAR_SIZE = "256px";

export default function WorkspaceLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<WorkspaceLayoutChrome>{children}</WorkspaceLayoutChrome>
		</SidebarProvider>
	);
}

function WorkspaceLayoutChrome({ children }: { children: React.ReactNode }) {
	const { workspaceHandle } = useParams();
	const { user } = db.useAuth();
	const { isMobile, isCollapsed, collapse, expand } = useSidebar();
	const sidebarPanelRef = useRef<PanelImperativeHandle>(null);
	const currentWorkspaceHandle =
		typeof workspaceHandle === "string" ? workspaceHandle : "";
	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
		},
	});
	const workspaceId = data?.workspaces?.[0]?.id;

	useEffect(() => {
		if (!user?.id || !currentWorkspaceHandle || !workspaceId) {
			return;
		}

		rememberLastWorkspace({
			workspaceId,
			workspaceHandle: currentWorkspaceHandle,
			userId: user.id,
		});
	}, [workspaceId, currentWorkspaceHandle, user?.id]);

	useEffect(() => {
		const sidebarPanel = sidebarPanelRef.current;

		if (!sidebarPanel || isMobile) {
			return;
		}

		if (isCollapsed) {
			sidebarPanel.collapse();
		} else if (sidebarPanel.isCollapsed()) {
			sidebarPanel.expand();
		}
	}, [isCollapsed, isMobile]);

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden">
			<MobileHeader />

			{isMobile ? (
				<>
					<MobileDrawer side="left" isOpen={!isCollapsed} onClose={collapse}>
						<Sidebar />
					</MobileDrawer>
					<div className="relative min-h-0 min-w-0 flex-1">{children}</div>
				</>
			) : (
				<Group orientation="horizontal" className="min-h-0 min-w-0 flex-1">
					<Panel
						panelRef={sidebarPanelRef}
						id="sidebar"
						defaultSize={DEFAULT_SIDEBAR_SIZE}
						minSize={MIN_SIDEBAR_SIZE}
						maxSize={MAX_SIDEBAR_SIZE}
						collapsible={true}
						collapsedSize="0px"
						onResize={(size) => {
							if (size.inPixels === 0) {
								collapse();
							} else {
								expand();
							}
						}}
					>
						<div className="h-full min-w-0 overflow-hidden">
							<Sidebar />
						</div>
					</Panel>
					<Separator
						id="sidebar-resize-handle"
						aria-label="Resize task sidebar"
						className="relative z-10 w-px shrink-0 cursor-col-resize bg-grayscale-4 transition-colors hover:bg-accent-8 focus-visible:bg-accent-8 focus-visible:outline-none"
					/>
					<Panel id="content" minSize="40%">
						<div className="relative h-full min-h-0 min-w-0">{children}</div>
					</Panel>
				</Group>
			)}
		</div>
	);
}
