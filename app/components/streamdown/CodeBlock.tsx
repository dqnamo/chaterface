"use client";

import { Check, Copy } from "@phosphor-icons/react";
import React, { isValidElement, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  isBlock?: boolean;
  [key: string]: unknown;
}

export default function CodeBlock({
  children,
  className,
  isBlock,
  ...props
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const copyToClipboard = async () => {
    if (children) {
      await navigator.clipboard.writeText(String(children));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // If it's a block (from PreBlock) or has a language class, render as block
  if (isBlock || language) {
    return (
      <div className="relative group rounded-lg overflow-hidden my-4 border bg-gray-2 border-gray-4">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-3 border-b border-gray-4">
          <span className="text-[11px] font-medium text-gray-11 uppercase font-mono">
            {language || "text"}
          </span>
          <button
            onClick={copyToClipboard}
            className="p-1 rounded-md hover:bg-gray-600 transition-colors text-gray-400 hover:text-white"
            aria-label="Copy code"
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="overflow-x-auto">
          <SyntaxHighlighter
            codeTagProps={{
              className: "font-mono",
            }}
            className="hidden dark:block"
            language={language || "text"}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
          <SyntaxHighlighter
            codeTagProps={{
              className: "font-mono",
            }}
            className="block dark:hidden"
            language={language || "text"}
            style={oneLight}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // Inline code
  return (
    <code
      className={`bg-gray-2 px-1.5 py-0.5 rounded text-sm font-mono text-gray-12 ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </code>
  );
}

export function PreBlock({ children }: { children: React.ReactNode }) {
  // Map through children to pass isBlock to valid elements
  const childrenWithProps = React.Children.map(children, (child) => {
    if (isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<CodeBlockProps>, {
        isBlock: true,
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}
