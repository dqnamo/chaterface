import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import CodeBlock, { PreBlock } from "./streamdown/CodeBlock";

export default function Message({
  message,
  animate = false,
}: {
  message: InstaQLEntity<AppSchema, "messages", object>;
  animate?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={animate ? { opacity: 0, y: 10 } : undefined}
          transition={{ duration: 0.2 }}
          className="flex flex-row bg-linear-to-br dark:from-blue-10 dark:to-blue-8 from-blue-8 to-blue-10 px-3 py-1.5 rounded-xl max-w-lg w-max self-end"
        >
          <p className="text-white whitespace-pre-wrap">{message.content}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={animate ? { opacity: 0, y: 10 } : undefined}
      transition={{ duration: 0.2 }}
      className="flex flex-col p-2 rounded-lg max-w-2xl w-full mx-auto my-2"
    >
      <div className="flex flex-col gap-2 mb-2">
        <p className="text-sm text-gray-11 whitespace-pre-wrap">
          {message.model}
        </p>
      </div>

      {(message.content === "" || message.content === null) && (
        <div className="flex flex-row items-center gap-1 p-2 bg-gray-2 rounded-lg w-max h-8">
          <motion.div
            className="w-1.5 h-1.5 bg-gray-11 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
          />
          <motion.div
            className="w-1.5 h-1.5 bg-gray-11 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-1.5 h-1.5 bg-gray-11 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </div>
      )}

      <Streamdown
        className="text-gray-12 whitespace-pre-wrap w-full"
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
    </motion.div>
  );
}
