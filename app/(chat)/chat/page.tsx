"use client";

import { useData } from "@/app/providers/DataProvider";
import { useState } from "react";
import { id } from "@instantdb/react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import ChatInput from "@/app/components/ChatInput";

export default function ChatPage() {
  const router = useRouter();

  const { db } = useData();

  const handleNewMessage = async (message: string, model: string) => {
    const messageContent = message.trim();

    const conversationId = id();
    const messageId = id();

    // Create conversation and message in one transaction
    db.transact([
      db.tx.conversations[conversationId].update({
        name: messageContent,
        createdAt: DateTime.now().toISO(),
        updatedAt: DateTime.now().toISO(),
      }),
      db.tx.messages[messageId]
        .update({
          content: messageContent,
          role: "user",
          createdAt: DateTime.now().toISO(),
          model: model,
        })
        .link({ conversation: conversationId }),
    ]);

    router.push(`/${conversationId}`);
  };

  return (
    <div className="flex flex-col justify-center items-center h-full p-4">
      <div className="flex flex-col text-center">
        <h2 className="text-gray-12 text-xl font-medium">
          Any Model. Any Question.
        </h2>
        <p className="text-gray-10 text-xs">What do you want to know?</p>
      </div>

      <ChatInput
        onSend={(message, model) => handleNewMessage(message, model)}
      />
    </div>
  );
}
