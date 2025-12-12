import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { motion } from "motion/react";
import { DateTime } from "luxon";
import { Streamdown } from "streamdown";
import CodeBlock, { PreBlock } from "./streamdown/CodeBlock";

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
          <p className="text-sm text-gray-12 whitespace-pre-wrap">{message.content}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-row p-2 rounded-lg max-w-2xl w-full mx-auto">
      <Streamdown
        className="text-sm text-gray-12 whitespace-pre-wrap w-full"
        components={{
          code: ({ children, className, ...props }) => (
            <CodeBlock className={className} {...props}>
              {children}
            </CodeBlock>
          ),
          pre: ({ children }) => <PreBlock>{children}</PreBlock>,
        }}
      >
        {message.content}
      </Streamdown>
    </div>
  );
}
