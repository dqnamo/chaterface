"use client";

import { useState, use, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useData } from "@/app/providers/DataProvider";
import { DateTime } from "luxon";
import { id } from "@instantdb/react";
import ChatInput from "@/app/components/ChatInput";
import { useApiKey } from "@/lib/apiKey";
import Image from "next/image";
import Message from "@/app/components/Message";
import { useModelStore } from "@/lib/modelStore";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db } = useData();
  const { apiKey } = useApiKey();
  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    reasoning: string;
  } | null>(null);
  const { conversationId } = use(params);

  const { data, isLoading } = db.useQuery({
    conversations: {
      $: {
        where: {
          id: conversationId,
        },
      },
      messages: {
        attachments: {},
      },
    },
  });

  const { selectedModel } = useModelStore();

  const rawMessages = data?.conversations?.[0]?.messages;
  const messages = useMemo(() => rawMessages || [], [rawMessages]);

  const initialLoadDone = useRef(false);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    initialLoadDone.current = false;
    seenIds.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (!isLoading) {
      if (!initialLoadDone.current) {
        // Initial load just finished
        messages.forEach((m) => seenIds.current.add(m.id));
        initialLoadDone.current = true;
      } else {
        // Subsequent updates
        messages.forEach((m) => seenIds.current.add(m.id));
      }
    }
  }, [isLoading, messages]);

  const [status, setStatus] = useState<
    "ready" | "streaming" | "submitted" | "error"
  >("ready");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop function for the user
  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("ready");
    }
  };

  useEffect(() => {
    // check if its first message in the conversation
    if (data?.conversations?.[0]?.messages?.length === 1) {
      handleSendMessage("", selectedModel, true);
    }
  }, [data, selectedModel]);

  const handleSendMessage = async (
    message: string,
    model: string,
    firstMessage = false
  ) => {
    console.log("message", message);
    // Optimistic update for user message
    if (!firstMessage) {
      await db.transact(
        db.tx.messages[id()]
          .update({
            content: message,
            role: "user",
            createdAt: DateTime.now().toISO(),
            model: model,
          })
          .link({ conversation: conversationId })
      );
    }

    setStatus("streaming");

    // Create assistant message placeholder
    const assistantId = id();
    await db.transact(
      db.tx.messages[assistantId]
        .update({
          content: "",
          role: "assistant",
          createdAt: DateTime.now().toISO(),
          model: model,
        })
        .link({ conversation: conversationId })
    );

    setStreamingMessage({ id: assistantId, content: "", reasoning: "" });

    try {
      const newMessages = [
        ...messages,
        {
          role: "user",
          id: assistantId,
          content: message,
        },
      ];
      console.log("newMessages", newMessages);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          model: model,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullReasoning = "";
      let fullUsage = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(":")) continue;

          if (trimmedLine.startsWith("data: ")) {
            const dataStr = trimmedLine.replace("data: ", "");
            if (dataStr === "[DONE]") continue;

            try {
              const json = JSON.parse(dataStr);
              const delta = json.choices?.[0]?.delta;

              if (json.usage) {
                fullUsage = json.usage;
              }

              if (delta) {
                const contentChunk = delta.content || "";
                const reasoningChunk =
                  delta.reasoning || delta.reasoning_content || "";

                console.log("contentChunk", contentChunk);

                fullContent += contentChunk;
                fullReasoning += reasoningChunk;

                setStreamingMessage({
                  id: assistantId,
                  content: fullContent,
                  reasoning: fullReasoning,
                });
              }
            } catch (e) {
              console.error("Error parsing JSON line:", e);
            }
          }
        }
      }

      // Update DB with accumulated content
      await db.transact(
        db.tx.messages[assistantId].update({
          content: fullContent,
          reasoning: fullReasoning,
          usage: fullUsage,
        })
      );

      setStreamingMessage(null);
      setStatus("ready");
    } catch (error) {
      console.error("Chat error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center p-4 pb-60">
      <motion.div layoutId="chat-content" className="hidden" />

      <div className="flex flex-col w-full max-w-2xl mx-auto lg:p-4 pt-18 gap-2 pb-60">
        {messages.map((message) => {
          const isStreaming = streamingMessage?.id === message.id;
          const displayMessage = isStreaming
            ? {
                ...message,
                content: streamingMessage.content,
                reasoning: streamingMessage.reasoning,
              }
            : message;
          const shouldAnimate =
            initialLoadDone.current && !seenIds.current.has(message.id);
          return (
            <Message
              key={message.id}
              message={displayMessage}
              animate={shouldAnimate}
            />
          );
        })}

        {status === "submitted" && <LoadingSpinner />}
      </div>

      <ChatInput
        onSend={handleSendMessage}
        onStop={stop}
        status={status}
        style="bottom"
      />
    </div>
  );
}

function LoadingSpinner() {
  const [text, setText] = useState("Thinking...");

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadingTexts = [
        "Consulting the neural spirits...",
        "Browsing the entire internet...",
        "Generating witty retort...",
        "Doing complex math...",
        "Pretending to think...",
        "Asking the silicon oracle...",
        "Analyzing your genius...",
        "Crunching the tokens...",
        "Synthesizing brilliance...",
        "Loading personality...",
      ];
      setText(loadingTexts[Math.floor(Math.random() * loadingTexts.length)]);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-row items-center gap-1 animate-pulse">
      <Image
        src="/white-logomark.svg"
        alt="Logo"
        width={20}
        height={20}
        className="hidden dark:block opacity-80"
      />
      <Image
        src="/black-logomark.svg"
        alt="Logo"
        width={20}
        height={20}
        className="block dark:hidden opacity-80"
      />
      <p className="text-gray-11 text-sm">{text}</p>
    </div>
  );
}
