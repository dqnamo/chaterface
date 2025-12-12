"use client";

import { useData } from "@/app/providers/DataProvider";
import PiSidebarDefaultSolid from "./icons/PiSidebarDefaultSolid";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import PiChatPlusSolid from "./icons/PiChatPlusSolid";
import PiUserSettingsSolid from "./icons/PiUserSettingsSolid";

export default function Sidebar() {
  const { conversations } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { conversationId } = useParams();

  const filteredConversations = useMemo(() => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const scoreContains = (text: string, q: string) => {
      if (!q) return 0;
      const idx = text.indexOf(q);
      if (idx === -1) return 0;
      // Earlier matches are better; longer queries also deserve a bump.
      return 120 + Math.min(40, q.length * 4) - Math.min(40, idx);
    };

    const scoreTokenMatch = (text: string, tokens: string[]) => {
      if (tokens.length === 0) return 0;
      let score = 0;
      for (const t of tokens) {
        const idx = text.indexOf(t);
        if (idx === -1) return 0; // all tokens must match somewhere
        score += 35 + Math.min(20, t.length * 2) - Math.min(20, idx);
      }
      return score;
    };

    const scoreSubsequence = (text: string, q: string) => {
      // Simple fuzzy: characters appear in order, penalize gaps.
      if (!q) return 0;
      let qi = 0;
      let gaps = 0;
      for (let i = 0; i < text.length && qi < q.length; i++) {
        if (text[i] === q[qi]) {
          qi++;
        } else if (qi > 0) {
          gaps++;
        }
      }
      if (qi !== q.length) return 0;
      return 55 + Math.min(30, q.length * 3) - Math.min(55, gaps);
    };

    const scoreAcronym = (text: string, q: string) => {
      if (!q) return 0;
      const words = text.split(" ").filter(Boolean);
      if (words.length === 0) return 0;
      const acronym = words.map((w) => w[0]).join("");
      if (!acronym) return 0;
      if (acronym.startsWith(q)) return 70 + Math.min(20, q.length * 3);
      return 0;
    };

    const scoreField = (
      raw: string | undefined,
      qNorm: string,
      tokens: string[]
    ) => {
      if (!raw) return 0;
      const text = normalize(raw);
      if (!text) return 0;
      return Math.max(
        scoreContains(text, qNorm),
        scoreTokenMatch(text, tokens),
        scoreSubsequence(text, qNorm),
        scoreAcronym(text, qNorm)
      );
    };

    const qNorm = normalize(search);
    if (!qNorm) return conversations;
    const tokens = qNorm.split(" ").filter(Boolean);

    const MAX_MESSAGES_TO_SCORE = 40;

    return conversations
      .map((c) => {
        const nameScore = scoreField(c.name, qNorm, tokens) * 1.2;

        const msgs = c.messages;
        let bestMessageScore = 0;
        if (msgs && msgs.length) {
          const limit = Math.min(msgs.length, MAX_MESSAGES_TO_SCORE);
          for (let i = 0; i < limit; i++) {
            const s = scoreField(msgs[i]?.content, qNorm, tokens);
            if (s > bestMessageScore) bestMessageScore = s;
          }
        }

        const score = Math.max(nameScore, bestMessageScore);
        return { c, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.c.name.localeCompare(b.c.name);
      })
      .map(({ c }) => c);
  }, [conversations, search]);

  return (
    <div className="fixed left-0 top-0 z-50 w-full border-b border-gray-3 lg:border-none bg-gray-1 lg:bg-transparent lg:w-max">
      <AnimatePresence>
        {isOpen ? (
          <>
            {/* <motion.button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={() => setIsOpen(false)}
            /> */}

            <motion.aside
              className="fixed left-0 top-0 h-dvh max-w-[256px] w-full p-1.5"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <div className="bg-white subtle-shadow dark:bg-gray-1 rounded-lg border border-gray-3 backdrop-blur-sm h-full overflow-hidden">
                <div className="flex items-center gap-px p-1.5 mb-2 flex-row w-full border-b border-gray-3 bg-gray-1 dark:bg-gray-2">
                  <button
                    type="button"
                    aria-label="New conversation"
                    className="p-1.5 hover:bg-gray-3 rounded-md group transition-colors"
                    onClick={() => {}}
                  >
                    <PiUserSettingsSolid
                      className="text-gray-11 transition-colors group-hover:text-gray-12"
                      size={16}
                    />
                  </button>
                  <Link
                    href="/chat"
                    type="button"
                    aria-label="New conversation"
                    className="p-1.5 hover:bg-gray-3 rounded-md group transition-colors"
                  >
                    <PiChatPlusSolid
                      className="text-gray-11 transition-colors group-hover:text-gray-12"
                      size={16}
                    />
                  </Link>
                  <button
                    type="button"
                    aria-label="Close sidebar"
                    className="p-1.5 hover:bg-gray-3 rounded-md group transition-colors ml-auto"
                    onClick={() => setIsOpen(false)}
                  >
                    <PiSidebarDefaultSolid
                      className="text-gray-11 transition-colors group-hover:text-gray-12"
                      size={16}
                    />
                  </button>
                </div>

                <div className="flex flex-col">
                  <div className="flex flex-col">
                    <p className="text-gray-11 font-medium text-xs px-3">
                      Conversations
                    </p>
                    <div className="relative border-b border-gray-3">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setSearch("");
                        }}
                        placeholder="Search conversations"
                        className="w-full text-gray-12 placeholder:text-gray-10 text-xs p-3 py-2 focus:outline-none focus:ring-0 focus:border-gray-5 bg-transparent pr-12"
                      />
                      {search.trim().length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-10 hover:text-gray-12 transition-colors px-2 py-1 rounded-md hover:bg-gray-3"
                          aria-label="Clear search"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-px p-1">
                    {filteredConversations.length === 0 ? (
                      <div className="text-gray-9 text-xs p-3">
                        {conversations.length === 0
                          ? "No conversations yet."
                          : `No conversations found for “${search.trim()}”.`}
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => (
                        <Link
                          href={`/${conversation.id}`}
                          key={conversation.id}
                          className={`flex flex-col rounded-md px-2 py-1 hover:bg-gray-2 transition-colors group ${
                            conversationId === conversation.id
                              ? "bg-gray-2"
                              : ""
                          }`}
                        >
                          <p
                            className={`text-gray-11 text-sm truncate group-hover:text-gray-12 transition-all duration-200 ${
                              conversationId === conversation.id
                                ? "text-gray-12"
                                : ""
                            }`}
                          >
                            {conversation.name}
                          </p>
                          <p className="text-gray-9 text-[11px] truncate">
                            {DateTime.fromISO(
                              conversation.createdAt as string
                            ).toRelative()}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen ? (
          <div className="max-w-3xl mx-auto w-full px-4 lg:max-w-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-row p-1 items-center gap-1 w-max m-1 rounded-md"
            >
              <button
                type="button"
                aria-label="New conversation"
                className="p-1 hover:bg-gray-6 rounded-md group hover:scale-105 transition-all duration-200"
                onClick={() => {}}
              >
                <PiUserSettingsSolid
                  className="text-gray-10 transition-colors group-hover:text-gray-12"
                  size={16}
                />
              </button>
              <Link
                href="/chat"
                type="button"
                aria-label="New conversation"
                className="p-1 hover:bg-gray-6 rounded-md group hover:scale-105 transition-all duration-200"
              >
                <PiChatPlusSolid
                  className="text-gray-10 transition-colors group-hover:text-gray-12"
                  size={16}
                />
              </Link>
              <button
                type="button"
                aria-label="Open sidebar"
                className="p-1 hover:bg-gray-6 rounded-md group hover:scale-105 transition-all duration-200"
                onClick={() => setIsOpen(true)}
              >
                <PiSidebarDefaultSolid
                  className="text-gray-10 transition-colors group-hover:text-gray-12"
                  size={16}
                />
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
