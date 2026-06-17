"use client";

import type { PresencePeer } from "@instantdb/react";
import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";
import Monogram from "./Monogram";

export type TaskPresenceProfile = {
	userId?: string;
	name: string;
};

type TaskPresencePeer = PresencePeer<AppSchema, "task">;
type CompleteTaskPresencePeer = TaskPresencePeer & {
	userId: string;
	name: string;
	isComposerFocused?: boolean;
};

const getTaskRoom = (taskId: string) => db.room("task", taskId);

export function getTaskPresenceProfile(input: {
	userId?: string;
	name?: string;
	email?: string;
}): TaskPresenceProfile {
	return {
		userId: input.userId,
		name: input.name || input.email || "User",
	};
}

export function TaskPresenceAvatars({
	taskId,
	limit = 4,
	className,
	avatarSizeClassName = "size-4",
	avatarClassName,
}: {
	taskId: string;
	limit?: number;
	className?: string;
	avatarSizeClassName?: string;
	avatarClassName?: string;
}) {
	const { user } = db.useAuth();
	const currentUserId = user?.id;
	const room = useMemo(() => getTaskRoom(taskId), [taskId]);
	const { peers } = db.rooms.usePresence(room, {
		user: false,
		keys: ["userId", "name"],
	});
	const presences = useMemo(
		() => uniqueTaskPresences(Object.values(peers), currentUserId),
		[peers, currentUserId],
	);
	const visiblePresences = presences.slice(0, limit);
	const overflowCount = Math.max(0, presences.length - visiblePresences.length);

	if (!currentUserId || presences.length === 0) {
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
					sizeClassName={avatarSizeClassName}
					className={avatarClassName}
				/>
			))}
			{overflowCount > 0 ? (
				<span
					className={cn(
						"flex items-center justify-center rounded-full border border-grayscale-1 bg-grayscale-4 font-mono text-[9px] font-semibold leading-none text-grayscale-11",
						avatarSizeClassName,
					)}
				>
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
	presence: { name: string };
	sizeClassName?: string;
	className?: string;
}) {
	return (
		<Monogram
			className={cn(
				"shrink-0 rounded-full [&>p]:text-[9px]",
				sizeClassName,
				className,
			)}
			letters={1}
			seed={presence.name}
		/>
	);
}

export function TaskPresenceTypingIndicator({
	peers,
}: {
	peers: Record<string, TaskPresencePeer>;
}) {
	const presences = uniqueTaskPresences(Object.values(peers)).filter(
		(presence) => presence.isComposerFocused || presence.isTyping,
	);
	const typingText = formatTypingUsers(peers);

	if (presences.length === 0) {
		return <>&nbsp;</>;
	}

	return (
		<span className="flex min-w-0 items-center gap-1.5">
			<span
				className="flex shrink-0 items-center -space-x-0.5"
				title={presences.map((presence) => presence.name).join(", ")}
			>
				{presences.slice(0, 4).map((presence) => (
					<TaskPresenceAvatar
						key={presence.userId}
						presence={presence}
						sizeClassName="size-3"
						className="[&>p]:text-[7px]"
					/>
				))}
			</span>
			{typingText ? <span className="truncate">{typingText}</span> : null}
		</span>
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
	const { user } = db.useAuth();
	const currentUserId = user?.id;
	const room = useMemo(() => getTaskRoom(taskId), [taskId]);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { peers, publishPresence } = db.rooms.usePresence(
		room,
		profile ? { initialPresence: profile } : {},
	);
	const otherPeers = useMemo(
		() => filterTaskPresencePeers(peers, currentUserId),
		[peers, currentUserId],
	);
	const publishTyping = useCallback(
		(isTyping: boolean) => {
			if (!enabled || !profile) {
				return;
			}

			publishPresence({ ...profile, isComposerFocused: true, isTyping });
		},
		[enabled, profile, publishPresence],
	);
	const focusComposer = useCallback(() => {
		if (!enabled || !profile) {
			return;
		}

		publishPresence({
			...profile,
			isComposerFocused: true,
		});
	}, [enabled, profile, publishPresence]);
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

		if (!enabled || !profile) {
			return;
		}

		publishPresence({
			...profile,
			isComposerFocused: false,
			isTyping: false,
		});
	}, [enabled, profile, publishPresence]);
	return {
		peers: otherPeers,
		focusComposer,
		markTyping,
		stopTyping,
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

const filterTaskPresencePeers = (
	peers: Record<string, TaskPresencePeer>,
	currentUserId?: string,
) => {
	if (!currentUserId) {
		return peers;
	}

	return Object.fromEntries(
		Object.entries(peers).filter(([, peer]) => peer.userId !== currentUserId),
	);
};

const uniqueTaskPresences = (
	peers: TaskPresencePeer[],
	currentUserId?: string,
) => {
	const presences = new Map<string, CompleteTaskPresencePeer>();

	for (const peer of peers) {
		if (!isCompleteTaskPresencePeer(peer)) {
			continue;
		}

		if (currentUserId && peer.userId === currentUserId) {
			continue;
		}

		presences.set(peer.userId, peer);
	}

	return [...presences.values()];
};

const isCompleteTaskPresencePeer = (
	peer: TaskPresencePeer,
): peer is CompleteTaskPresencePeer =>
	typeof peer.userId === "string" &&
	peer.userId.length > 0 &&
	typeof peer.name === "string" &&
	peer.name.length > 0;
