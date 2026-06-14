import { Box } from "@upstash/box";

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

export class UpstashBoxSandbox {
	readonly sandboxId: string;

	private constructor(private readonly box: Box) {
		this.sandboxId = box.id;
	}

	static async connect(sandboxId: string) {
		const box = await Box.get(sandboxId, {
			timeout: 10 * 60 * 1000,
		});

		return new UpstashBoxSandbox(box);
	}

	readonly files = {
		read: async (path: string) => {
			return this.box.files.read(normalizeBoxPath(path));
		},
		write: async (path: string, content: string) => {
			await this.box.files.write({
				path: normalizeBoxPath(path),
				content,
			});
		},
	};

	readonly commands = {
		run: async (
			command: string,
			options: CommandRunOptions = {},
		): Promise<CommandRunResult> => {
			if (options.background) {
				return this.runBackgroundCommand(command, options);
			}

			const run = await this.box.exec.command(
				buildShellCommand(command, options.envs),
			);
			const stdout = String(run.result ?? "");
			const exitCode = run.exitCode ?? (run.status === "failed" ? 1 : 0);
			const stderr = exitCode === 0 ? "" : stdout;

			if (stdout) {
				options.onStdout?.(stdout);
			}
			if (stderr) {
				options.onStderr?.(stderr);
			}

			return {
				pid: parseRunPid(run.id),
				stdout,
				stderr,
				exitCode,
				wait: async () => ({
					pid: parseRunPid(run.id),
					stdout,
					stderr,
					exitCode,
					wait: async () => {
						throw new Error("Command has already completed");
					},
				}),
			};
		},
		kill: async (pid: number) => {
			const result = await this.box.exec.command(
				`kill ${pid} >/dev/null 2>&1 && echo killed || echo missing`,
			);

			return String(result.result ?? "").includes("killed");
		},
	};

	async createPublicUrl(port: number) {
		const publicUrl = await this.box.getPublicURL(port, { bearerToken: true });
		return {
			url: publicUrl.url,
			token: publicUrl.token,
		};
	}

	private async runBackgroundCommand(
		command: string,
		options: CommandRunOptions,
	): Promise<CommandRunResult> {
		const logPath = `/tmp/factoryplane-background-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}.log`;
		const statusPath = `${logPath}.status`;
		const script = [
			"mkdir -p /tmp/factoryplane-background",
			"(",
			buildExports(options.envs),
			command,
			"status=$?",
			`printf "%s" "$status" > ${shellQuote(statusPath)}`,
			`) > ${shellQuote(logPath)} 2>&1 < /dev/null &`,
			"echo $!",
		]
			.filter(Boolean)
			.join("\n");
		const run = await this.box.exec.command(
			`/bin/bash -lc ${shellQuote(script)}`,
		);
		const stdout = String(run.result ?? "");
		const pid = Number.parseInt(stdout.trim().split(/\s+/).at(-1) ?? "", 10);

		if (!Number.isInteger(pid)) {
			throw new Error(`Failed to start background command: ${stdout}`);
		}

		return {
			pid,
			stdout,
			stderr: "",
			exitCode: 0,
			wait: async () =>
				this.waitForBackgroundCommand(pid, logPath, statusPath, options),
		};
	}

	private async waitForBackgroundCommand(
		pid: number,
		logPath: string,
		statusPath: string,
		options: CommandRunOptions,
	): Promise<CommandRunResult> {
		const script = [
			`while kill -0 ${pid} >/dev/null 2>&1; do sleep 2; done`,
			`status="$(cat ${shellQuote(statusPath)} 2>/dev/null || printf 0)"`,
			`cat ${shellQuote(logPath)} 2>/dev/null || true`,
			'exit "$status"',
		].join("\n");
		const run = await this.box.exec.command(
			`/bin/bash -lc ${shellQuote(script)}`,
		);
		const stdout = String(run.result ?? "");
		const exitCode = run.exitCode ?? (run.status === "failed" ? 1 : 0);
		const stderr = exitCode === 0 ? "" : stdout;

		if (stdout) {
			options.onStdout?.(stdout);
		}
		if (stderr) {
			options.onStderr?.(stderr);
		}

		return {
			pid,
			stdout,
			stderr,
			exitCode,
			wait: async () => {
				throw new Error("Command has already completed");
			},
		};
	}
}

export type Sandbox = UpstashBoxSandbox;
export type CommandHandle = CommandRunResult;

const normalizeBoxPath = (path: string) =>
	path.startsWith("~/") ? `/workspace/home/${path.slice(2)}` : path;

const buildShellCommand = (command: string, envs?: Record<string, string>) =>
	`/bin/bash -lc ${shellQuote([buildExports(envs), command].filter(Boolean).join("\n"))}`;

const buildExports = (envs?: Record<string, string>) =>
	Object.entries(envs ?? {})
		.map(([key, value]) => `export ${key}=${shellQuote(value)}`)
		.join("\n");

const parseRunPid = (runId: string) => {
	const parsed = Number.parseInt(runId.replace(/\D/g, "").slice(0, 9), 10);
	return Number.isInteger(parsed) ? parsed : 0;
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
