# Factory

This repo manages factories that prepare and run isolated software-workflow environments for a user.

## Language

**Factory**:
A top-level user-owned environment for software workflow execution.
_Avoid_: workspace, tenant, project

**Default Snapshot**:
The baseline Box snapshot attached to a Factory and used as the starting filesystem state for later work.
_Avoid_: auth snapshot, template, image

**Agent**:
A configured automation identity available to a Factory.
_Avoid_: bot, assistant

**Worker**:
An execution thread that belongs to a Factory and owns one persistent sandbox.
_Avoid_: run, job

**Worker Activity Message**:
A short description of the work a supervisor should associate with a Worker. It may describe the current or most recent work focus; Worker Status determines whether the Worker is actively running.
_Avoid_: worker name, title, status message

**Worker Status**:
The execution readiness state of a Worker.
_Avoid_: job status

**Codex Session**:
The Codex exec session identifier used to resume a Worker conversation.
_Avoid_: chat id, thread id

**Active Codex Process**:
The currently running Codex exec process for a Worker.
_Avoid_: job pid, task pid

**Active Command**:
The user message currently allowed to finalize a Worker after Codex exec exits.
_Avoid_: trigger run id, event lock

**Event**:
A record of something that happened during Worker execution.
_Avoid_: log line, message

**User Message Event**:
An Event that records a user prompt sent to a Worker.
_Avoid_: input, task record

**Codex Event**:
An Event that stores one raw JSONL object emitted by Codex exec.
_Avoid_: parsed log, derived status

**Worker Interrupted Event**:
An Event that records a running Worker being interrupted before a new prompt resumes its Codex Session.
_Avoid_: cancellation, abort

**Worker Trigger Task**:
A background task that runs Codex exec for a Worker and appends Codex Events.
_Avoid_: worker, run

## Relationships

- A **Factory** belongs to exactly one user.
- A **Factory** has zero or more **Agents**.
- A **Factory** has zero or more **Workers**.
- A **Worker** owns exactly one persistent sandbox.
- A **Worker** has zero or one **Worker Activity Message**.
- A **Worker Status** is one of `queued`, `running`, `idle`, `failed`, or `retired`.
- A **Worker** has zero or one **Codex Session** until the first Codex exec run reports its session id.
- A **Worker** has zero or one **Active Codex Process** while Codex exec is running.
- A **Worker** has zero or one **Active Command** to prevent interrupted Codex exec tasks from overwriting a newer prompt.
- A **Worker** has zero or more **Events**.
- A **User Message Event** stores the prompt before a Codex exec run begins.
- A **Codex Event** preserves the raw Codex exec JSONL object in `data`.
- A **Worker Interrupted Event** stores the killed process id and the prompt that caused the interruption.
- A new prompt sent to a running **Worker** always interrupts the **Active Codex Process** before resuming the **Codex Session**.
- The client creates the **Worker** and **User Message Event** immediately so the UI reflects the submitted prompt before background execution starts.
- Instant webhooks observe new **User Message Events** and trigger the **Worker Trigger Task**; the client does not make a second server request to start execution.
- A **Worker Trigger Task** is infrastructure for executing a Worker; it is not the Worker itself.
- A **Factory** has zero or one **Default Snapshot**.

## Example dialogue

> **Dev:** "When a user creates a **Factory**, do we create a **Worker** immediately?"
> **Domain expert:** "No. Creation prepares the **Default Snapshot**; **Workers** are created later when execution starts."

## Flagged ambiguities

- "Snapshot" is resolved here as **Default Snapshot** when it belongs directly to a **Factory**.
