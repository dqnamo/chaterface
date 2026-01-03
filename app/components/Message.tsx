import { UIMessage } from "@/lib/types";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import { useState, useEffect, useRef } from "react";
import { BrainIcon, CaretRightIcon } from "@phosphor-icons/react";
import CodeBlock, { PreBlock } from "./streamdown/CodeBlock";

export default function Message({
  message,
  animate = false,
  isStreaming = false,
}: {
  message: UIMessage;
  animate?: boolean;
  isStreaming?: boolean;
}) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const hasContent = !!message.content;
  const wasReasoning = useRef(false);

  // Auto-open reasoning when streaming starts (and content is empty)
  // Auto-close reasoning when content starts streaming
  useEffect(() => {
    if (isStreaming && message.reasoning && !hasContent) {
      setIsReasoningOpen((prev) => (!prev ? true : prev));
      wasReasoning.current = true;
    } else if (wasReasoning.current && hasContent) {
      setIsReasoningOpen((prev) => (prev ? false : prev));
      wasReasoning.current = false;
    }
  }, [isStreaming, message.reasoning, hasContent]);

  if (message.role === "user") {
    return (
      <div className="flex flex-col">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={animate ? { opacity: 0, y: 10 } : undefined}
          transition={{ duration: 0.2 }}
          className="flex flex-row bg-blue-9 px-3 py-1.5 rounded-xl max-w-[90%] md:max-w-[80%] self-end"
        >
          <p className="text-white whitespace-pre-wrap">{message.content}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={animate ? { opacity: 0, y: 10 } : undefined}
      transition={{ duration: 0.2 }}
      className="flex flex-col p-2 rounded-lg max-w-2xl w-full mx-auto my-2"
    >
      <div className="flex flex-col gap-2 mb-2">
        <p className="text-sm text-gray-scale-11 whitespace-pre-wrap">
          {message.model}
        </p>
      </div>

      {message.reasoning && (
        <div className="flex flex-col gap-1 mb-3 border-gray-scale-6">
          <button
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="flex flex-row items-center gap-2 text-sm text-gray-scale-10 hover:text-gray-scale-11 transition-colors w-full text-left group"
          >
            <BrainIcon size={16} weight="bold" />
            <span className="font-medium group-hover:underline decoration-gray-scale-6 underline-offset-4">
              Reasoning
            </span>
            <motion.div
              animate={{ rotate: isReasoningOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CaretRightIcon weight="bold" />
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{
              height: isReasoningOpen ? "auto" : 0,
              opacity: isReasoningOpen ? 1 : 0,
              marginBottom: isReasoningOpen ? 8 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-gray-scale-10 text-sm whitespace-pre-wrap leading-relaxed opacity-90">
              {message.reasoning}
            </p>
          </motion.div>
        </div>
      )}

      {(message.content === "" || message.content === null) &&
        !message.reasoning && (
          <div className="flex flex-row items-center gap-1 p-2 bg-gray-scale-2 rounded-lg w-max h-8">
            <motion.div
              className="w-1.5 h-1.5 bg-gray-scale-11 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0,
              }}
            />
            <motion.div
              className="w-1.5 h-1.5 bg-gray-scale-11 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
            <motion.div
              className="w-1.5 h-1.5 bg-gray-scale-11 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
            />
          </div>
        )}

      <Streamdown
        className="text-gray-scale-12 whitespace-pre-wrap w-full break-words"
        components={{
          code: ({ children, className, ...props }) => (
            <CodeBlock className={className} {...props}>
              {children}
            </CodeBlock>
          ),
          pre: ({ children }) => <PreBlock>{children}</PreBlock>,
        }}
      >
        {message.content}
      </Streamdown>

      {message.annotations && message.annotations.length > 0 && (
        <div className="flex flex-row flex-wrap gap-2 mt-2 pt-2 border-t border-gray-scale-4/50">
          {message.annotations.map((annotation, index) => {
            if (annotation.type !== "url_citation") return null;
            const url = new URL(annotation.url_citation.url);
            return (
              <a
                key={index}
                href={annotation.url_citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row items-center gap-1.5 px-2 py-1 bg-gray-scale-3 rounded-md hover:bg-gray-scale-4 transition-colors text-xs text-gray-scale-11 border border-gray-scale-4"
              >
                <div className="p-0.5 bg-gray-scale-1 rounded-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`}
                    alt="favicon"
                    className="w-3 h-3 opacity-70"
                  />
                </div>
                <span className="truncate max-w-[150px]">
                  {annotation.url_citation.title || url.hostname}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
