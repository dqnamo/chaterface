"use client";

import type { PresencePeer } from "@instantdb/react";
import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

export type PresenceShape = "circle" | "square" | "triangle" | "hexagon";

export type TaskPresenceProfile = {
	userId?: string;
	name: string;
	color: string;
	shape: PresenceShape;
};

type TaskPresencePeer = PresencePeer<AppSchema, "task">;

const PRESENCE_SHAPES: PresenceShape[] = [
	"circle",
	"square",
	"triangle",
	"hexagon",
];
const DEFAULT_PRESENCE_COLOR = "#2563eb";
const PRESENCE_COLORS = [
	DEFAULT_PRESENCE_COLOR,
	"#dc2626",
	"#16a34a",
	"#c2410c",
	"#7c3aed",
	"#0891b2",
	"#ca8a04",
	"#db2777",
];

const getTaskRoom = (taskId: string) => db.room("task", taskId);

export function getTaskPresenceProfile(input: {
	userId?: string;
	name?: string;
	email?: string;
}): TaskPresenceProfile {
	const seed = input.userId ?? input.email ?? input.name ?? "user";
	const hash = hashString(seed);

	return {
		userId: input.userId,
		name: input.name || input.email || "User",
		color:
			PRESENCE_COLORS[hash % PRESENCE_COLORS.length] ?? DEFAULT_PRESENCE_COLOR,
		shape: PRESENCE_SHAPES[hash % PRESENCE_SHAPES.length] ?? "circle",
	};
}

export function TaskPresenceAvatars({
	taskId,
	limit = 4,
	className,
}: {
	taskId: string;
	limit?: number;
	className?: string;
}) {
	const room = useMemo(() => getTaskRoom(taskId), [taskId]);
	const { peers } = db.rooms.usePresence(room, {
		user: false,
		keys: ["userId", "name", "color", "shape"],
	});
	const presences = useMemo(
		() => uniqueTaskPresences(Object.values(peers)),
		[peers],
	);
	const visiblePresences = presences.slice(0, limit);
	const overflowCount = Math.max(0, presences.length - visiblePresences.length);

	if (presences.length === 0) {
		return null;
	}

	return (
		<div
			className={cn("flex shrink-0 items-center -space-x-1", className)}
			title={presences.map((presence) => presence.name).join(", ")}
		>
			{visiblePresences.map((presence) => (
				<TaskPresenceAvatar
					key={presence.userId ?? presence.peerId}
					presence={presence}
				/>
			))}
			{overflowCount > 0 ? (
				<span className="flex size-4 items-center justify-center rounded-full border border-grayscale-1 bg-grayscale-4 font-mono text-[9px] font-semibold leading-none text-grayscale-11">
					+{overflowCount}
				</span>
			) : null}
		</div>
	);
}

export function TaskPresenceAvatar({
	presence,
	sizeClassName = "size-4",
	className,
}: {
	presence: { name: string; color: string; shape?: string };
	sizeClassName?: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center border border-grayscale-1",
				getPresenceShapeClassName(presence.shape),
				sizeClassName,
				className,
			)}
			style={{ backgroundColor: presence.color }}
			title={presence.name}
			role="img"
			aria-label={presence.name}
		/>
	);
}

export function TaskPresenceCursors({
	peers,
}: {
	peers: Record<string, TaskPresencePeer>;
}) {
	const presences = uniqueTaskPresences(Object.values(peers)).filter(
		(presence) =>
			typeof presence.cursorX === "number" &&
			typeof presence.cursorY === "number",
	);

	return (
		<div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
			{presences.map((presence) => (
				<div
					key={presence.userId ?? presence.peerId}
					className="absolute left-0 top-0 flex items-start gap-1.5 transition-transform duration-75 ease-linear"
					style={{
						left: `${presence.cursorX}%`,
						top: `${presence.cursorY}%`,
					}}
				>
					<TaskPresenceAvatar
						presence={presence}
						sizeClassName="size-3.5"
						className="mt-0.5 border-grayscale-1 shadow-sm shadow-grayscale-12/20"
					/>
					<span
						className="max-w-40 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 text-white shadow-sm shadow-grayscale-12/20"
						style={{ backgroundColor: presence.color }}
					>
						{presence.name}
					</span>
				</div>
			))}
		</div>
	);
}

export function useTaskTypingPresence({
	taskId,
	profile,
	enabled = true,
}: {
	taskId: string;
	profile?: TaskPresenceProfile;
	enabled?: boolean;
}) {
	const room = useMemo(() => getTaskRoom(taskId), [taskId]);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { peers, publishPresence } = db.rooms.usePresence(
		room,
		profile ? { initialPresence: profile } : {},
	);
	const publishTyping = useCallback(
		(isTyping: boolean) => {
			if (!enabled || !profile) {
				return;
			}

			publishPresence({ ...profile, isTyping });
		},
		[enabled, profile, publishPresence],
	);
	const markTyping = useCallback(() => {
		if (!enabled || !profile) {
			return;
		}

		publishTyping(true);

		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		typingTimeoutRef.current = setTimeout(() => {
			publishTyping(false);
			typingTimeoutRef.current = null;
		}, 1800);
	}, [enabled, profile, publishTyping]);
	const stopTyping = useCallback(() => {
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}

		publishTyping(false);
	}, [publishTyping]);
	const publishCursor = useCallback(
		(cursorX: number, cursorY: number) => {
			if (!enabled || !profile) {
				return;
			}

			publishPresence({ ...profile, cursorX, cursorY });
		},
		[enabled, profile, publishPresence],
	);

	return {
		peers,
		markTyping,
		stopTyping,
		publishCursor,
	};
}

export function formatTypingUsers(peers: Record<string, TaskPresencePeer>) {
	const typingUsers = uniqueTaskPresences(Object.values(peers)).filter(
		(presence) => presence.isTyping,
	);

	if (typingUsers.length === 0) {
		return null;
	}

	const [firstTypingUser, secondTypingUser] = typingUsers;

	if (!firstTypingUser) {
		return null;
	}

	if (typingUsers.length === 1) {
		return `${firstTypingUser.name} is typing...`;
	}

	if (typingUsers.length === 2 && secondTypingUser) {
		return `${firstTypingUser.name} and ${secondTypingUser.name} are typing...`;
	}

	return `${firstTypingUser.name} and ${typingUsers.length - 1} others are typing...`;
}

const uniqueTaskPresences = (peers: TaskPresencePeer[]) => {
	const presences = new Map<string, TaskPresencePeer>();

	for (const peer of peers) {
		presences.set(peer.userId || peer.peerId, peer);
	}

	return [...presences.values()];
};

const getPresenceShapeClassName = (shape: string | undefined) => {
	switch (shape) {
		case "square":
			return "rounded-[2px]";
		case "triangle":
			return "[clip-path:polygon(50%_0,100%_100%,0_100%)]";
		case "hexagon":
			return "[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]";
		default:
			return "rounded-full";
	}
};

const hashString = (value: string) => {
	let hash = 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}

	return hash;
};
