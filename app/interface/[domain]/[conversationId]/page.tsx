"use client";

import { useState, use, useEffect } from "react";
import { motion } from "motion/react";
import { useTenantData } from "@/app/providers/TenantDataProvider";
import { DateTime } from "luxon";
import { id } from "@instantdb/react";
import { useChat } from "@ai-sdk/react";
import UIMessage from "@/app/components/UIMessage";
import type { UIMessage as UIMessageModel } from "ai";
import ChatInput from "@/app/components/ChatInput";

export default function TenantConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db } = useTenantData();
  const [intialMessagesInitialized, setIntialMessagesInitialized] =
    useState(false);
  const { conversationId } = use(params);
  const [message, setMessage] = useState("");
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

  const { messages, sendMessage, setMessages } = useChat({
    onFinish: async (message) => {
      await db.transact([
        db.tx.messages[id()]
          .update({
            content: message.message.parts.find((part) => part.type === "text")
              ?.text as string,
            role: "assistant",
            createdAt: DateTime.now().toISO(),
          })
          .link({ conversation: conversationId }),
      ]);
    },
  });

  useEffect(() => {
    if (isLoading || intialMessagesInitialized) return;

    if (data?.conversations?.[0]?.messages) {
      if (data.conversations[0].messages.length === 1) {
        sendMessage({
          text: data.conversations[0].messages[0].content as string,
        });
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
  }, [data, isLoading, intialMessagesInitialized, setMessages]);

  const handleNewMessage = async () => {
    setMessage(""); // Clear input immediately
    sendMessage({ text: message.trim() });

    await db.transact([
      db.tx.messages[id()]
        .update({
          content: message.trim(),
          role: "user",
          createdAt: DateTime.now().toISO(),
        })
        .link({ conversation: conversationId }),
    ]);
  };

  return (
    <div className="flex flex-col justify-center items-center h-max p-4 pb-40">
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4 gap-4">
        {messages.map((message) => (
          <UIMessage key={message.id} message={message} />
        ))}
      </div>

      <motion.div
        layoutId="chat-input-container"
        className="backdrop-blur-sm flex flex-col bg-gray-2/80 dark:bg-gray-1/80 border border-gray-3 dark:border-gray-2 rounded-xl w-full max-w-3xl fixed bottom-0 inset-x-0 mx-auto rounded-b-none border-b-0"
      >
        <textarea
          className="w-full h-full p-4 resize-none focus:outline-none text-gray-12 text-sm placeholder:text-gray-10 bg-transparent"
          rows={2}
          placeholder="Ask me anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleNewMessage();
            }
          }}
        />
        <div className="flex flex-row items-end justify-between p-2">
          <div className="bg-gray-3 dark:bg-gray-2 rounded-lg border border-gray-4 dark:border-gray-3 px-2 py-1">
            <p className="text-gray-10 text-xs">GPT-4o</p>
          </div>
          <div
            onClick={handleNewMessage}
            className="bg-gray-12 shrink-0 dark:bg-gray-4 rounded-lg border border-transparent dark:border-gray-5 dark:hover:bg-gray-3 px-2 py-1 cursor-pointer"
          >
            <p className="text-gray-2 dark:text-gray-12 font-medium text-sm">
              Send
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
