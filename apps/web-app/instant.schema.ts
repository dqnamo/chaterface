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
			name: i.string().indexed().optional(),
			type: i.string().optional(),
		}),
		workspaces: i.entity({
			name: i.string().indexed(),
			handle: i.string().unique().indexed(),
			createdAt: i.date().optional(),
			githubAppInstallationAccountLogin: i.string().optional(),
			githubAppInstallationAccountType: i.string().optional(),
			githubAppInstallationId: i.string().optional(),
			githubAppInstalledAt: i.date().optional(),
			gitAuthorName: i.string().optional(),
			gitAuthorEmail: i.string().optional(),
			environmentPackages: i.json().optional(),
			floorWorkflow: i.json().optional(),
			floorWorkflowUpdatedAt: i.date().optional(),
			newTaskSetupScript: i.string().optional(),
			newTurnSetupScript: i.string().optional(),
		}),
		commands: i.entity({
			command: i.string(),
			runOnNewTask: i.boolean().optional(),
			runOnNewTurn: i.boolean().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
		}),
		sandboxPackages: i.entity({
			name: i.string().indexed(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
		}),
		repositories: i.entity({
			url: i.string().indexed(),
			path: i.string().optional(),
			branch: i.string().optional(),
			secrets: i.json().optional(),
			createdAt: i.date().optional(),
		}),
		mcpServers: i.entity({
			name: i.string().indexed(),
			url: i.string().indexed(),
			transport: i.string().optional(),
			auth: i.json().optional(),
			enabled: i.boolean().optional(),
			toolPolicy: i.json().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
		}),
		integrationConnections: i.entity({
			provider: i.string().indexed(),
			name: i.string().indexed(),
			status: i.string().indexed().optional(),
			externalId: i.string().indexed().optional(),
			externalName: i.string().optional(),
			auth: i.json().optional(),
			config: i.json().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
			lastUsedAt: i.date().optional(),
		}),
		integrationTriggerSubscriptions: i.entity({
			provider: i.string().indexed(),
			trigger: i.string().indexed(),
			nodeId: i.string().indexed(),
			externalId: i.string().indexed().optional(),
			config: i.json().optional(),
			enabled: i.boolean().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
			lastTriggeredAt: i.date().optional(),
		}),
		integrationEventReceipts: i.entity({
			provider: i.string().indexed(),
			externalEventId: i.string().unique().indexed(),
			receivedAt: i.date().optional(),
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
			sourceType: i.string().optional(),
			externalId: i.string().indexed().optional(),
			externalUrl: i.string().optional(),
			installUrl: i.string().optional(),
			installs: i.number().optional(),
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
		webhooks: i.entity({
			name: i.string().indexed(),
			publicId: i.string().unique().indexed(),
			nodeId: i.string().indexed(),
			secret: i.string().optional(),
			enabled: i.boolean().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
			lastTriggeredAt: i.date().optional(),
		}),
		agents: i.entity({
			name: i.string().indexed().optional(),
			auth: i.json().optional(),
			authState: i.json().optional(),
			createdAt: i.date().optional(),
			provider: i.string().optional(),
			providerAccountId: i.string().indexed().optional(),
			settings: i.json().optional(),
			status: i.string().optional(),
			sandboxId: i.string().optional(),
		}),
		workspaceAgents: i.entity({
			name: i.string().indexed(),
			createdAt: i.date().optional(),
			settings: i.json().optional(),
			status: i.string().optional(),
		}),
		agentSessions: i.entity({
			name: i.string().indexed(),
			status: i.string().optional(),
			createdAt: i.date().optional(),
			updatedAt: i.date().optional(),
			agentThreadId: i.string().optional(),
			agentPid: i.number().optional(),
			workflowNodeId: i.string().optional(),
			workflowSessionKey: i.string().optional(),
		}),
		members: i.entity({
			createdAt: i.date().optional(),
			inviteSentAt: i.date().optional(),
			inviteToken: i.string().unique().optional(),
			joinedAt: i.date().optional(),
			name: i.string().indexed().optional(),
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
			latestDiffFileCount: i.number().optional(),
			latestDiffFiles: i.json().optional(),
			pullRequestUrl: i.string().optional(),
			workflowState: i.string().optional(),
			workflowInput: i.json().optional(),
			workflowNodeId: i.string().optional(),
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
		terminalSessions: i.entity({
			name: i.string().indexed(),
			command: i.string().optional(),
			cwd: i.string().optional(),
			pid: i.number().indexed().optional(),
			status: i.string().indexed().optional(),
			startedBy: i.string().optional(),
			startedAt: i.date().optional(),
			stoppedAt: i.date().optional(),
			lastActivityAt: i.date().optional(),
			exitCode: i.number().optional(),
			cols: i.number().optional(),
			rows: i.number().optional(),
			transcriptPath: i.string().optional(),
			error: i.string().optional(),
		}),
		events: i.entity({
			type: i.string().optional(),
			data: i.json().optional(),
			createdAt: i.date().optional(),
			workflowRunId: i.string().indexed().optional(),
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
		workspaceTasks: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "tasks",
			},
			reverse: {
				on: "tasks",
				has: "one",
				label: "workspace",
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
		taskAgentSessions: {
			forward: {
				on: "tasks",
				has: "many",
				label: "agentSessions",
			},
			reverse: {
				on: "agentSessions",
				has: "one",
				label: "task",
				onDelete: "cascade",
			},
		},
		agentSessionEvents: {
			forward: {
				on: "agentSessions",
				has: "many",
				label: "events",
			},
			reverse: {
				on: "events",
				has: "one",
				label: "agentSession",
			},
		},
		eventAttachments: {
			forward: {
				on: "events",
				has: "many",
				label: "attachments",
			},
			reverse: {
				on: "$files",
				has: "one",
				label: "attachmentEvent",
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
		agentSessionAgent: {
			forward: {
				on: "agentSessions",
				has: "one",
				label: "agent",
			},
			reverse: {
				on: "agents",
				has: "many",
				label: "agentSessions",
			},
		},
		taskWorkspaceAgent: {
			forward: {
				on: "tasks",
				has: "one",
				label: "workspaceAgent",
			},
			reverse: {
				on: "workspaceAgents",
				has: "many",
				label: "tasks",
			},
		},
		agentTerminalSessions: {
			forward: {
				on: "agents",
				has: "many",
				label: "terminalSessions",
			},
			reverse: {
				on: "terminalSessions",
				has: "one",
				label: "agent",
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
		taskTerminalSessions: {
			forward: {
				on: "tasks",
				has: "many",
				label: "terminalSessions",
			},
			reverse: {
				on: "terminalSessions",
				has: "one",
				label: "task",
			},
		},
		terminalSessionServices: {
			forward: {
				on: "terminalSessions",
				has: "many",
				label: "services",
			},
			reverse: {
				on: "services",
				has: "one",
				label: "terminalSession",
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
		workspaceSecrets: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "secrets",
			},
			reverse: {
				on: "secrets",
				has: "one",
				label: "workspace",
			},
		},
		workspaceRepositories: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "repositories",
			},
			reverse: {
				on: "repositories",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceCommands: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "commands",
			},
			reverse: {
				on: "commands",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceSandboxPackages: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "sandboxPackages",
			},
			reverse: {
				on: "sandboxPackages",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceMcpServers: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "mcpServers",
			},
			reverse: {
				on: "mcpServers",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceSkillRepositories: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "skillRepositories",
			},
			reverse: {
				on: "skillRepositories",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceSkills: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "skills",
			},
			reverse: {
				on: "skills",
				has: "one",
				label: "workspace",
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
		workspaceEnvironmentFiles: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "environmentFiles",
			},
			reverse: {
				on: "environmentFiles",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceApiKeys: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "apiKeys",
			},
			reverse: {
				on: "apiKeys",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceWebhooks: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "webhooks",
			},
			reverse: {
				on: "webhooks",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		workspaceIntegrationTriggerSubscriptions: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "integrationTriggerSubscriptions",
			},
			reverse: {
				on: "integrationTriggerSubscriptions",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		integrationConnectionTriggerSubscriptions: {
			forward: {
				on: "integrationConnections",
				has: "many",
				label: "triggerSubscriptions",
			},
			reverse: {
				on: "integrationTriggerSubscriptions",
				has: "one",
				label: "integrationConnection",
				onDelete: "cascade",
			},
		},
		integrationConnectionEventReceipts: {
			forward: {
				on: "integrationConnections",
				has: "many",
				label: "eventReceipts",
			},
			reverse: {
				on: "integrationEventReceipts",
				has: "one",
				label: "integrationConnection",
				onDelete: "cascade",
			},
		},
		workspaceMembers: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "members",
			},
			reverse: {
				on: "members",
				has: "one",
				label: "workspace",
			},
		},
		workspaceAgents: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "agents",
			},
			reverse: {
				on: "agents",
				has: "one",
				label: "workspace",
			},
		},
		workspaceWorkspaceAgents: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "workspaceAgents",
			},
			reverse: {
				on: "workspaceAgents",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
			},
		},
		agentWorkspaceAgents: {
			forward: {
				on: "agents",
				has: "many",
				label: "workspaceAgents",
			},
			reverse: {
				on: "workspaceAgents",
				has: "one",
				label: "agent",
				onDelete: "cascade",
			},
		},
		workspaceIntegrationConnections: {
			forward: {
				on: "workspaces",
				has: "many",
				label: "integrationConnections",
			},
			reverse: {
				on: "integrationConnections",
				has: "one",
				label: "workspace",
				onDelete: "cascade",
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
		agentCreators: {
			forward: {
				on: "$users",
				has: "many",
				label: "createdAgents",
			},
			reverse: {
				on: "agents",
				has: "one",
				label: "creator",
			},
		},
	},
	rooms: {
		task: {
			presence: i.entity({
				userId: i.string().optional(),
				name: i.string(),
				isComposerFocused: i.boolean().optional(),
				isTyping: i.boolean().optional(),
			}),
		},
	},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
