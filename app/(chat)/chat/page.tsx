"use client";

import { useData } from "@/app/providers/DataProvider";
import { id } from "@instantdb/react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import ChatInput from "@/app/components/ChatInput";
import { motion } from "motion/react";

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col text-center"
        layoutId="chat-content"
      >
        <h2 className="text-gray-12 text-xl font-medium">
          Any Model. Any Question.
        </h2>
        <p className="text-gray-10 text-xs">What do you want to know?</p>
      </motion.div>

      <ChatInput
        onSend={(message, model) => handleNewMessage(message, model)}
      />
    </div>
  );
}
