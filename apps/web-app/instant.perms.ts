// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
	/**
	 * Welcome to Instant's permission system!
	 * Right now your rules are empty. To start filling them in, check out the docs:
	 * https://www.instantdb.com/docs/permissions
	 *
	 * Here's an example to give you a feel:
	 * posts: {
	 *   allow: {
	 *     view: "true",
	 *     create: "isOwner",
	 *     update: "isOwner",
	 *     delete: "isOwner",
	 *   },
	 *   bind: {"isOwner": "auth.id != null && auth.id == data.ownerId"},
	 * },
	 */
	$files: {
		allow: {
			view: "auth.id != null",
			create: "auth.id != null",
			delete: "auth.id != null",
		},
	},
	$users: {
		allow: {
			update:
				"auth.id != null && auth.id == data.id && request.modifiedFields.all(field, field in ['name'])",
		},
	},
	workspaces: {
		allow: {
			view: "auth.id != null && auth.id in data.ref('members.user.id')",
			update: "auth.id != null && auth.id in data.ref('members.user.id')",
		},
	},
	webhooks: {
		allow: {
			view: "auth.id != null && auth.id in data.ref('workspace.members.user.id')",
			create:
				"auth.id != null && auth.id in data.ref('workspace.members.user.id')",
			update:
				"auth.id != null && auth.id in data.ref('workspace.members.user.id')",
			delete:
				"auth.id != null && auth.id in data.ref('workspace.members.user.id')",
		},
	},
	members: {
		allow: {
			view: "auth.id != null && (auth.id in data.ref('user.id') || auth.id in data.ref('workspace.members.user.id'))",
			update:
				"auth.id != null && auth.id in data.ref('user.id') && request.modifiedFields.all(field, field in ['name'])",
		},
	},
} satisfies InstantRules;

export default rules;
