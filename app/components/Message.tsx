import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { motion } from "motion/react";
import { DateTime } from "luxon";

export default function Message({
  message,
}: {
  message: InstaQLEntity<AppSchema, "messages", object>;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-row bg-gray-2 p-2 rounded-lg max-w-lg w-max"
        >
          <p className="text-sm text-gray-12">{message.content}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-row bg-gray-2 p-2 rounded-lg max-w-lg w-max">
      <p className="text-sm text-gray-12">{message.content}</p>
    </div>
  );
}
