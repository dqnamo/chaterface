"use client";

import { useState, use, useEffect } from "react";
import { motion } from "motion/react";
import { useData } from "@/app/providers/DataProvider";
import { DateTime } from "luxon";
import { id } from "@instantdb/react";
import { useChat } from "@ai-sdk/react";
import UIMessage from "@/app/components/UIMessage";
import type { UIMessage as UIMessageModel } from "ai";
import ChatInput from "@/app/components/ChatInput";
import { useModelStore } from "@/lib/modelStore";
import { useApiKey } from "@/lib/apiKey";
import Image from "next/image";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db } = useData();
  const { selectedModel } = useModelStore();
  const { apiKey, isLoading: isApiKeyLoading } = useApiKey();
  const [intialMessagesInitialized, setIntialMessagesInitialized] =
    useState(false);
  const { conversationId } = use(params);
  const { data, isLoading } = db.useQuery({
    conversations: {
      $: {
        where: {
          id: conversationId,
        },
      },
      messages: {},
    },
  });

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    onFinish: async ({ message, isAbort }) => {
      if (isAbort) {
        await db.transact(
          db.tx.messages[id()]
            .update({
              content: message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join(""),
              createdAt: DateTime.now().toISO(),
              role: "assistant",
              model: selectedModel,
            })
            .link({ conversation: conversationId })
        );
      }
    },
  });

  useEffect(() => {
    if (isLoading || intialMessagesInitialized) return;

    if (data?.conversations?.[0]?.messages) {
      // If there's only 1 message, we need to send it to get a response
      if (data.conversations[0].messages.length === 1) {
        // Wait for API key to be loaded before sending
        if (isApiKeyLoading) return;

        sendMessage(
          {
            text: data.conversations[0].messages[0].content as string,
          },
          {
            body: {
              model: data.conversations[0].messages[0].model as string,
              conversationId: conversationId,
              apiKey: apiKey,
            },
          }
        );
        setIntialMessagesInitialized(true);
        return;
      }

      const dbMessages = data.conversations[0].messages.map((message) => ({
        parts: [{ type: "text" as const, text: message.content as string }],
        role: message.role as "user" | "assistant",
        id: message.id,
        createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
      })) as UIMessageModel[];

      setMessages(dbMessages);
      setIntialMessagesInitialized(true);
    } else if (data) {
      // Data loaded but empty
      setIntialMessagesInitialized(true);
    }
  }, [
    data,
    isLoading,
    isApiKeyLoading,
    intialMessagesInitialized,
    setMessages,
    sendMessage,
    conversationId,
    apiKey,
  ]);

  const handleNewMessage = async (message: string, model: string) => {
    sendMessage(
      { text: message.trim() },
      { body: { model: model, conversationId: conversationId, apiKey: apiKey } }
    );

    await db.transact([
      db.tx.messages[id()]
        .update({
          content: message.trim(),
          role: "user",
          createdAt: DateTime.now().toISO(),
          model: model,
        })
        .link({ conversation: conversationId }),
    ]);
  };

  return (
    <div className="flex flex-col justify-center items-center p-4 pb-60">
      {/* <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4">
        {data?.conversations[0]?.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div> */}
      <motion.div layoutId="chat-content" className="hidden" />

      <div className="flex flex-col w-full max-w-2xl mx-auto lg:p-4 pt-18 gap-4 pb-60">
        {messages.map((message) => (
          <UIMessage key={message.id} message={message} status={status} />
        ))}

        {status === "streaming" ||
          (status === "submitted" && <LoadingSpinner />)}
      </div>

      <ChatInput
        onSend={handleNewMessage}
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
      <p className="text-gray-10 text-sm">{text}</p>
    </div>
  );
}
