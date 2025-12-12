import type { UIMessage } from "ai";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import CodeBlock, { PreBlock } from "./streamdown/CodeBlock";
import HorizontalRule from "./streamdown/HorizontalRule";

export default function UIMessage({
  message,
  status,
}: {
  message: UIMessage;
  status: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col" key={message.id}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-row bg-gray-3 dark:bg-gray-2 p-2 rounded-lg max-w-lg w-max"
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
    <div className="flex flex-col p-2" key={message.id}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="flex flex-row"
      >
        <Streamdown
          key={message.id}
          components={{
            code: ({ children, className, ...props }) => (
              <CodeBlock className={className} {...props}>
                {children}
              </CodeBlock>
            ),
            pre: ({ children }) => <PreBlock>{children}</PreBlock>,
            hr: () => <HorizontalRule />,
          }}
          isAnimating={status === "streaming"}
          className="text-sm text-gray-12 whitespace-pre-wrap w-full"
        >
          {message.parts
            .map((part) => {
              switch (part.type) {
                case "text":
                  return part.text;
              }
            })
            .join("")}
        </Streamdown>
      </motion.div>
    </div>
  );
}
