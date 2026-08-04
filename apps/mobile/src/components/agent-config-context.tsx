import {
	CODEX_MODEL_OPTIONS,
	CODEX_REASONING_EFFORT_OPTIONS,
	CODEX_SPEED_OPTIONS,
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
} from "@repo/db/agent-options";
import { createContext, type ReactNode, use, useMemo, useState } from "react";

type AgentConfigContextValue = {
	models: readonly { value: string; label: string }[];
	reasoningEfforts: readonly { value: string; label: string }[];
	speeds: readonly { value: string; label: string }[];
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
	setAgentModel: (value: string) => void;
	setAgentReasoningEffort: (value: string) => void;
	setAgentSpeed: (value: string) => void;
	/** Applies an agent's saved defaults, e.g. after loading a task. */
	applyDefaults: (defaults: {
		agentModel: string;
		agentReasoningEffort: string;
		agentSpeed: string;
	}) => void;
};

const AgentConfigContext = createContext<AgentConfigContextValue | null>(null);

/**
 * Holds the model / reasoning-effort / speed the next turn will run with. These
 * are the same knobs the web app's `ModelConfigMenu` exposes and are written
 * onto the task when a turn is sent.
 */
export function AgentConfigProvider({ children }: { children: ReactNode }) {
	const [agentModel, setAgentModel] = useState<string>(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState<string>(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState<string>(DEFAULT_CODEX_SPEED);

	const value = useMemo<AgentConfigContextValue>(
		() => ({
			models: CODEX_MODEL_OPTIONS,
			reasoningEfforts: CODEX_REASONING_EFFORT_OPTIONS,
			speeds: CODEX_SPEED_OPTIONS,
			agentModel,
			agentReasoningEffort,
			agentSpeed,
			setAgentModel,
			setAgentReasoningEffort,
			setAgentSpeed,
			applyDefaults: (defaults) => {
				setAgentModel(defaults.agentModel);
				setAgentReasoningEffort(defaults.agentReasoningEffort);
				setAgentSpeed(defaults.agentSpeed);
			},
		}),
		[agentModel, agentReasoningEffort, agentSpeed],
	);

	return <AgentConfigContext value={value}>{children}</AgentConfigContext>;
}

export function useAgentConfig() {
	const context = use(AgentConfigContext);

	if (!context) {
		throw new Error(
			"useAgentConfig must be used within an AgentConfigProvider",
		);
	}

	return context;
}
