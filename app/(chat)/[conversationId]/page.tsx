"use client";

import { useState, use, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useData } from "@/app/providers/DataProvider";
import { DateTime } from "luxon";
import { id } from "@instantdb/react";
import UIMessage from "@/app/components/UIMessage";
import type {
  UIMessage as UIMessageModel,
  MessageRole,
  MessagePart,
} from "@/lib/types";
import ChatInput from "@/app/components/ChatInput";
import { useModelStore } from "@/lib/modelStore";
import { useApiKey } from "@/lib/apiKey";
import Image from "next/image";

interface AttachmentInput {
  id?: string;
  url: string;
  name?: string;
  contentType?: string;
  type?: string;
  [key: string]: unknown;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db } = useData();
  const { selectedModel } = useModelStore();
  const { apiKey, isLoading: isApiKeyLoading } = useApiKey();
  const [initialMessagesInitialized, setInitialMessagesInitialized] =
    useState(false);
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

  const [messages, setMessages] = useState<UIMessageModel[]>([]);
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

  const handleSendMessage = useCallback(
    async (
      text: string,
      modelId: string,
      attachments: AttachmentInput[] = [],
      isExistingUserMessage: boolean = false,
      initialMessages?: UIMessageModel[]
    ) => {
      if (!text && attachments.length === 0 && !isExistingUserMessage) return;

      setStatus("submitted");

      // We need to use functional state update or ref to get latest messages if this function is stale?
      // But since we depend on messages, it won't be stale.
      let currentMessages = initialMessages
        ? [...initialMessages]
        : [...messages];

      // 1. Handle User Message
      if (!isExistingUserMessage) {
        const messageId = id();
        const newUserMsg: UIMessageModel = {
          id: messageId,
          role: "user",
          content: text,
          parts: [{ type: "text", text }],
          createdAt: new Date(),
          experimental_attachments: attachments.map((a) => ({
            url: a.url,
            name: a.name,
            contentType: a.contentType || a.type,
          })),
        };
        currentMessages = [...currentMessages, newUserMsg];
        setMessages(currentMessages);

        // Optimistic DB update
        const tx = db.tx.messages[messageId]
          .update({
            content: text,
            role: "user",
            createdAt: DateTime.now().toISO(),
            model: modelId,
          })
          .link({ conversation: conversationId });

        attachments.forEach((a) => {
          if (a.id) tx.link({ attachments: a.id });
        });

        await db.transact([tx]);
      }

      // 2. Prepare Assistant Message placeholder
      const assistantId = id();
      const assistantMsg: UIMessageModel = {
        id: assistantId,
        role: "assistant",
        content: "",
        parts: [],
        createdAt: new Date(),
      };

      // Update local state with assistant message
      setMessages((prev) => [...prev, assistantMsg]);
      // Also update currentMessages for the API call
      currentMessages.push(assistantMsg);

      setStatus("streaming");

      abortControllerRef.current = new AbortController();

      let fullContent = "";
      let fullReasoning = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages.slice(0, -1), // Send history excluding empty assistant msg? Or include it? Usually exclude.
            // Actually openrouter expects history. Assistant msg is empty, so exclude.
            model: modelId,
            conversationId,
            apiKey,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta;
                if (delta) {
                  const contentChunk = delta.content || "";
                  const reasoningChunk =
                    delta.reasoning || delta.reasoning_content || "";

                  fullContent += contentChunk;
                  fullReasoning += reasoningChunk;

                  setMessages((prev) => {
                    // Find our assistant message to update
                    const index = prev.findIndex((m) => m.id === assistantId);
                    if (index === -1) return prev;

                    const newParts: MessagePart[] = [];
                    if (fullReasoning) {
                      newParts.push({ type: "reasoning", text: fullReasoning });
                    }
                    if (fullContent) {
                      newParts.push({ type: "text", text: fullContent });
                    }

                    const updatedMsg = {
                      ...prev[index],
                      content: fullContent,
                      reasoning: fullReasoning,
                      parts: newParts,
                    };

                    const newArr = [...prev];
                    newArr[index] = updatedMsg;
                    return newArr;
                  });
                }
              } catch (e) {
                console.error("Error parsing SSE JSON", e);
              }
            }
          }
        }

        setStatus("ready");

        // Final DB save
        await db.transact(
          db.tx.messages[assistantId]
            .update({
              content: fullContent,
              reasoning: fullReasoning,
              role: "assistant",
              createdAt: DateTime.now().toISO(),
              model: modelId,
            })
            .link({ conversation: conversationId })
        );
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          console.log("Request aborted");
          // Save partial
          if (fullContent || fullReasoning) {
            await db.transact(
              db.tx.messages[assistantId]
                .update({
                  content: fullContent,
                  reasoning: fullReasoning,
                  role: "assistant",
                  createdAt: DateTime.now().toISO(),
                  model: modelId,
                })
                .link({ conversation: conversationId })
            );
          }
        } else {
          console.error("Streaming error", e);
          setStatus("error");
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [apiKey, conversationId, db, messages]
  );

  useEffect(() => {
    if (isLoading || initialMessagesInitialized) return;

    if (data?.conversations?.[0]?.messages) {
      // 1. Sort messages first
      const sortedMessages = [...data.conversations[0].messages].sort((a, b) =>
        a.createdAt && b.createdAt
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : 0
      );

      // 2. Map to UIMessageModel
      const dbMessages = sortedMessages.map((message) => {
        const parts: MessagePart[] = [];
        if (message.reasoning) {
          parts.push({
            type: "reasoning" as const,
            text: message.reasoning as string,
          });
        }
        if (message.content) {
          parts.push({
            type: "text" as const,
            text: message.content as string,
          });
        }

        return {
          id: message.id,
          role: message.role as MessageRole,
          content: message.content || "",
          parts,
          createdAt: message.createdAt
            ? new Date(message.createdAt)
            : undefined,
          experimental_attachments: message.attachments?.map(
            (a: { url: string; name?: string; contentType?: string }) => ({
              url: a.url,
              name: a.name,
              contentType: a.contentType,
            })
          ),
          reasoning: message.reasoning,
        } as UIMessageModel;
      });

      setMessages(dbMessages);
      setInitialMessagesInitialized(true);

      // 3. Handle initial single user message case
      if (dbMessages.length === 1 && dbMessages[0].role === "user") {
        if (isApiKeyLoading) return;

        // We need to trigger the assistant response for this existing message
        // Passing true for isExistingUserMessage

        // Ensure we pass the attachments from the DB message so they are included in the context
        const attachments = dbMessages[0].experimental_attachments || [];

        handleSendMessage(
          dbMessages[0].content,
          (sortedMessages[0].model as string) || selectedModel, // Use message model or selected
          attachments,
          true,
          dbMessages
        );
      }
    } else if (data) {
      // Data loaded but empty
      setInitialMessagesInitialized(true);
    }
  }, [
    data,
    isLoading,
    isApiKeyLoading,
    initialMessagesInitialized,
    conversationId,
    apiKey,
    selectedModel,
    handleSendMessage,
  ]);

  const onUserSend = async (
    message: string,
    model: string,
    attachments: { id: string; url: string; name: string; type: string }[] = []
  ) => {
    handleSendMessage(message.trim(), model, attachments, false);
  };

  return (
    <div className="flex flex-col justify-center items-center p-4 pb-60">
      <motion.div layoutId="chat-content" className="hidden" />

      <div className="flex flex-col w-full max-w-2xl mx-auto lg:p-4 pt-18 gap-4 pb-60">
        {messages.map((message) => (
          <UIMessage key={message.id} message={message} status={status} />
        ))}

        {status === "streaming" ||
          (status === "submitted" && <LoadingSpinner />)}
      </div>

      <ChatInput
        onSend={onUserSend}
        onSendWithAttachments={onUserSend}
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
