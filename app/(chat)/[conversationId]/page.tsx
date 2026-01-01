"use client";

import { useState, use, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useData } from "@/app/providers/DataProvider";
import { DateTime } from "luxon";
import { id, InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import ChatInput from "@/app/components/ChatInput";
import { useApiKey } from "@/lib/apiKey";
import Image from "next/image";
import Message from "@/app/components/Message";
import { useModelStore } from "@/lib/modelStore";
import { encryptData, decryptData } from "@/lib/encryption";
import { chatCompletion } from "@/lib/llm";
import { useLiveQuery } from "dexie-react-hooks";
import { UIMessage } from "@/lib/types";

import { useSearchParams } from "next/navigation";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db, localDb, user, masterKey, conversations } = useData();
  const { apiKey } = useApiKey();
  const searchParams = useSearchParams();
  const initialWebSearch = searchParams.get("webSearch") === "true";

  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    reasoning: string;
    annotations?: UIMessage["annotations"];
  } | null>(null);
  const { conversationId } = use(params);

  // 1. Identify source
  const convo = conversations.find((c) => c.id === conversationId);
  const isCloud = convo?.source === "cloud";

  // 2. Fetch Raw Data (Cloud)
  const { data: cloudData, isLoading: isCloudLoading } = db.useQuery(
    isCloud && user
      ? {
          conversations: {
            $: {
              where: {
                id: conversationId,
              },
            },
            messages: {
              $: {
                order: { createdAt: "asc" },
              },
              attachments: {},
            },
          },
          $users: {
            $: { where: { id: user.id } },
          },
        }
      : null
  );

  // 3. Fetch Raw Data (Local)
  const localMessages = useLiveQuery(
    () => localDb.messages.where({ conversationId }).sortBy("createdAt"),
    [conversationId],
    "loading" // Initial value
  );

  // --- System Prompt ---
  const userData = cloudData; // Reuse query result
  const cloudSystemPrompt = userData?.$users?.[0]?.systemPrompt;
  // -------------------

  const { selectedModel } = useModelStore();

  const [decryptedMessages, setDecryptedMessages] = useState<UIMessage[]>([]);

  // 4. Decrypt Messages (if cloud)
  useEffect(() => {
    async function processMessages() {
      if (!isCloud) {
        if (Array.isArray(localMessages)) {
          // Map local messages to UIMessage format
          const uiMessages: UIMessage[] = localMessages.map((m) => ({
            ...m,
            parts: [{ type: "text", text: m.content }],
            createdAt: new Date(m.createdAt),
          }));
          setDecryptedMessages(uiMessages);
        }
        return;
      }

      if (cloudData?.conversations?.[0]?.messages && masterKey) {
        const decrypted = await Promise.all(
          cloudData.conversations[0].messages.map(
            async (m: InstaQLEntity<AppSchema, "messages">) => {
              const content = await decryptData(m.content, masterKey);
              return {
                ...m,
                role: m.role as "system" | "user" | "assistant" | "data",
                content,
                reasoning: m.reasoning
                  ? await decryptData(m.reasoning, masterKey)
                  : undefined,
                parts: [{ type: "text" as const, text: content }],
                createdAt: new Date(m.createdAt),
                annotations: m.annotations,
              };
            }
          )
        );
        setDecryptedMessages(decrypted);
      } else {
        setDecryptedMessages([]);
      }
    }
    processMessages();
  }, [isCloud, localMessages, cloudData, masterKey]);

  const messages = useMemo(() => decryptedMessages, [decryptedMessages]);
  const isLoading = isCloud ? isCloudLoading : localMessages === "loading";

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

  const stop = () => {
    setStatus("ready");
  };

  const handleSendMessage = async (
    message: string,
    model: string,
    webSearch: boolean = false,
    firstMessage = false
  ) => {
    // 1. Optimistic Update / Save User Message
    const nowObj = DateTime.now();
    const now = nowObj.toISO();

    if (!firstMessage) {
      const userMsgId = id();
      if (isCloud && masterKey) {
        const encContent = await encryptData(message, masterKey);
        await db.transact(
          db.tx.messages[userMsgId]
            .update({
              content: encContent,
              role: "user",
              createdAt: now,
              model: model,
            })
            .link({ conversation: conversationId })
        );
      } else {
        await localDb.messages.add({
          id: userMsgId,
          conversationId,
          content: message,
          role: "user",
          createdAt: now,
          model,
        });
      }
    }

    setStatus("streaming");

    // 2. Create Assistant Placeholder
    const assistantId = id();
    // Ensure assistant message is created slightly after user message to maintain order
    const assistantNow = nowObj.plus({ milliseconds: 50 }).toISO();

    if (isCloud && masterKey) {
      const encEmpty = await encryptData("", masterKey);
      await db.transact(
        db.tx.messages[assistantId]
          .update({
            content: encEmpty,
            role: "assistant",
            createdAt: assistantNow,
            model: model,
          })
          .link({ conversation: conversationId })
      );
    } else {
      await localDb.messages.add({
        id: assistantId,
        conversationId,
        content: "",
        role: "assistant",
        createdAt: assistantNow,
        model,
      });
    }

    setStreamingMessage({ id: assistantId, content: "", reasoning: "" });

    try {
      // Prepare context messages
      const contextMessages = [
        ...messages,
        {
          role: "user",
          id: id(),
          content: message,
        } as UIMessage,
      ];

      let messagesToSend = contextMessages;
      if (firstMessage) {
        messagesToSend = messages as UIMessage[];
      }

      // Use Client-Side Fetch
      let fullContent = "";
      let fullReasoning = "";
      let fullUsage = {};

      if (!apiKey) throw new Error("API Key missing");

      // Determine System Prompt
      let systemPrompt = "";
      if (user) {
        // Logged in: Use Cloud (fallback to empty if not set)
        systemPrompt = cloudSystemPrompt || "";
      } else {
        // Guest: Use Local Storage
        systemPrompt = localStorage.getItem("chaterface_system_prompt") || "";
      }

      await chatCompletion(
        apiKey,
        model,
        messagesToSend,
        (chunkContent, chunkReasoning, chunkAnnotations, chunkUsage) => {
          fullContent += chunkContent;
          fullReasoning += chunkReasoning;
          if (chunkUsage) fullUsage = chunkUsage;

          const currentAnnotations =
            chunkAnnotations.length > 0 ? chunkAnnotations : undefined;

          // If we receive annotations, we should store them.
          const annotationsToSet =
            currentAnnotations || streamingMessage?.annotations;

          setStreamingMessage({
            id: assistantId,
            content: fullContent,
            reasoning: fullReasoning,
            annotations: annotationsToSet,
          });
        },
        systemPrompt,
        webSearch
      );

      // Update DB with final result
      if (isCloud && masterKey) {
        const encContent = await encryptData(fullContent, masterKey);
        const encReasoning = fullReasoning
          ? await encryptData(fullReasoning, masterKey)
          : undefined;

        await db.transact(
          db.tx.messages[assistantId].update({
            content: encContent,
            reasoning: encReasoning,
            usage: fullUsage,
            annotations: streamingMessage?.annotations,
          })
        );
      } else {
        await localDb.messages.update(assistantId, {
          content: fullContent,
          reasoning: fullReasoning,
          usage: fullUsage,
          annotations: streamingMessage?.annotations,
        });
      }

      setStreamingMessage(null);
      setStatus("ready");
    } catch (error) {
      console.error("Chat error:", error);
      setStatus("error");
    }
  };

  // Trigger for first message
  useEffect(() => {
    // If we have exactly 1 message and it's from the user, and we aren't streaming, start streaming.
    // This handles the "New Chat" redirection case where the user message exists but assistant hasn't replied.
    if (
      !isLoading &&
      messages.length === 1 &&
      messages[0].role === "user" &&
      status === "ready" &&
      !streamingMessage
    ) {
      handleSendMessage("", selectedModel, initialWebSearch, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages.length, status, streamingMessage]);

  return (
    <div className="flex flex-col justify-center items-center p-4 pb-60">
      <motion.div layoutId="chat-content" className="hidden" />

      <div className="flex flex-col w-full max-w-2xl mx-auto lg:p-4 pt-18 gap-2 pb-60">
        {messages.map((message) => {
          const isStreaming = streamingMessage?.id === message.id;
          const displayMessage =
            isStreaming && streamingMessage
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
              isStreaming={isStreaming}
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
      <p className="text-gray-scale-11 text-sm">{text}</p>
    </div>
  );
}
