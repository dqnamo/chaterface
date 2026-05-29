"use client";

import { id } from "@instantdb/react";
import { Cpu } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  addImageAttachments,
  cleanupAttachments,
  type ImageAttachment,
  type QueuedComposerMessage,
  removeImageAttachment,
  WorkerComposer,
  type WorkerComposerPresenceControls,
} from "@/components/factory/WorkerComposer";
import { WorkerRunOptions } from "@/components/factory/WorkerRunOptions";
import Button from "@/components/public/Button";
import { Menu } from "@/components/public/Menu";
import {
  defaultWorkerModel,
  defaultWorkerReasoningLevel,
  defaultWorkerSpeed,
  normalizeWorkerModel,
  normalizeWorkerReasoningLevel,
  normalizeWorkerSpeed,
  type WorkerModel,
  type WorkerReasoningLevel,
  type WorkerSpeed,
} from "@/lib/codex/worker-options";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { queueWorkerMessage, triggerWorkerRun } from "./worker-message-client";

export type WorkerRecord = {
  activePid?: number;
  activityMessage?: string;
  agent?: WorkerAgentRecord;
  codexSessionId?: string;
  codexModel?: string;
  codexReasoningLevel?: string;
  codexSpeed?: string;
  createdAt?: string;
  id: string;
  name?: string;
  retiredAt?: string;
  status: string;
  updatedAt?: string;
};

type WorkerAgentRecord = {
  codexModel?: string;
  codexReasoningLevel?: string;
  codexSpeed?: string;
  id: string;
  name?: string;
  type?: string;
};

export function NewWorkerForm({ factoryId }: { factoryId: string }) {
  return <NewWorkerFormContent factoryId={factoryId} instantDb={db} />;
}

function NewWorkerFormContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const router = useRouter();
  const { user } = instantDb.useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const agents = useFactoryAgents({ factoryId, instantDb });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [workerModel, setWorkerModel] =
    useState<WorkerModel>(defaultWorkerModel);
  const [workerReasoningLevel, setWorkerReasoningLevel] =
    useState<WorkerReasoningLevel>(defaultWorkerReasoningLevel);
  const [workerSpeed, setWorkerSpeed] =
    useState<WorkerSpeed>(defaultWorkerSpeed);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useDefaultSelectedAgent({
    agents,
    selectedAgentId,
    setSelectedAgentId,
    setWorkerModel,
    setWorkerReasoningLevel,
    setWorkerSpeed,
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Enter a task before sending it to a worker.");
      return;
    }

    if (!user?.refresh_token) {
      setError("You must be signed in to run a worker.");
      return;
    }

    if (!selectedAgentId) {
      setError("Select an agent before sending this task to a worker.");
      return;
    }

    const workerId = id();

    setError(null);
    setIsSending(true);

    const startedWorkerId = await triggerWorkerRun({
      attachments,
      factoryId,
      instantDb,
      prompt: trimmedPrompt,
      userEmail: user.email,
      userId: user.id,
      userRefreshToken: user.refresh_token,
      workerModel,
      workerReasoningLevel,
      workerSpeed,
      workerAgentId: selectedAgentId,
      workerId,
      onError: setError,
    });

    setIsSending(false);

    if (startedWorkerId) {
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
      router.push(`/factory/${factoryId}/workers/${workerId}`);
    }
  }

  return (
    <WorkerComposer
      attachments={attachments}
      error={error}
      fileInputRef={fileInputRef}
      isSending={isSending}
      onAddAttachment={(files) =>
        addImageAttachments({
          currentAttachments: attachments,
          files,
          onError: setError,
          setAttachments,
        })
      }
      onRemoveAttachment={(attachmentId) =>
        setAttachments((current) =>
          removeImageAttachment(current, attachmentId),
        )
      }
      onSubmit={onSubmit}
      prompt={prompt}
      setPrompt={setPrompt}
      startActions={
        <>
          <WorkerAgentSelector
            agents={agents}
            disabled={isSending}
            selectedAgentId={selectedAgentId}
            setSelectedAgentId={setSelectedAgentId}
            setWorkerModel={setWorkerModel}
            setWorkerReasoningLevel={setWorkerReasoningLevel}
            setWorkerSpeed={setWorkerSpeed}
          />
          <WorkerRunOptions
            disabled={isSending}
            model={workerModel}
            setModel={setWorkerModel}
            reasoningLevel={workerReasoningLevel}
            setReasoningLevel={setWorkerReasoningLevel}
            setSpeed={setWorkerSpeed}
            speed={workerSpeed}
          />
        </>
      }
      submitLabel={isSending ? "Sending..." : "Send"}
      uploadingLabel="Uploading..."
    />
  );
}

export function WorkerPromptForm({
  factoryId,
  presence,
  queuedMessages,
  topSection,
  worker,
}: {
  factoryId?: string;
  presence?: WorkerComposerPresenceControls;
  queuedMessages?: QueuedComposerMessage[];
  topSection?: ReactNode;
  worker: WorkerRecord;
}) {
  return (
    <WorkerPromptFormContent
      factoryId={factoryId}
      instantDb={db}
      presence={presence}
      queuedMessages={queuedMessages}
      topSection={topSection}
      worker={worker}
    />
  );
}

function WorkerPromptFormContent({
  factoryId,
  instantDb,
  presence,
  queuedMessages,
  topSection,
  worker,
}: {
  factoryId?: string;
  instantDb: AppDb;
  presence?: WorkerComposerPresenceControls;
  queuedMessages?: QueuedComposerMessage[];
  topSection?: ReactNode;
  worker: WorkerRecord;
}) {
  const { user } = instantDb.useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const agents = useFactoryAgents({ factoryId, instantDb });
  const selectedAgentId = worker.agent?.id ?? null;
  const [workerModel, setWorkerModel] = useState<WorkerModel>(
    normalizeWorkerModel(worker.codexModel),
  );
  const [workerReasoningLevel, setWorkerReasoningLevel] =
    useState<WorkerReasoningLevel>(
      normalizeWorkerReasoningLevel(worker.codexReasoningLevel),
    );
  const [workerSpeed, setWorkerSpeed] = useState<WorkerSpeed>(
    normalizeWorkerSpeed({
      model: worker.codexModel,
      speed: worker.codexSpeed,
    }),
  );
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);

    const workerId = await triggerWorkerRun({
      attachments,
      factoryId,
      instantDb,
      prompt,
      userEmail: user?.email,
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      workerModel,
      workerReasoningLevel,
      workerSpeed,
      onError: setError,
    });

    setIsSending(false);

    if (workerId) {
      presence?.onAfterSend?.();
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
    }
  }

  async function onQueueMessage() {
    setIsSending(true);

    const queued = await queueWorkerMessage({
      attachments,
      factoryId,
      instantDb,
      prompt,
      userEmail: user?.email,
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      workerModel,
      workerReasoningLevel,
      workerSpeed,
      onError: setError,
    });

    setIsSending(false);

    if (queued) {
      presence?.onAfterSend?.();
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
    }
  }

  const isRetired = worker.status === "retired";
  const isRunning = worker.status === "running";
  const isInputDisabled = isSending;

  return (
    <WorkerComposer
      attachments={attachments}
      disabled={isSending}
      endActions={
        isRunning ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isInputDisabled}
            onClick={onQueueMessage}
          >
            Queue message
          </Button>
        ) : null
      }
      error={error}
      fileInputRef={fileInputRef}
      isSending={isSending}
      onAddAttachment={(files) =>
        addImageAttachments({
          currentAttachments: attachments,
          files,
          onError: setError,
          setAttachments,
        })
      }
      onRemoveAttachment={(attachmentId) =>
        setAttachments((current) =>
          removeImageAttachment(current, attachmentId),
        )
      }
      onSubmit={onSubmit}
      placeholder={
        isRetired
          ? "Send a message to unretire this worker..."
          : "Send a message to the worker..."
      }
      presence={presence}
      prompt={prompt}
      queuedMessages={queuedMessages}
      setPrompt={setPrompt}
      startActions={
        <>
          <WorkerAgentSelector
            agents={agents}
            disabled
            selectedAgent={worker.agent}
            selectedAgentId={selectedAgentId}
            setWorkerModel={setWorkerModel}
            setWorkerReasoningLevel={setWorkerReasoningLevel}
            setWorkerSpeed={setWorkerSpeed}
          />
          <WorkerRunOptions
            disabled={isInputDisabled}
            model={workerModel}
            setModel={setWorkerModel}
            reasoningLevel={workerReasoningLevel}
            setReasoningLevel={setWorkerReasoningLevel}
            setSpeed={setWorkerSpeed}
            speed={workerSpeed}
          />
        </>
      }
      submitLabel={isSending ? "Sending..." : isRunning ? "Send now" : "Send"}
      topSection={topSection}
      uploadingLabel="Uploading..."
    />
  );
}

function useFactoryAgents({
  factoryId,
  instantDb,
}: {
  factoryId?: string;
  instantDb: AppDb;
}) {
  const { data } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
            agents: {},
          },
        }
      : null,
  );
  const agents = (data?.factories?.[0]?.agents ?? []) as WorkerAgentRecord[];

  return [...agents].sort((first, second) =>
    getAgentLabel(first).localeCompare(getAgentLabel(second)),
  );
}

function useDefaultSelectedAgent({
  agents,
  selectedAgentId,
  setSelectedAgentId,
  setWorkerModel,
  setWorkerReasoningLevel,
  setWorkerSpeed,
}: {
  agents: WorkerAgentRecord[];
  selectedAgentId: null | string;
  setSelectedAgentId: (agentId: null | string) => void;
  setWorkerModel: (model: WorkerModel) => void;
  setWorkerReasoningLevel: (reasoningLevel: WorkerReasoningLevel) => void;
  setWorkerSpeed: (speed: WorkerSpeed) => void;
}) {
  useEffect(() => {
    if (agents.length === 0) {
      setSelectedAgentId(null);
      return;
    }

    if (
      selectedAgentId &&
      agents.some((agent) => agent.id === selectedAgentId)
    ) {
      return;
    }

    const agent = agents[0];

    setSelectedAgentId(agent.id);
    applyAgentDefaults({
      agent,
      setWorkerModel,
      setWorkerReasoningLevel,
      setWorkerSpeed,
    });
  }, [
    agents,
    selectedAgentId,
    setSelectedAgentId,
    setWorkerModel,
    setWorkerReasoningLevel,
    setWorkerSpeed,
  ]);
}

function WorkerAgentSelector({
  agents,
  disabled,
  selectedAgent: selectedAgentFallback,
  selectedAgentId,
  setSelectedAgentId,
  setWorkerModel,
  setWorkerReasoningLevel,
  setWorkerSpeed,
}: {
  agents: WorkerAgentRecord[];
  disabled?: boolean;
  selectedAgent?: WorkerAgentRecord;
  selectedAgentId: null | string;
  setSelectedAgentId?: (agentId: null | string) => void;
  setWorkerModel: (model: WorkerModel) => void;
  setWorkerReasoningLevel: (reasoningLevel: WorkerReasoningLevel) => void;
  setWorkerSpeed: (speed: WorkerSpeed) => void;
}) {
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ??
    selectedAgentFallback;
  const selectedLabel = selectedAgent
    ? getAgentLabel(selectedAgent)
    : "No agent";

  function onSelectAgent(agent: WorkerAgentRecord) {
    setSelectedAgentId?.(agent.id);
    applyAgentDefaults({
      agent,
      setWorkerModel,
      setWorkerReasoningLevel,
      setWorkerSpeed,
    });
  }

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={`Worker agent: ${selectedLabel}`}
        className="h-9 text-grayscale-10 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || agents.length === 0}
        type="button"
      >
        <Cpu size={16} weight="bold" aria-hidden="true" />
        <span className="font-semibold text-grayscale-12">{selectedLabel}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup className="w-56">
            <Menu.RadioGroup
              value={selectedAgentId ?? ""}
              onValueChange={(value) => {
                const agent = agents.find(
                  (candidate) => candidate.id === value,
                );

                if (agent) {
                  onSelectAgent(agent);
                }
              }}
            >
              {agents.map((agent) => (
                <Menu.RadioItem key={agent.id} value={agent.id}>
                  <Menu.RadioItemIndicator />
                  <span className="min-w-0 truncate">
                    {getAgentLabel(agent)}
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function applyAgentDefaults({
  agent,
  setWorkerModel,
  setWorkerReasoningLevel,
  setWorkerSpeed,
}: {
  agent: WorkerAgentRecord;
  setWorkerModel: (model: WorkerModel) => void;
  setWorkerReasoningLevel: (reasoningLevel: WorkerReasoningLevel) => void;
  setWorkerSpeed: (speed: WorkerSpeed) => void;
}) {
  const model = normalizeWorkerModel(agent.codexModel);

  setWorkerModel(model);
  setWorkerReasoningLevel(
    normalizeWorkerReasoningLevel(agent.codexReasoningLevel),
  );
  setWorkerSpeed(
    normalizeWorkerSpeed({
      model,
      speed: agent.codexSpeed,
    }),
  );
}

function getAgentLabel(agent: WorkerAgentRecord) {
  const name = agent.name?.trim();

  if (name) {
    return name;
  }

  const typeLabel = agent.type
    ? `${agent.type.charAt(0).toUpperCase()}${agent.type.slice(1)}`
    : "Agent";

  return `${typeLabel} ${agent.id.slice(0, 8)}`;
}
