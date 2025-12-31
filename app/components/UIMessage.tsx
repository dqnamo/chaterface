import type { UIMessage } from "@/lib/types";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import CodeBlock, { PreBlock } from "./streamdown/CodeBlock";
import HorizontalRule from "./streamdown/HorizontalRule";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./ai-elements/reasoning";
import { useData } from "@/app/providers/DataProvider";

function AttachmentDisplay({
  url,
  name,
  contentType,
}: {
  url: string;
  name?: string;
  contentType?: string;
}) {
  const { db } = useData();

  // If the URL is a storage path (no protocol), convert it to a full URL?
  // Actually, we don't have a direct method to get URL synchronously from path without query.
  // BUT, we might have the URL already if it's a blob URL (during upload/preview)
  // OR if it's fully resolved.
  // However, we stored 'path' in the 'url' field for the API.
  // Let's check if it looks like a path or a URL.

  const isPath = !url.startsWith("http") && !url.startsWith("blob:");

  // If it's a path, we should query for the file to get the real URL
  // We can use a small component to fetch it.
  if (isPath) {
    return <StorageImage path={url} name={name} />;
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-4 dark:border-gray-6 max-w-xs">
      {contentType?.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name || "Attachment"}
          className="max-w-full h-auto max-h-48 object-contain"
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="p-2 block bg-gray-2 text-sm text-gray-12"
        >
          {name || "Attachment"}
        </a>
      )}
    </div>
  );
}

function StorageImage({ path, name }: { path: string; name?: string }) {
  const { db } = useData();
  const { data, isLoading } = db.useQuery({
    $files: {
      $: {
        where: { path },
      },
    },
  });

  if (isLoading)
    return <div className="w-24 h-24 bg-gray-2 animate-pulse rounded-lg"></div>;

  const file = data?.$files?.[0];
  if (!file || !file.url) {
    return (
      <div className="p-2 bg-gray-2 text-xs text-red-500 rounded-lg">
        Failed to load image
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-4 dark:border-gray-6 max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.url}
        alt={name || file.name || "Attachment"}
        className="max-w-full h-auto max-h-48 object-contain"
      />
    </div>
  );
}

export default function UIMessage({
  message,
  status,
}: {
  message: UIMessage;
  status: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col gap-2 items-end" key={message.id}>
        {message.experimental_attachments &&
          message.experimental_attachments.length > 0 && (
            <div className="flex flex-row gap-2 flex-wrap justify-end">
              {message.experimental_attachments.map((a, i) => (
                <AttachmentDisplay
                  key={i}
                  url={a.url}
                  name={a.name}
                  contentType={a.contentType}
                />
              ))}
            </div>
          )}
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
                case "image":
                  // Handle image parts in message content
                  return (
                    <AttachmentDisplay
                      key={`${message.id}-${i}`}
                      url={part.image}
                      contentType="image/png" // Default or infer?
                    />
                  );
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
        className="flex flex-col gap-2 w-full"
      >
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "reasoning":
              return (
                <Reasoning
                  key={`${message.id}-${i}`}
                  isStreaming={
                    status === "streaming" && i === message.parts.length - 1
                  }
                >
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              );
            case "text":
              // We'll wrap text parts in a div so they stack properly with reasoning
              // However, Streamdown expects the full text content usually.
              // If we have mixed parts, we might need to handle them carefully.
              // For now, let's render text parts individually if they are separate from reasoning.
              // A common pattern is Reasoning -> Text.

              // If we just render Streamdown for each text part, it might be fine.
              return (
                <Streamdown
                  key={`${message.id}-${i}`}
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
                  {part.text}
                </Streamdown>
              );
            case "image":
              return (
                <AttachmentDisplay
                  key={`${message.id}-${i}`}
                  url={part.image}
                  contentType="image/png"
                />
              );
          }
        })}
      </motion.div>
    </div>
  );
}
