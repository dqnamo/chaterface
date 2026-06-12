"use client";

import { LightningIcon } from "@phosphor-icons/react";
import {
	CODEX_MODEL_OPTIONS,
	CODEX_REASONING_EFFORT_OPTIONS,
	CODEX_SPEED_OPTIONS,
} from "@/codex-options";
import { Menu } from "@/components/Menu";

type ModelConfigMenuProps = {
	model: string;
	reasoningEffort: string;
	speed: string;
	onModelChange: (value: string) => void;
	onReasoningEffortChange: (value: string) => void;
	onSpeedChange: (value: string) => void;
};

export function ModelConfigMenu({
	model,
	reasoningEffort,
	speed,
	onModelChange,
	onReasoningEffortChange,
	onSpeedChange,
}: ModelConfigMenuProps) {
	return (
		<Menu.Root>
			<Menu.Trigger className="min-w-0 max-w-full">
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="truncate font-mono text-[11px]">{model}</span>
					<span className="shrink-0 text-grayscale-9">/</span>
					<span className="shrink-0 font-sans">{reasoningEffort}</span>
					{speed === "fast" ? (
						<LightningIcon
							weight="fill"
							className="size-3 shrink-0 text-yellow-9"
							aria-label="Fast mode"
						/>
					) : null}
				</span>
				<Menu.TriggerIcon />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="start" sideOffset={6}>
					<Menu.Popup>
						<Menu.RadioGroup
							value={model}
							onValueChange={(value) => onModelChange(String(value))}
						>
							<Menu.GroupLabel>Model</Menu.GroupLabel>
							{CODEX_MODEL_OPTIONS.map((option) => (
								<Menu.RadioItem key={option.value} value={option.value}>
									{option.label}
									<Menu.RadioItemIndicator />
								</Menu.RadioItem>
							))}
						</Menu.RadioGroup>

						<Menu.Separator />

						<Menu.SubmenuRoot>
							<Menu.SubmenuTrigger>
								Reasoning
								<span className="ml-auto text-grayscale-10">
									{reasoningEffort}
								</span>
							</Menu.SubmenuTrigger>
							<Menu.Portal>
								<Menu.Positioner side="right" align="start" sideOffset={6}>
									<Menu.Popup>
										<Menu.RadioGroup
											value={reasoningEffort}
											onValueChange={(value) =>
												onReasoningEffortChange(String(value))
											}
										>
											{CODEX_REASONING_EFFORT_OPTIONS.map((option) => (
												<Menu.RadioItem key={option.value} value={option.value}>
													{option.label}
													<Menu.RadioItemIndicator />
												</Menu.RadioItem>
											))}
										</Menu.RadioGroup>
									</Menu.Popup>
								</Menu.Positioner>
							</Menu.Portal>
						</Menu.SubmenuRoot>

						<Menu.SubmenuRoot>
							<Menu.SubmenuTrigger>
								Speed
								<span className="ml-auto text-grayscale-10">{speed}</span>
							</Menu.SubmenuTrigger>
							<Menu.Portal>
								<Menu.Positioner side="right" align="start" sideOffset={6}>
									<Menu.Popup>
										<Menu.RadioGroup
											value={speed}
											onValueChange={(value) => onSpeedChange(String(value))}
										>
											{CODEX_SPEED_OPTIONS.map((option) => (
												<Menu.RadioItem key={option.value} value={option.value}>
													{option.label}
													<Menu.RadioItemIndicator />
												</Menu.RadioItem>
											))}
										</Menu.RadioGroup>
									</Menu.Popup>
								</Menu.Positioner>
							</Menu.Portal>
						</Menu.SubmenuRoot>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
