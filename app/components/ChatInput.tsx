"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
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
  context_length: number;
};

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

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <motion.div
      layoutId="chat-input-container"
      className={`backdrop-blur-sm flex flex-col bg-gray-2/80 dark:bg-gray-2/80 border border-gray-3 dark:border-gray-3 rounded-xl w-full ${
        style === "bottom"
          ? "w-full max-w-3xl fixed bottom-0 inset-x-0 mx-auto rounded-b-none border-b-0"
          : "max-w-xl mt-10"
      }`}
    >
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
              "bg-gray-3 dark:bg-gray-3 rounded-lg border border-gray-4 dark:border-gray-4 px-2 py-1 hover:bg-gray-4/70 dark:hover:bg-gray-4/40 transition-colors",
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
                "bg-white dark:bg-gray-2 overflow-hidden border border-gray-4 dark:border-gray-4 shadow-lg rounded-lg z-50 text-sm text-gray-12 max-w-xs w-full",
            })}
          >
            <div className="flex flex-col overflow-hidden max-h-80 divide-y divide-gray-3 dark:divide-gray-3">
              <div className="overflow-y-auto flex flex-col divide-y divide-gray-3 dark:divide-gray-3">
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
                        <p className="text-gray-9 text-[11px] font-mono">
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
                placeholder="Search models..."
                className="w-full px-2 py-3 text-xs text-gray-12 placeholder:text-gray-9 focus:outline-none focus:ring-0 bg-gray-2/50"
                onChange={(e) => setModelSearch(e.target.value)}
              />
            </div>
          </div>
        )}
        <div
          onClick={handleSend}
          className="bg-gray-12 dark:bg-gray-5 rounded-lg border border-transparent dark:border-gray-6 dark:hover:bg-gray-3 px-2 py-1"
        >
          <p className="text-gray-2 dark:text-gray-12 font-medium text-sm">
            Send
          </p>
        </div>
      </div>
    </motion.div>
  );
}
