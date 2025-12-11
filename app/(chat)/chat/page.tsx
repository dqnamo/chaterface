"use client";

import { useData } from "@/app/providers/DataProvider";
import { useState } from "react";
import { id } from "@instantdb/react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function ChatPage() {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState("");

  const { conversations, db } = useData();

  const handleNewMessage = async () => {
    setNewMessage("");

    const conversationId = id();
    const transactions = [];

    // store conversationID and message in local storage
    localStorage.setItem(conversationId, newMessage);

    router.push(`/${conversationId}`);

    // transactions.push(
    //   db.tx.conversations[conversationId].update({
    //     name: newMessage,
    //     createdAt: DateTime.now().toISO(),
    //     updatedAt: DateTime.now().toISO(),
    //   })
    // );
    // transactions.push(
    //   db.tx.messages[id()]
    //     .update({
    //       content: newMessage,
    //       role: "user",
    //       createdAt: DateTime.now().toISO(),
    //     })
    //     .link({ conversation: conversationId })
    // );

    // await db.transact(transactions);
    // router.push(`/${conversationId}`);
  };

  return (
    <div className="flex flex-col justify-center items-center h-full p-4">
      <div className="flex flex-col text-center">
        <h2 className="text-gray-11 text-xl font-medium">
          Any Model. Any Question.
        </h2>
        <p className="text-gray-10 text-xs">What do you want to know?</p>
      </div>

      <motion.div
        layoutId="chat-input-container"
        className="backdrop-blur-sm flex flex-col bg-gray-2/80 dark:bg-gray-1/80 border border-gray-3 dark:border-gray-2 rounded-xl w-full max-w-xl mt-10"
      >
        <textarea
          className="w-full h-full p-4 resize-none focus:outline-none text-gray-12 text-sm placeholder:text-gray-10"
          rows={2}
          placeholder="Ask me anything..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
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
            className="bg-gray-12 dark:bg-gray-4 rounded-lg border border-transparent dark:border-gray-5 dark:hover:bg-gray-3 px-2 py-1"
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
