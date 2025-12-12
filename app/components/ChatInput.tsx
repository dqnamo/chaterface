"use client";

import { motion } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";

type Model = {
  id: string;
  name: string;
  description?: string;
  context_length: number;
};

import PiSendPlaneSlantSolid from "./icons/PiSendPlaneSlantSolid";
import PiAlertTriangleStroke from "./icons/PiAlertTriangleStroke";
import PiUserSettingsSolid from "./icons/PiUserSettingsSolid";
export default function ChatInput({
  onSend,
  style = "floating",
}: {
  onSend: (message: string, model: string) => void;
  style?: "floating" | "bottom";
}) {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // get the count from local storage
        let response = await fetch("/api/chat/models/fetch", {
          method: "POST",
          body: JSON.stringify({ countOnly: true }),
        });
        let data = await response.json();
        if (localStorage.getItem("modelsCount") == data.count.toString()) {
          setModels(JSON.parse(localStorage.getItem("modelsList") || "[]"));
          return;
        }

        response = await fetch("/api/chat/models/fetch", {
          method: "POST",
          body: JSON.stringify({ countOnly: false }),
        });

        data = await response.json();
        setModels(data);
        localStorage.setItem("modelsList", JSON.stringify(data));
        localStorage.setItem("modelsCount", data.length.toString());
      } finally {
        setModelsLoading(false);
      }
    };

    if (localStorage.getItem("lastSelectedModel")) {
      setModel(localStorage.getItem("lastSelectedModel") as string);
    } else {
      setModel("xai/grok-4.1-fast");
    }

    fetchModels();
  }, []);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: modelDropdownOpen,
    onOpenChange: setModelDropdownOpen,
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 0 })],
    placement: "top-start",
  });

  const { setReference, setFloating } = refs;

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleSend = () => {
    onSend(message.trim(), model);
    setMessage("");
  };

  const handleModelSelect = (model: string) => {
    setModel(model);
    localStorage.setItem("lastSelectedModel", model);
    setModelDropdownOpen(false);
  };

  const prettyContextLength = (contextLength: number) => {
    if (contextLength > 1000) {
      return `${(contextLength / 1000).toFixed(0)}K max context`;
    }
    return contextLength;
  };

  const filteredModels = useMemo(() => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const scoreContains = (text: string, q: string) => {
      if (!q) return 0;
      const idx = text.indexOf(q);
      if (idx === -1) return 0;
      // Earlier matches are better; longer queries also deserve a bump.
      return 120 + Math.min(40, q.length * 4) - Math.min(40, idx);
    };

    const scoreTokenMatch = (text: string, tokens: string[]) => {
      if (tokens.length === 0) return 0;
      let score = 0;
      for (const t of tokens) {
        const idx = text.indexOf(t);
        if (idx === -1) return 0; // all tokens must match somewhere
        score += 35 + Math.min(20, t.length * 2) - Math.min(20, idx);
      }
      return score;
    };

    const scoreSubsequence = (text: string, q: string) => {
      // Simple fuzzy: characters appear in order, penalize gaps.
      if (!q) return 0;
      let qi = 0;
      let gaps = 0;
      for (let i = 0; i < text.length && qi < q.length; i++) {
        if (text[i] === q[qi]) {
          qi++;
        } else if (qi > 0) {
          gaps++;
        }
      }
      if (qi !== q.length) return 0;
      return 55 + Math.min(30, q.length * 3) - Math.min(55, gaps);
    };

    const scoreAcronym = (text: string, q: string) => {
      // e.g. "gpt4" matching "gpt-4o-mini" tokens.
      if (!q) return 0;
      const words = text.split(" ").filter(Boolean);
      if (words.length === 0) return 0;
      const acronym = words.map((w) => w[0]).join("");
      if (!acronym) return 0;
      if (acronym.startsWith(q)) return 70 + Math.min(20, q.length * 3);
      return 0;
    };

    const scoreField = (
      raw: string | undefined,
      qNorm: string,
      tokens: string[]
    ) => {
      if (!raw) return 0;
      const text = normalize(raw);
      if (!text) return 0;
      return Math.max(
        scoreContains(text, qNorm),
        scoreTokenMatch(text, tokens),
        scoreSubsequence(text, qNorm),
        scoreAcronym(text, qNorm)
      );
    };

    const qNorm = normalize(modelSearch);
    if (!qNorm) return models;

    const tokens = qNorm.split(" ").filter(Boolean);

    return models
      .map((m) => {
        const nameScore = scoreField(m.name, qNorm, tokens) * 1.2;
        const idScore = scoreField(m.id, qNorm, tokens) * 1.0;
        const descScore = scoreField(m.description, qNorm, tokens) * 0.9;
        const score = Math.max(nameScore, idScore, descScore);
        return { m, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.m.name.localeCompare(b.m.name);
      })
      .map(({ m }) => m);
  }, [models, modelSearch]);

  return (
    <motion.div
      layoutId="chat-input-container"
      className={`backdrop-blur-sm flex flex-col subtle-shadow bg-white dark:bg-gray-1 border border-gray-3 dark:border-gray-2 rounded-xl w-full ${
        style === "bottom"
          ? "w-full max-w-2xl fixed bottom-2"
          : "max-w-2xl mt-10 "
      }`}
    >
      <motion.div
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col p-1 shrink-0"
      >
        <div className="flex flex-row bg-gray-2 rounded-lg p-1.5 gap-2 items-center">
          <div className="flex flex-row items-center px-1.5 gap-2">
            <PiAlertTriangleStroke className="text-red-500 text-xs" size={16} />
            <h3 className="text-gray-11 text-xs font-medium">
              No OpenRouter API Key Set
            </h3>
          </div>

          <div
            onClick={handleSend}
            className="ml-auto bg-gray-12 dark:bg-gray-5 rounded-lg border border-transparent dark:border-gray-6 dark:hover:bg-gray-3 px-2 py-1 flex flex-row items-center justify-center gap-2"
          >
            <PiUserSettingsSolid
              className="text-gray-2 dark:text-gray-12"
              size={12}
            />
            <p className="text-gray-2 dark:text-gray-12 font-medium text-xs">
              Open Settings
            </p>
          </div>
        </div>
      </motion.div>
      <textarea
        className="w-full h-full p-4 resize-none focus:outline-none text-gray-12 text-sm placeholder:text-gray-10"
        rows={2}
        placeholder="Ask me anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            handleSend();
          }
        }}
      />
      <div className="flex flex-row items-end justify-between p-2">
        <button
          type="button"
          className="focus:outline-none focus:ring-0"
          ref={setReference}
          {...getReferenceProps({
            className:
              "bg-gray-2 dark:bg-gray-3 rounded-lg border border-gray-4 dark:border-gray-4 px-2 py-1 hover:bg-gray-4/70 dark:hover:bg-gray-4/40 transition-colors",
          })}
        >
          <p className="text-gray-10 text-xs">{model}</p>
        </button>
        {modelDropdownOpen && (
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps({
              className:
                "bg-white dark:bg-gray-2 overflow-hidden border border-gray-4 dark:border-gray-4 shadow-1 rounded-lg z-50 text-sm text-gray-12 max-w-xs w-full",
            })}
          >
            <div className="flex flex-col overflow-hidden max-h-80 divide-y divide-gray-3 dark:divide-gray-3">
              <div className="overflow-y-auto flex flex-col divide-y divide-gray-3 dark:divide-gray-3 no-scrollbar">
                {modelsLoading ? (
                  <div className="text-gray-9 text-xs p-3">Loading models…</div>
                ) : filteredModels.length === 0 ? (
                  <div className="text-gray-9 text-xs p-3">
                    {models.length === 0
                      ? "No models available."
                      : `No models found for “${modelSearch.trim()}”.`}
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <button
                      key={model.id}
                      className="text-gray-10 text-xs p-2 text-start flex flex-col hover:bg-gray-3 dark:hover:bg-gray-3 transition-colors"
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <p className="text-gray-11 text-xs">{model.name}</p>
                      <div className="flex flex-row items-center justify-between gap-2">
                        <p className="text-gray-9 text-[11px]">
                          {model.id.slice(0, 10)}...{model.id.slice(-10)}
                        </p>
                        <div className="flex flex-row items-center  gap-2">
                          <p className="text-gray-9 text-[11px] ">
                            {prettyContextLength(model.context_length)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Search models..."
                className="w-full px-2 py-3 text-xs text-gray-12 placeholder:text-gray-9 focus:outline-none focus:ring-0 bg-gray-2/50"
                onChange={(e) => setModelSearch(e.target.value)}
              />
            </div>
          </div>
        )}
        <div
          onClick={handleSend}
          className="bg-gray-12 dark:bg-gray-5 rounded-lg border border-transparent dark:border-gray-6 dark:hover:bg-gray-3 px-2 py-1 flex flex-row items-center justify-center gap-2"
        >
          <PiSendPlaneSlantSolid
            className="text-gray-2 dark:text-gray-12"
            size={12}
          />
          <p className="text-gray-2 dark:text-gray-12 font-medium text-sm">
            Send
          </p>
        </div>
      </div>
    </motion.div>
  );
}
