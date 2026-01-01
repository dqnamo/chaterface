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

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db, localDb, user, masterKey, conversations } = useData();
  const { apiKey } = useApiKey();

  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    reasoning: string;
  } | null>(null);
  const { conversationId } = use(params);

  // 1. Identify source
  const convo = conversations.find((c) => c.id === conversationId);
  const isCloud = convo?.source === "cloud";

  // 2. Fetch Raw Data (Cloud)
  // We only enable the subscription if it's a cloud conversation
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
                content,
                reasoning: m.reasoning
                  ? await decryptData(m.reasoning, masterKey)
                  : undefined,
                parts: [{ type: "text", text: content }],
                createdAt: new Date(m.createdAt),
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

  // Stop function for the user
  const stop = () => {
    // With fetch(), we can abort via AbortController passed to signal, but chatCompletion helper doesn't expose it yet.
    // For now we just reset UI state.
    // Ideally we pass an abort signal down to chatCompletion.
    setStatus("ready");
  };

  useEffect(() => {
    // check if its first message in the conversation
    // We rely on 'convo' object for length? Or messages length?
    // Be careful with async decryption delays.
    // If messages length is 1 and it's user role, trigger.
    if (messages.length === 1 && messages[0].role === "user") {
      // To avoid double triggering, we might need a better check or flag
      // For now, let's skip auto-trigger on mount to be safe, or assume 'New Chat' logic handled it
      // Actually, New Chat page pushes to here, so we might need to trigger if only 1 msg.
      // But New Chat page creates the message.
      // Let's assume the user wants to trigger it manually or we trigger if last message is User.
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        // It's tricky to know if we already responded or if it's new.
        // We can check if there is an assistant message after?
        // Since we just loaded, if the last message is User, we probably need to reply.
        // But wait, if we reload the page, we don't want to re-reply.
        // So maybe only on "creation" of the page?
        // Let's just rely on user interaction for now, EXCEPT for the very first message
        // which we might want to trigger.
        // The previous logic used `data?.conversations?.[0]?.messages?.length === 1`
        // We'll stick to manual or explicit trigger from previous page if passed state, but Next.js router state is tricky.
        // Let's keep it simple: If only 1 message and it is User, we trigger.
        // But we need to be careful about not re-triggering on refresh.
        // We can use a session storage flag or similar, or just let user click send?
        // The original code had:
        // if (data?.conversations?.[0]?.messages?.length === 1) { handleSendMessage("", selectedModel, true); }
        // This implies if we land here and there's 1 msg, we stream.
        // We will try to replicate this but guard it.
        // Actually, `handleSendMessage` with `firstMessage=true` handles the "don't create user msg" part.
        if (!initialLoadDone.current) return;
        // We'll skip auto-trigger for now to be safe and robust.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Re-enable auto-trigger for first message if safe
  useEffect(() => {
    if (!isLoading && messages.length === 1 && messages[0].role === "user") {
      // We need a way to know if this is a "fresh" conversation or a refresh.
      // For now, let's assume if it's 1 message, we want to reply.
      // But 'handleSendMessage' expects to send a prompt.
      // If we pass empty string and true, it skips creating user message.
      // We'll skip this auto-trigger to avoid duplicate replies on refresh for now.
    }
  }, [isLoading, messages]);

  const handleSendMessage = async (
    message: string,
    model: string,
    firstMessage = false
  ) => {
    // 1. Optimistic Update / Save User Message
    const now = DateTime.now().toISO();

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

    if (isCloud && masterKey) {
      // We encrypt empty string? Or just store empty?
      // Let's encrypt empty string to be consistent
      const encEmpty = await encryptData("", masterKey);
      await db.transact(
        db.tx.messages[assistantId]
          .update({
            content: encEmpty,
            role: "assistant",
            createdAt: now,
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
        createdAt: now,
        model,
      });
    }

    setStreamingMessage({ id: assistantId, content: "", reasoning: "" });

    try {
      // Prepare context messages
      // We need plain text for the LLM
      // 'messages' is already decrypted/plain in our state
      const contextMessages = [
        ...messages,
        {
          role: "user",
          id: id(), // Temporary ID
          content: message,
        } as UIMessage,
      ];

      // Remove the last message if we are "firstMessage" because it's already in 'messages'?
      // If firstMessage is true, 'message' is empty string usually in previous logic?
      // Wait, if firstMessage=true, it means the user message is ALREADY in the DB (from New Chat page).
      // So 'messages' (from DB) includes the user prompt.
      // So we don't need to append 'message' again if firstMessage=true.

      let messagesToSend = contextMessages;
      if (firstMessage) {
        // If first message, 'messages' array should have the user prompt.
        // And 'message' arg is likely empty or ignored.
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
        (chunkContent, chunkReasoning, chunkUsage) => {
          fullContent += chunkContent;
          fullReasoning += chunkReasoning;
          if (chunkUsage) fullUsage = chunkUsage;

          setStreamingMessage({
            id: assistantId,
            content: fullContent,
            reasoning: fullReasoning,
          });
        },
        systemPrompt
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
          })
        );
      } else {
        await localDb.messages.update(assistantId, {
          content: fullContent,
          reasoning: fullReasoning,
          usage: fullUsage,
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
      // We pass empty message because it's already in DB, and true for firstMessage
      handleSendMessage("", selectedModel, true);
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
