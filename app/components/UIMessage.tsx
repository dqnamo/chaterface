import type { UIMessage } from "ai";
import { motion } from "motion/react";

export default function UIMessage({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col" key={message.id}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-row bg-gray-2 p-2 rounded-lg max-w-lg w-max"
        >
          <div className="text-sm text-gray-12 whitespace-pre-wrap">
            {message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return <p key={`${message.id}-${i}`}>{part.text}</p>;
              }
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" key={message.id}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="flex flex-row p-2 max-w-lg w-max"
      >
        <div className="text-sm text-gray-12 whitespace-pre-wrap">
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return <p key={`${message.id}-${i}`}>{part.text}</p>;
            }
          })}
        </div>
      </motion.div>
    </div>
  );
}
