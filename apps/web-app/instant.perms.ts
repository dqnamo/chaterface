// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const signedIn = "auth.id != null";
const workspaceMember =
	"auth.id != null && auth.id in data.ref('workspace.members.user.id')";
const taskWorkspaceMember =
	"auth.id != null && auth.id in data.ref('task.workspace.members.user.id')";
const agentSessionWorkspaceMember =
	"auth.id != null && auth.id in data.ref('agentSession.task.workspace.members.user.id')";
const workspaceOrTaskMember = `(${workspaceMember}) || (${taskWorkspaceMember})`;
const eventWorkspaceMember = `(${taskWorkspaceMember}) || (${agentSessionWorkspaceMember})`;
const workspaceMemberViaUser =
	"auth.id != null && auth.id in data.ref('workspace.members.user.id')";

const denyAll = {
	allow: {
		view: "false",
		create: "false",
		update: "false",
		delete: "false",
	},
};

const workspaceScoped = {
	allow: {
		view: workspaceMember,
		create: workspaceMember,
		update: workspaceMember,
		delete: workspaceMember,
	},
};

const taskScoped = {
	allow: {
		view: taskWorkspaceMember,
		create: taskWorkspaceMember,
		update: taskWorkspaceMember,
		delete: taskWorkspaceMember,
	},
};

const rules = {
	attrs: {
		allow: {
			$default: "false",
		},
	},
	$files: {
		allow: {
			view: signedIn,
			create: signedIn,
			update: "false",
			delete: signedIn,
		},
	},
	$streams: denyAll,
	$users: {
		allow: {
			view: "auth.id != null && (auth.id == data.id || auth.id in data.ref('members.workspace.members.user.id'))",
			create: "true",
			update:
				"auth.id != null && auth.id == data.id && request.modifiedFields.all(field, field in ['name'])",
			delete: "false",
		},
		fields: {
			email:
				"auth.id == data.id || auth.id in data.ref('members.workspace.members.user.id')",
		},
	},
	workspaces: {
		allow: {
			view: "auth.id != null && auth.id in data.ref('members.user.id')",
			create: signedIn,
			update: "auth.id != null && auth.id in data.ref('members.user.id')",
			delete: "auth.id != null && auth.id in data.ref('members.user.id')",
		},
	},
	commands: workspaceScoped,
	sandboxPackages: workspaceScoped,
	repositories: {
		...workspaceScoped,
		fields: {
			secrets: "false",
		},
	},
	mcpServers: {
		...workspaceScoped,
		fields: {
			auth: "false",
		},
	},
	integrationConnections: {
		...workspaceScoped,
		fields: {
			auth: "false",
		},
	},
	integrationTriggerSubscriptions: workspaceScoped,
	integrationEventReceipts: denyAll,
	skillRepositories: workspaceScoped,
	skills: workspaceScoped,
	environmentFiles: workspaceScoped,
	apiKeys: {
		allow: {
			view: "false",
			create: "false",
			update: "false",
			delete: "false",
		},
		fields: {
			tokenHash: "false",
		},
	},
	webhooks: {
		...workspaceScoped,
		fields: {
			secret: "false",
		},
	},
	agents: {
		...workspaceScoped,
		fields: {
			auth: "false",
		},
	},
	agentSessions: taskScoped,
	members: {
		allow: {
			view: `auth.id != null && (auth.id in data.ref('user.id') || auth.id in data.ref('workspace.members.user.id'))`,
			create: `auth.id != null && (auth.id in data.ref('user.id') || auth.id in data.ref('workspace.members.user.id'))`,
			update:
				"auth.id != null && auth.id in data.ref('user.id') && request.modifiedFields.all(field, field in ['name'])",
			delete: workspaceMemberViaUser,
		},
	},
	tasks: {
		...workspaceScoped,
		fields: {
			agentToken: "false",
			sandboxTrafficAccessToken: "false",
		},
	},
	secrets: {
		allow: {
			view: workspaceMember,
			create: "false",
			update: "false",
			delete: "false",
		},
		fields: {
			valueEncrypted: "false",
		},
	},
	services: {
		allow: {
			view: taskWorkspaceMember,
			create: taskWorkspaceMember,
			update: taskWorkspaceMember,
			delete: taskWorkspaceMember,
		},
		fields: {
			e2bHost: "false",
			e2bUrl: "false",
		},
	},
	terminalSessions: {
		allow: {
			view: workspaceOrTaskMember,
			create: workspaceOrTaskMember,
			update: workspaceOrTaskMember,
			delete: workspaceOrTaskMember,
		},
	},
	events: {
		allow: {
			view: eventWorkspaceMember,
			create: eventWorkspaceMember,
			update: eventWorkspaceMember,
			delete: eventWorkspaceMember,
		},
	},
} satisfies InstantRules;

export default rules;
