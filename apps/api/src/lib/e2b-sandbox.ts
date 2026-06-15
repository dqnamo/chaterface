import type {
	CommandResult,
	CommandHandle as E2BCommandHandle,
} from "e2b/dist/index.mjs";
import { CommandExitError, Sandbox as E2BSdkSandbox } from "e2b/dist/index.mjs";

type CommandRunOptions = {
	timeoutMs?: number;
	envs?: Record<string, string>;
	background?: boolean;
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
};

type CommandRunResult = {
	pid: number;
	stdout: string;
	stderr: string;
	exitCode: number;
	wait: () => Promise<CommandRunResult>;
};

export class E2BSandbox {
	readonly sandboxId: string;
	readonly trafficAccessToken?: string;
	readonly pty: E2BSdkSandbox["pty"];

	private constructor(private readonly sandbox: E2BSdkSandbox) {
		this.sandboxId = sandbox.sandboxId;
		this.trafficAccessToken = sandbox.trafficAccessToken;
		this.pty = sandbox.pty;
	}

	static async connect(sandboxId: string) {
		return new E2BSandbox(
			await E2BSdkSandbox.connect(sandboxId, {
				timeoutMs: 10 * 60 * 1000,
			}),
		);
	}

	readonly files = {
		read: async (path: string) => {
			return this.sandbox.files.read(normalizeE2BPath(path));
		},
		write: async (path: string, content: string) => {
			await this.sandbox.files.write(normalizeE2BPath(path), content);
		},
	};

	readonly commands = {
		run: async (
			command: string,
			options: CommandRunOptions = {},
		): Promise<CommandRunResult> => {
			try {
				const result = await this.sandbox.commands.run(
					buildShellCommand(command, options.envs),
					{
						background: options.background,
						timeoutMs: options.timeoutMs,
						onStdout: options.onStdout,
						onStderr: options.onStderr,
					},
				);

				return "wait" in result
					? wrapCommandHandle(result, options)
					: wrapCommandResult(result);
			} catch (error) {
				return wrapCommandExitError(error);
			}
		},
		kill: async (pid: number) => {
			return this.sandbox.commands.kill(pid);
		},
	};

	async createPublicUrl(port: number) {
		const host = this.sandbox.getHost(port);
		return {
			url: `https://${host}`,
			token: this.sandbox.trafficAccessToken,
		};
	}
}

export type Sandbox = E2BSandbox;
export type CommandHandle = CommandRunResult;

const wrapCommandHandle = (
	handle: E2BCommandHandle,
	options: CommandRunOptions,
): CommandRunResult => ({
	pid: handle.pid,
	stdout: handle.stdout,
	stderr: handle.stderr,
	exitCode: handle.exitCode ?? 0,
	wait: async () => {
		try {
			return wrapCommandResult(await handle.wait(), handle.pid);
		} catch (error) {
			const result = wrapCommandExitError(error, handle.pid);

			if (result.stdout) {
				options.onStdout?.(result.stdout);
			}
			if (result.stderr) {
				options.onStderr?.(result.stderr);
			}

			return result;
		}
	},
});

const wrapCommandResult = (
	result: CommandResult,
	pid = 0,
): CommandRunResult => ({
	pid,
	stdout: result.stdout,
	stderr: result.stderr,
	exitCode: result.exitCode,
	wait: async () => {
		throw new Error("Command has already completed");
	},
});

const wrapCommandExitError = (error: unknown, pid = 0): CommandRunResult => {
	if (error instanceof CommandExitError) {
		return wrapCommandResult(error, pid);
	}

	throw error;
};

const normalizeE2BPath = (path: string) =>
	path.startsWith("~/") ? `/home/user/${path.slice(2)}` : path;

const buildShellCommand = (command: string, envs?: Record<string, string>) =>
	`/bin/bash -lc ${shellQuote([buildExports(envs), command].filter(Boolean).join("\n"))}`;

const buildExports = (envs?: Record<string, string>) =>
	Object.entries(envs ?? {})
		.map(([key, value]) => `export ${key}=${shellQuote(value)}`)
		.join("\n");

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
