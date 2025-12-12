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

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { db } = useData();
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

  const { messages, sendMessage, setMessages, status } = useChat();

  useEffect(() => {
    if (isLoading || intialMessagesInitialized) return;

    if (data?.conversations?.[0]?.messages) {
      if (data.conversations[0].messages.length === 1) {
        sendMessage(
          {
            text: data.conversations[0].messages[0].content as string,
          },
          {
            body: {
              model: data.conversations[0].messages[0].model as string,
              conversationId: conversationId,
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
  }, [data, isLoading, intialMessagesInitialized, setMessages]);

  const handleNewMessage = async (message: string, model: string) => {
    sendMessage(
      { text: message.trim() },
      { body: { model: model, conversationId: conversationId } }
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
      </div>

      <ChatInput onSend={handleNewMessage} style="bottom" />
    </div>
  );
}
