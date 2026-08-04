import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import db from "@/lib/instant";

const ACTIVE_WORKSPACE_KEY = "chaterface.activeWorkspaceHandle";

export type Workspace = {
	id: string;
	name: string;
	handle: string;
};

type WorkspaceContextValue = {
	workspaces: Workspace[];
	workspace?: Workspace;
	isLoading: boolean;
	setActiveWorkspace: (handle: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Tracks which workspace the app is looking at. The web app carries this in the
 * URL (`/[workspaceHandle]/...`); on mobile it is app state, remembered across
 * launches so the app reopens where the user left off.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";
	const [storedHandle, setStoredHandle] = useState<string | null>(null);
	const [hasReadStorage, setHasReadStorage] = useState(false);

	const { data, isLoading } = db.useQuery({
		workspaces: {
			$: {
				where: { "members.user.id": currentUserId },
				fields: ["name", "handle"],
			},
		},
	});

	useEffect(() => {
		let cancelled = false;

		AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY)
			.then((value) => {
				if (!cancelled) {
					setStoredHandle(value);
					setHasReadStorage(true);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setHasReadStorage(true);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const workspaces = useMemo(
		() =>
			(data?.workspaces ?? []).map((entry) => ({
				id: entry.id,
				name: String(entry.name),
				handle: String(entry.handle),
			})),
		[data?.workspaces],
	);

	const workspace = useMemo(() => {
		if (workspaces.length === 0) {
			return undefined;
		}

		return (
			workspaces.find((entry) => entry.handle === storedHandle) ?? workspaces[0]
		);
	}, [workspaces, storedHandle]);

	const setActiveWorkspace = useCallback((handle: string) => {
		setStoredHandle(handle);
		void AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, handle);
	}, []);

	const value = useMemo(
		() => ({
			workspaces,
			workspace,
			isLoading: isLoading || !hasReadStorage,
			setActiveWorkspace,
		}),
		[workspaces, workspace, isLoading, hasReadStorage, setActiveWorkspace],
	);

	return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace() {
	const context = use(WorkspaceContext);

	if (!context) {
		throw new Error("useWorkspace must be used within a WorkspaceProvider");
	}

	return context;
}
