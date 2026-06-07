"use client";

import { id } from "@instantdb/react";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
} from "@/codex-options";
import { Button } from "@/components/Button";
import CornerCubes from "@/components/CornerCubes";
import { Input, Textarea } from "@/components/Input";
import Logo from "@/components/Logo";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import { ExpandSidebarButton } from "@/components/SidebarContext";

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export default function FactoryPage() {
	const router = useRouter();
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;

	const [taskName, setTaskName] = useState("");
	const [taskInstructions, setTaskInstructions] = useState("");
	const [agentId, setAgentId] = useState("");
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);

	const { data } = db.useQuery({
		agents: {},
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});

	const agents = data?.agents;
	const resolvedAgentId = agentId || agents?.[0]?.id;
	const agentItems =
		agents?.map((agent) => ({ value: agent.id, label: agent.name })) ?? [];

	const createTask = async () => {
		if (!resolvedAgentId) {
			return;
		}

		const taskId = id();
		await db.transact(
			taskTx(taskId)
				.create({
					name: taskName,
					status: "in_progress",
					instructions: taskInstructions,
					createdAt: DateTime.now().toISO(),
					agentModel,
					agentReasoningEffort,
					agentSpeed,
				})
				.link({ factory: currentFactoryId, agent: resolvedAgentId }),
		);

		const eventId = id();
		await db.transact(
			eventTx(eventId)
				.create({
					type: "factoryplane.new_task",
					data: {
						taskId: taskId,
					},
					createdAt: DateTime.now().toISO(),
				})
				.link({ task: taskId }),
		);

		router.push(
			`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${taskId}`,
		);
	};

	return (
		<div className="relative flex flex-col gap-4 h-full w-full items-center justify-center">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<Logo size={8} />
			<div className="flex flex-col gap-px items-center justify-center">
				<h1 className="text-lg font-medium text-grayscale-12">
					What do you want to build?
				</h1>
			</div>
			<div className="flex flex-col max-w-xl w-full bg-white border border-grayscale-4 relative">
				<CornerCubes
					placement="outside"
					spacing={0.75}
					translate={3}
					size={1.5}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="flex flex-col p-3 gap-3">
					<div className="flex flex-col">
						<p className="text-xs text-grayscale-11">Name</p>
						<p className="text-xs text-grayscale-10">The name of the task.</p>
					</div>
					<Input
						type="text"
						className="text-sm"
						placeholder="Task Name"
						value={taskName}
						onChange={(e) => setTaskName(e.target.value)}
						onSubmit={createTask}
					/>
				</div>
				<div className="flex flex-col p-3 gap-3">
					<div className="flex flex-col">
						<p className="text-xs text-grayscale-11">Instructions</p>
						<p className="text-xs text-grayscale-10">
							The instructions for the task.
						</p>
					</div>
					<Textarea
						className="text-sm"
						placeholder="Task Instructions"
						value={taskInstructions}
						onChange={(e) => setTaskInstructions(e.target.value)}
						onSubmit={createTask}
					/>
				</div>
				<div className="flex flex-row items-center justify-between p-3">
					<div className="flex flex-row items-center justify-center gap-2">
						<Select.Root
							items={agentItems}
							value={resolvedAgentId ?? null}
							onValueChange={(value) => setAgentId(value ?? "")}
						>
							<Select.Trigger>
								<Select.Value placeholder="Select an agent" />
								<Select.Icon />
							</Select.Trigger>
							<Select.Portal>
								<Select.Positioner>
									<Select.Popup>
										<Select.List>
											{agents?.map((agent) => (
												<Select.Item value={agent.id} key={agent.id}>
													<Select.ItemText>{agent.name}</Select.ItemText>
													<Select.ItemIndicator />
												</Select.Item>
											))}
										</Select.List>
									</Select.Popup>
								</Select.Positioner>
							</Select.Portal>
						</Select.Root>

						<ModelConfigMenu
							model={agentModel}
							reasoningEffort={agentReasoningEffort}
							speed={agentSpeed}
							onModelChange={setAgentModel}
							onReasoningEffortChange={setAgentReasoningEffort}
							onSpeedChange={setAgentSpeed}
						/>
					</div>
					<div className="flex flex-row items-center justify-center gap-2 ml-auto">
						<Button type="button" onClick={createTask}>
							Create Task
						</Button>
					</div>
				</div>
			</div>

			{/* <input
				type="text"
				placeholder="Task Name"
				value={taskName}
				onChange={(e) => setTaskName(e.target.value)}
			/>
			<input
				type="text"
				placeholder="Task Instructions"
				value={taskInstructions}
				onChange={(e) => setTaskInstructions(e.target.value)}
			/>
			<select
				value={resolvedAgentId ?? ""}
				onChange={(e) => setAgentId(e.target.value)}
			>
				{agents?.map((agent) => (
					<option value={agent.id} key={agent.id}>
						{agent.name}
					</option>
				))}
			</select>
			<select
				value={agentModel}
				onChange={(e) => setAgentModel(e.target.value)}
			>
				{CODEX_MODEL_OPTIONS.map((option) => (
					<option value={option.value} key={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<select
				value={agentReasoningEffort}
				onChange={(e) => setAgentReasoningEffort(e.target.value)}
			>
				{CODEX_REASONING_EFFORT_OPTIONS.map((option) => (
					<option value={option.value} key={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<select
				value={agentSpeed}
				onChange={(e) => setAgentSpeed(e.target.value)}
			>
				{CODEX_SPEED_OPTIONS.map((option) => (
					<option value={option.value} key={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<button
				type="button"
				disabled={!resolvedAgentId}
				onClick={() => {
					createTask();
				}}
			>
				Create Task
			</button>
			<div className="flex flex-col gap-4">
				{tasks?.map((task) => (
					<Link
						href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
						key={task.id}
					>
						{task.name}
					</Link>
				))}
			</div> */}
		</div>
	);
}
