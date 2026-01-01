"use client";

import { useData } from "@/app/providers/DataProvider";
import { id } from "@instantdb/react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import ChatInput from "@/app/components/ChatInput";
import { motion } from "motion/react";
import { userplexClient } from "@/lib/userplexClient";
import { encryptData } from "@/lib/encryption";

export default function ChatPage() {
  const router = useRouter();

  const { db, localDb, user, masterKey } = useData();

  const handleNewMessage = async (message: string, model: string) => {
    const messageContent = message.trim();
    const conversationId = id();
    const messageId = id();
    const now = DateTime.now().toISO();

    if (user && masterKey) {
      // --- Encrypted Cloud Path ---
      const encryptedContent = await encryptData(messageContent, masterKey);
      const encryptedName = await encryptData(messageContent, masterKey); // Using msg as name

      const tx = db.tx.messages[messageId]
        .update({
          content: encryptedContent,
          role: "user",
          createdAt: now,
          model: model,
        })
        .link({ conversation: conversationId });

      db.transact([
        db.tx.conversations[conversationId]
          .update({
            name: encryptedName,
            createdAt: now,
            updatedAt: now,
          })
          .link({ user: user.id }),
        tx,
      ]);
    } else {
      // --- Plain Text Local Path ---
      await localDb.conversations.add({
        id: conversationId,
        name: messageContent,
        createdAt: now,
        updatedAt: now,
      });

      await localDb.messages.add({
        id: messageId,
        conversationId,
        content: messageContent,
        role: "user",
        createdAt: now,
        model: model,
      });
    }

    userplexClient.logs.new({
      name: "new_conversation_started",
      user_id: user?.id ?? "",
      data: {
        model: model,
        hasAttachments: false,
      },
    });

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
        <h2 className="text-gray-scale-12 text-xl font-medium">
          Any Model. Any Question.
        </h2>
        <p className="text-gray-scale-11 text-sm mt-1">
          What do you want to know?
        </p>
      </motion.div>

      <ChatInput
        onSend={(message, model) => handleNewMessage(message, model)}
      />
    </div>
  );
}
