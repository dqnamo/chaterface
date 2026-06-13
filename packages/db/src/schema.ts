// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
	entities: {
		$files: i.entity({
			path: i.string().unique().indexed(),
			url: i.string(),
		}),
		$streams: i.entity({
			abortReason: i.string().optional(),
			clientId: i.string().unique().indexed(),
			done: i.boolean().optional(),
			size: i.number().optional(),
		}),
		$users: i.entity({
			email: i.string().unique().indexed().optional(),
			imageURL: i.string().optional(),
			type: i.string().optional(),
		}),
		factories: i.entity({
			name: i.string().indexed(),
			createdAt: i.date().optional(),
			githubAccessTokenEncrypted: i.string().optional(),
			gitAuthorName: i.string().optional(),
			gitAuthorEmail: i.string().optional(),
			environmentPackages: i.json().optional(),
			newTaskSetupScript: i.string().optional(),
			newTurnSetupScript: i.string().optional(),
		}),
		repositories: i.entity({
			url: i.string().indexed(),
			path: i.string().optional(),
			branch: i.string().optional(),
			secrets: i.json().optional(),
			createdAt: i.date().optional(),
		}),
		skillRepositories: i.entity({
			url: i.string().indexed(),
			path: i.string().optional(),
			branch: i.string().optional(),
			status: i.string().optional(),
			syncError: i.string().optional(),
			lastSyncedAt: i.date().optional(),
			lastSyncedCommit: i.string().optional(),
			createdAt: i.date().optional(),
		}),
		skills: i.entity({
			name: i.string().indexed(),
			slug: i.string().indexed(),
			description: i.string().optional(),
			sourcePath: i.string().indexed(),
			instructions: i.string(),
			files: i.json().optional(),
			manifest: i.json().optional(),
			enabled: i.boolean().optional(),
			contentHash: i.string().optional(),
			removedAt: i.date().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
		}),
		environmentFiles: i.entity({
			path: i.string().indexed(),
			content: i.string(),
			createdAt: i.date().optional(),
		}),
		apiKeys: i.entity({
			name: i.string().indexed(),
			tokenHash: i.string().unique().indexed(),
			tokenPrefix: i.string().indexed(),
			createdAt: i.date().optional(),
			lastUsedAt: i.date().optional(),
			revokedAt: i.date().optional(),
		}),
		agents: i.entity({
			name: i.string().indexed(),
			auth: i.json().optional(),
			createdAt: i.date().optional(),
			provider: i.string().optional(),
			settings: i.json().optional(),
			status: i.string().optional(),
			sandboxId: i.string().optional(),
			sandboxTrafficAccessToken: i.string().optional(),
		}),
		organisations: i.entity({
			name: i.string().indexed(),
			handle: i.string().unique().indexed(),
			createdAt: i.date().optional(),
		}),
		members: i.entity({
			createdAt: i.date().optional(),
			inviteSentAt: i.date().optional(),
			inviteToken: i.string().unique().optional(),
			joinedAt: i.date().optional(),
			role: i.string().optional(),
		}),
		tasks: i.entity({
			name: i.string().indexed(),
			status: i.string().optional(),
			instructions: i.string().optional(),
			createdAt: i.date().optional(),
			completedAt: i.date().optional(),
			sandboxId: i.string().optional(),
			sandboxTrafficAccessToken: i.string().optional(),
			agentThreadId: i.string().optional(),
			agentPid: i.number().optional(),
			agentModel: i.string().optional(),
			agentReasoningEffort: i.string().optional(),
			agentSpeed: i.string().optional(),
			agentToken: i.string().optional(),
			diffWorkspacePath: i.string().optional(),
			latestDiffPath: i.string().optional(),
			latestDiffGeneratedAt: i.date().optional(),
			latestDiffBytes: i.number().optional(),
			pullRequestUrl: i.string().optional(),
		}),
		secrets: i.entity({
			name: i.string().indexed(),
			valueEncrypted: i.string().optional(),
			createdAt: i.date().optional(),
		}),
		services: i.entity({
			name: i.string().indexed(),
			portNumber: i.number().indexed(),
			url: i.string().optional(),
			e2bHost: i.string().optional(),
			e2bUrl: i.string().optional(),
			command: i.string().optional(),
			cwd: i.string().optional(),
			healthPath: i.string().optional(),
			pid: i.number().optional(),
			status: i.string().optional(),
		}),
		events: i.entity({
			type: i.string().optional(),
			data: i.json().optional(),
			createdAt: i.date().optional(),
		}),
	},
	links: {
		$streams$files: {
			forward: {
				on: "$streams",
				has: "many",
				label: "$files",
			},
			reverse: {
				on: "$files",
				has: "one",
				label: "$stream",
				onDelete: "cascade",
			},
		},
		$usersLinkedPrimaryUser: {
			forward: {
				on: "$users",
				has: "one",
				label: "linkedPrimaryUser",
				onDelete: "cascade",
			},
			reverse: {
				on: "$users",
				has: "many",
				label: "linkedGuestUsers",
			},
		},
		factoryTasks: {
			forward: {
				on: "factories",
				has: "many",
				label: "tasks",
			},
			reverse: {
				on: "tasks",
				has: "one",
				label: "factory",
			},
		},
		taskEvents: {
			forward: {
				on: "tasks",
				has: "many",
				label: "events",
			},
			reverse: {
				on: "events",
				has: "one",
				label: "task",
			},
		},
		taskAgent: {
			forward: {
				on: "tasks",
				has: "one",
				label: "agent",
			},
			reverse: {
				on: "agents",
				has: "many",
				label: "tasks",
			},
		},
		taskServices: {
			forward: {
				on: "tasks",
				has: "many",
				label: "services",
			},
			reverse: {
				on: "services",
				has: "one",
				label: "task",
			},
		},
		taskLatestDiffFile: {
			forward: {
				on: "tasks",
				has: "one",
				label: "latestDiffFile",
			},
			reverse: {
				on: "$files",
				has: "one",
				label: "diffTask",
			},
		},
		factorySecrets: {
			forward: {
				on: "factories",
				has: "many",
				label: "secrets",
			},
			reverse: {
				on: "secrets",
				has: "one",
				label: "factory",
			},
		},
		factoryRepositories: {
			forward: {
				on: "factories",
				has: "many",
				label: "repositories",
			},
			reverse: {
				on: "repositories",
				has: "one",
				label: "factory",
				onDelete: "cascade",
			},
		},
		factorySkillRepositories: {
			forward: {
				on: "factories",
				has: "many",
				label: "skillRepositories",
			},
			reverse: {
				on: "skillRepositories",
				has: "one",
				label: "factory",
				onDelete: "cascade",
			},
		},
		factorySkills: {
			forward: {
				on: "factories",
				has: "many",
				label: "skills",
			},
			reverse: {
				on: "skills",
				has: "one",
				label: "factory",
				onDelete: "cascade",
			},
		},
		skillRepositorySkills: {
			forward: {
				on: "skillRepositories",
				has: "many",
				label: "skills",
			},
			reverse: {
				on: "skills",
				has: "one",
				label: "skillRepository",
				onDelete: "cascade",
			},
		},
		factoryEnvironmentFiles: {
			forward: {
				on: "factories",
				has: "many",
				label: "environmentFiles",
			},
			reverse: {
				on: "environmentFiles",
				has: "one",
				label: "factory",
				onDelete: "cascade",
			},
		},
		factoryApiKeys: {
			forward: {
				on: "factories",
				has: "many",
				label: "apiKeys",
			},
			reverse: {
				on: "apiKeys",
				has: "one",
				label: "factory",
				onDelete: "cascade",
			},
		},
		organisationFactories: {
			forward: {
				on: "organisations",
				has: "many",
				label: "factories",
			},
			reverse: {
				on: "factories",
				has: "one",
				label: "organisation",
			},
		},
		organisationMembers: {
			forward: {
				on: "organisations",
				has: "many",
				label: "members",
			},
			reverse: {
				on: "members",
				has: "one",
				label: "organisation",
			},
		},
		organisationAgents: {
			forward: {
				on: "organisations",
				has: "many",
				label: "agents",
			},
			reverse: {
				on: "agents",
				has: "one",
				label: "organisation",
			},
		},
		memberUsers: {
			forward: {
				on: "members",
				has: "one",
				label: "user",
			},
			reverse: {
				on: "$users",
				has: "many",
				label: "members",
			},
		},
	},
	rooms: {},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
