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

import SettingsModal from "./SettingsModal";
import { useModelStore } from "@/lib/modelStore";
import { useApiKey } from "@/lib/apiKey";
import { useData } from "../providers/DataProvider";

import { useModal } from "../providers/ModalProvider";
import {
  FadersIcon,
  PaperPlaneTiltIcon,
  StopIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { userplexClient } from "@/lib/userplexClient";
import { useIsPWA } from "@/lib/useIsPWA";

export default function ChatInput({
  onSend,
  onStop,
  status,
  style = "floating",
}: {
  onSend: (message: string, model: string) => void;
  onStop?: () => void;
  status?: "streaming" | "submitted" | "ready" | "error";
  style?: "floating" | "bottom";
}) {
  const [message, setMessage] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const { showModal } = useModal();
  const { hasKey: hasApiKey, isLoading: isApiKeyLoading } = useApiKey();
  const { user, db } = useData();

  const { data: userData } = db.useQuery(
    user ? { $users: { $: { where: { id: user.id } } } } : null
  );
  const userSettings = userData?.$users?.[0]?.settings;
  const disabledModels = useMemo(
    () => (userSettings?.disabledModels as string[]) || [],
    [userSettings]
  );
  const favorites = useMemo(
    () => (userSettings?.favorites as string[]) || [],
    [userSettings]
  );
  const defaultModel = userSettings?.defaultModel as string | undefined;

  const {
    selectedModel: model,
    setSelectedModel,
    models,
    isLoading: modelsLoading,
    fetchModels,
  } = useModelStore();

  const isPWA = useIsPWA();

  useEffect(() => {
    if (defaultModel) {
      setSelectedModel(defaultModel);
    }
  }, [defaultModel, setSelectedModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: modelDropdownOpen,
    onOpenChange: (open) => {
      if (hasApiKey) {
        setModelDropdownOpen(open);
      }
    },
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

  const isStreaming = status === "streaming" || status === "submitted";
  const isInputEmpty = message.trim().length === 0;

  const handleSend = () => {
    if (isInputEmpty) return;
    onSend(message.trim(), model);
    userplexClient.logs.new({
      name: "sent_new_message",
      user_id: user?.id ?? "",
      data: {
        model: model,
      },
    });
    setMessage("");
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
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

    // Filter out disabled models first
    const availableModels = models.filter(
      (m) => !disabledModels.includes(m.id)
    );

    if (!qNorm) {
      return availableModels.sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const tokens = qNorm.split(" ").filter(Boolean);

    return availableModels
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
        const aFav = favorites.includes(a.m.id);
        const bFav = favorites.includes(b.m.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.m.name.localeCompare(b.m.name);
      })
      .map(({ m }) => m);
  }, [models, modelSearch, disabledModels, favorites]);

  return (
    <motion.div
      layoutId="chat-input-container"
      className={`z-50 backdrop-blur-sm flex flex-col subtle-shadow bg-white dark:bg-gray-1 border border-gray-3 dark:border-gray-2 w-full ${
        style === "bottom"
          ? `w-full max-w-2xl fixed bottom-0 rounded-t-xl md:rounded-xl md:bottom-2 ${
              isPWA ? "pb-10 md:pb-0" : ""
            }`
          : "max-w-2xl mt-10 rounded-xl"
      }`}
    >
      {!isApiKeyLoading && !hasApiKey && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col p-1 shrink-0"
        >
          <div className="flex flex-row bg-gray-2 rounded-lg p- 1.5 gap-2 items-center">
            <div className="flex flex-row items-center px-1.5 gap-2">
              <WarningIcon
                className="text-red-500 text-sm"
                size={16}
                weight="bold"
              />
              <h3 className="text-gray-11 text-sm font-medium">
                No OpenRouter API Key Set
              </h3>
            </div>

            <button
              type="button"
              onClick={() => showModal(<SettingsModal />)}
              className="ml-auto bg-gray-12 dark:bg-gray-5 rounded-lg border border-transparent dark:border-gray-6 dark:hover:bg-gray-3 px-2 py-1 flex flex-row items-center justify-center gap-2"
            >
              <FadersIcon
                className="text-gray-2 dark:text-gray-12"
                size={14}
                weight="bold"
              />
              <span className="text-gray-2 dark:text-gray-12 font-medium text-sm">
                Open Settings
              </span>
            </button>
          </div>
        </motion.div>
      )}
      <textarea
        className="w-full h-full p-4 resize-none focus:outline-none text-gray-12 text-sm placeholder:text-gray-11"
        rows={2}
        placeholder="Ask me anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming && !isInputEmpty && hasApiKey) {
              handleSend();
            }
          }
        }}
      />
      <div className="flex flex-row items-end justify-between p-2">
        <button
          type="button"
          disabled={!hasApiKey}
          className="focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
          ref={setReference}
          {...getReferenceProps({
            className:
              "bg-gray-2 cursor-pointer dark:bg-gray-3 rounded-lg border border-gray-4 dark:border-gray-4 px-2 py-1 hover:bg-gray-4/70 dark:hover:bg-gray-4/40 transition-colors disabled:opacity-50",
          })}
        >
          <p className="text-gray-11 text-sm">
            {hasApiKey ? model : "Set API key"}
          </p>
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
                  <div className="text-gray-11 text-sm p-3">
                    Loading models…
                  </div>
                ) : filteredModels.length === 0 ? (
                  <div className="text-gray-11 text-sm p-3">
                    {models.length === 0
                      ? "No models available."
                      : `No models found for “${modelSearch.trim()}”.`}
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <button
                      key={model.id}
                      className="text-gray-11 text-sm p-2 text-start flex flex-col hover:bg-gray-3 dark:hover:bg-gray-3 transition-colors"
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <p className="text-gray-11 text-sm">{model.name}</p>
                      <div className="flex flex-row items-center justify-between gap-2">
                        <p className="text-gray-11 text-[11px]">
                          {model.id.slice(0, 10)}...{model.id.slice(-10)}
                        </p>
                        <div className="flex flex-row items-center  gap-2">
                          <p className="text-gray-11 text-[11px] ">
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
                className="w-full px-2 py-3 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-0 bg-gray-2/50"
                onChange={(e) => setModelSearch(e.target.value)}
              />
            </div>
          </div>
        )}
        <div
          onClick={
            isStreaming
              ? onStop
              : !isInputEmpty && hasApiKey
              ? handleSend
              : undefined
          }
          className={`${
            isStreaming || (!isInputEmpty && hasApiKey)
              ? "bg-gray-12 dark:bg-gray-5 cursor-pointer dark:hover:bg-gray-3"
              : "bg-gray-12/50 dark:bg-gray-5/50 cursor-not-allowed"
          } rounded-lg border border-transparent dark:border-gray-6 px-2 py-1 flex flex-row items-center justify-center gap-2`}
        >
          {isStreaming ? (
            <StopIcon
              weight="fill"
              className="text-gray-2 dark:text-gray-12"
              size={14}
            />
          ) : (
            <PaperPlaneTiltIcon
              weight="fill"
              className="text-gray-2 dark:text-gray-12"
              size={14}
            />
          )}
          <p className="text-gray-2 dark:text-gray-12 font-medium text-sm">
            {isStreaming ? "Stop" : "Send"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
