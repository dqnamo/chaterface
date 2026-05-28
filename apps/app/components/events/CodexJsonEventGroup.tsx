"use client";

import { motion } from "motion/react";
import {
  type EventRecord,
  formatJson,
  getCodexEventTitle,
  getShortEventId,
} from "@/components/events/event-utils";

export function CodexJsonEventGroup({ events }: { events: EventRecord[] }) {
  return (
    <li>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <details className="rounded-lg border border-grayscale-3 bg-grayscale-1">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm text-grayscale-11">
            <span className="inline-flex max-w-full items-center gap-2 align-middle">
              <span className="font-mono font-medium text-grayscale-10 text-xs uppercase">
                Codex JSON
              </span>
              <span className="text-grayscale-9 text-xs">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </span>
          </summary>
          <ul className="flex flex-col gap-2 border-grayscale-3 border-t p-2">
            {events.map((event) => (
              <li key={event.id}>
                <details className="rounded-md border border-grayscale-3 bg-grayscale-2">
                  <summary className="cursor-pointer select-none px-2 py-1.5">
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-mono text-grayscale-11 text-xs">
                        {getCodexEventTitle(event)}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-grayscale-9">
                        {getShortEventId(event.id)}
                      </span>
                    </span>
                  </summary>
                  <pre className="max-h-96 overflow-auto border-grayscale-3 border-t p-3 font-mono text-[11px] text-grayscale-12 leading-relaxed">
                    {formatJson(event.data)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </details>
      </motion.div>
    </li>
  );
}
