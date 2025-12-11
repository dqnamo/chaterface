"use client";

import { useState } from "react";
import { motion } from "motion/react";

export default function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const { conversationId } = params;
  const [message, setMessage] = useState(
    localStorage.getItem(conversationId) || ""
  );

  const handleNewMessage = () => {
    localStorage.setItem(conversationId, message);
  };

  return (
    <div className="flex flex-col justify-center items-center h-full p-4">
      <motion.div
        layoutId="chat-input-container"
        className="backdrop-blur-sm flex flex-col bg-gray-2/80 dark:bg-gray-1/80 border border-gray-3 dark:border-gray-2 rounded-xl w-full max-w-3xl fixed bottom-8 inset-x-0 mx-auto"
      >
        <textarea
          className="w-full h-full p-4 resize-none focus:outline-none text-gray-12 text-sm placeholder:text-gray-10"
          rows={2}
          placeholder="Ask me anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
            className="bg-gray-12 shrink-0 dark:bg-gray-4 rounded-lg border border-transparent dark:border-gray-5 dark:hover:bg-gray-3 px-2 py-1"
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
