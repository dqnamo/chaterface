"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useData } from "../providers/DataProvider";
import { getLocalApiKey, setLocalApiKey } from "@/lib/crypto";
import { fetchCredits, OpenRouterCredits } from "@/lib/llm";
import {
  CheckIcon,
  CloudIcon,
  FingerprintIcon,
  GearIcon,
  HeadCircuitIcon,
  StarIcon,
  SunIcon,
  DesktopIcon,
  PaletteIcon,
  MoonStarsIcon,
  LockKeyIcon,
  CopyIcon,
  WarningIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useModelStore } from "@/lib/modelStore";
import { userplexClient } from "@/lib/userplexClient";
import { useThemeStore, Theme } from "../providers/ThemeProvider";

type Tab = "general" | "appearance" | "cloud" | "models" | "personas";

export default function SettingsModal() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div className="flex flex-col max-h-[70vh] max-w-2xl w-full overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-gray-scale-3 dark:border-gray-scale-2 p-2">
        {/* <h1 className="text-gray-scale-12 text-lg font-semibold mb-4">Settings</h1> */}
        <div className="flex gap-1">
          <AnimatedTabs
            tabs={[
              {
                name: "General",
                icon: (
                  <GearIcon
                    size={14}
                    weight="bold"
                    className="text-gray-scale-11 z-10"
                  />
                ),
              },
              {
                name: "Appearance",
                icon: (
                  <PaletteIcon
                    size={14}
                    weight="bold"
                    className="text-gray-scale-11 z-10"
                  />
                ),
              },
              {
                name: "Cloud",
                icon: (
                  <CloudIcon
                    size={14}
                    weight="bold"
                    className="text-gray-scale-11 z-10"
                  />
                ),
              },
              {
                name: "Models",
                icon: (
                  <HeadCircuitIcon
                    size={14}
                    weight="bold"
                    className="text-gray-scale-11 z-10"
                  />
                ),
              },
            ]}
            activeTab={
              activeTab === "general"
                ? "General"
                : activeTab === "appearance"
                ? "Appearance"
                : activeTab === "cloud"
                ? "Cloud"
                : "Models"
            }
            onTabChange={(tab) =>
              setActiveTab(
                tab === "General"
                  ? "general"
                  : tab === "Appearance"
                  ? "appearance"
                  : tab === "Cloud"
                  ? "cloud"
                  : "models"
              )
            }
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 h-full p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="api"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              <ApiKeySection />
              <SystemPromptSection />
            </motion.div>
          )}
          {activeTab === "appearance" && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <AppearanceSection />
            </motion.div>
          )}
          {activeTab === "cloud" && (
            <motion.div
              key="cloud"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <CloudSection />
            </motion.div>
          )}

          {activeTab === "models" && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <ModelsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { name: string; icon: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="flex flex-row gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          onClick={() => onTabChange(tab.name)}
          className="relative flex items-center text-gray-scale-11 flex-row gap-1.5 py-1 px-2 rounded-md focus:outline-none cursor-pointer transition-colors"
        >
          {activeTab === tab.name && (
            <motion.div
              layoutId="active-tab-bg"
              className="absolute inset-0 bg-gray-scale-2 rounded-md"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tab.icon}
          <span className="relative z-10 text-gray-scale-11 text-sm">
            {tab.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useThemeStore();

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    {
      id: "light",
      label: "Light",
      icon: <SunIcon size={20} />,
    },
    {
      id: "dark",
      label: "Dark",
      icon: <MoonStarsIcon size={20} />,
    },
    {
      id: "system",
      label: "System",
      icon: <DesktopIcon size={20} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-gray-scale-11 text-sm font-medium">Theme</h2>
        <p className="text-gray-scale-11 text-sm mb-4 mt-1">
          Choose how Chaterface looks to you.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {themes.map((item) => (
          <button
            key={item.id}
            onClick={() => setTheme(item.id)}
            className={`
              flex flex-col items-center gap-3 p-4 rounded-xl border transition-all
              ${
                theme === item.id
                  ? "bg-gray-scale-3 border-gray-scale-4 text-gray-scale-12 shadow-xs"
                  : "bg-gray-scale-2 border-gray-scale-3 text-gray-scale-11 hover:bg-gray-scale-3 hover:text-gray-scale-12"
              }
            `}
          >
            <div className={theme === item.id ? "text-sky-500" : ""}>
              {item.icon}
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ApiKeySection() {
  const { user } = useData();
  const { fetchModels, error, isLoading, setError, models } = useModelStore();
  // Initialize with local storage value
  const [apiKey, setApiKey] = useState(() => getLocalApiKey() || "");
  const [showKey, setShowKey] = useState(false);
  const [credits, setCredits] = useState<OpenRouterCredits | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  const initialKey = useRef(apiKey);

  useEffect(() => {
    // If the key is the same as when we opened the modal,
    // we only fetch if we don't have models yet.
    if (apiKey === initialKey.current) {
      if (apiKey) {
        // Attempt to fetch credits if we have a key initially
        fetchCredits(apiKey)
          .then(setCredits)
          .catch(() => setCredits(null));

        if (models.length === 0) {
          fetchModels();
        }
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLocalApiKey(apiKey);
      if (apiKey) {
        setCheckingCredits(true);
        try {
          // Check credits first as validation
          const creditData = await fetchCredits(apiKey);
          setCredits(creditData);
          setError(null); // Clear any previous error if this succeeds

          // Then fetch models
          fetchModels(true);

          userplexClient.logs.new({
            name: "api_key_set",
            user_id: user?.id ?? "",
          });
        } catch (err: unknown) {
          console.error("API Key validation failed:", err);
          setCredits(null);
          const message =
            err instanceof Error ? err.message : "Invalid API key";
          setError(message);
        } finally {
          setCheckingCredits(false);
        }
      } else {
        setCredits(null);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [apiKey, fetchModels, user?.id, setError, models.length]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-gray-scale-11 text-sm font-medium">
        OpenRouter API Key
      </h2>
      <p className="text-gray-scale-11 text-sm mb-4 mt-1">
        Add your OpenRouter API key to use AI models. These keys are stored
        locally on your device. Get one at{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-scale-11 hover:text-gray-scale-12 underline underline-offset-2"
        >
          openrouter.ai/keys
        </a>
      </p>

      {/* API Key Input */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className={`w-full px-3 py-2.5 pr-20 bg-gray-scale-2 border ${
              error ? "border-red-500" : "border-gray-scale-4"
            } rounded-lg text-gray-scale-12 placeholder:text-gray-scale-11 focus:outline-none focus:ring-2 ${
              error ? "focus:ring-red-500/20" : "focus:ring-sky-7"
            } focus:border-transparent transition-all font-mono text-sm`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {(isLoading || checkingCredits) && (
              <div className="w-3 h-3 border-2 border-gray-scale-6 border-t-gray-scale-11 rounded-full animate-spin" />
            )}
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="px-2 py-1 text-sm text-gray-scale-11 hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4 rounded transition-colors"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}
          {!error && apiKey && !isLoading && !checkingCredits && (
            <div className="flex flex-col gap-2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20"
              >
                <CheckIcon size={14} weight="bold" />
                API Key is valid
              </motion.div>

              {credits && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-between items-center text-xs px-2"
                >
                  <span className="text-gray-scale-11">Credits Remaining:</span>
                  <span className="font-mono text-emerald-500 font-semibold">
                    ${(credits.total_credits - credits.total_usage).toFixed(2)}
                  </span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CloudSection() {
  const { user, db, masterKey, setMasterKey } = useData();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Key Management
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);

  const isGuest = !user;

  const handleCopyKey = () => {
    if (masterKey) {
      navigator.clipboard.writeText(masterKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleSaveKey = () => {
    if (newKeyInput.trim()) {
      setMasterKey(newKeyInput.trim());
      setIsEditingKey(false);
    }
  };

  // if (isAuthLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-48">
  //       <div className="w-6 h-6 border-2 border-gray-scale-6 border-t-gray-scale-11 rounded-full animate-spin" />
  //     </div>
  //   );
  // }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await db.auth.sendMagicCode({ email });
      setSentTo(email);
    } catch (err: unknown) {
      const error = err as { body?: { message?: string } };
      setError(error.body?.message || "Failed to send code. Please try again.");
    }
    setIsLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo || !code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await db.auth.signInWithMagicCode({ email: sentTo, code });
      // Auth state will update automatically via useAuth
    } catch (err: unknown) {
      const error = err as { body?: { message?: string } };
      setError(error.body?.message || "Invalid code. Please try again.");
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await db.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    setIsLoading(false);
  };

  // Fully signed in (not guest) state
  if (user && !isGuest) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-20 h-20 bg-linear-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-semibold text-3xl shadow-lg">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-gray-scale-12">
              {user.email}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-sm font-medium w-fit mx-auto">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Cloud Sync Active
            </div>
          </div>
        </div>

        <div className="bg-gray-scale-2 rounded-xl p-4 border border-gray-scale-3 space-y-3">
          <div className="flex items-center gap-3">
            <CloudIcon size={20} className="text-sky-500" weight="duotone" />
            <div>
              <p className="text-sm font-medium text-gray-scale-12">
                Cloud Features
              </p>
              <p className="text-sm text-gray-scale-11">
                Your conversations are backed up and accessible from any device.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-scale-2 rounded-xl p-4 border border-gray-scale-3 space-y-4">
          <div className="flex items-start gap-3">
            <LockKeyIcon
              size={20}
              className="text-amber-500 mt-0.5"
              weight="duotone"
            />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-scale-12">
                  Encryption Key
                </p>
                <p className="text-sm text-gray-scale-11 mt-1">
                  This key encrypts your data. To access your chats on another
                  device, you must use this exact key.
                </p>
              </div>

              {isEditingKey ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <WarningIcon
                      className="text-red-500 shrink-0 mt-0.5"
                      size={16}
                    />
                    <p className="text-xs text-red-500">
                      Warning: Changing this key will make existing cloud
                      messages unreadable unless they were encrypted with this
                      new key. Only change this if you are importing a key from
                      another device.
                    </p>
                  </div>
                  <textarea
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-scale-3 border border-gray-scale-4 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    rows={2}
                    placeholder="Paste your key here..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingKey(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-scale-11 hover:text-gray-scale-12 hover:bg-gray-scale-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveKey}
                      disabled={!newKeyInput.trim()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type={showMasterKey ? "text" : "password"}
                      value={masterKey || ""}
                      readOnly
                      className="w-full pl-3 pr-10 py-2 bg-gray-scale-3 border border-gray-scale-4 rounded-lg text-sm font-mono text-gray-scale-11 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-scale-11 hover:text-gray-scale-12 px-1.5 py-0.5 rounded hover:bg-gray-scale-4 transition-colors"
                    >
                      {showMasterKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="p-2 text-gray-scale-11 hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4 border border-gray-scale-4 rounded-lg transition-colors"
                    title="Copy Key"
                  >
                    {keyCopied ? (
                      <CheckIcon size={16} className="text-emerald-500" />
                    ) : (
                      <CopyIcon size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setNewKeyInput(masterKey || "");
                      setIsEditingKey(true);
                    }}
                    className="p-2 text-gray-scale-11 hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4 border border-gray-scale-4 rounded-lg transition-colors"
                    title="Edit / Import Key"
                  >
                    <PencilSimpleIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="w-full px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-medium text-sm hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    );
  }

  // Guest user - show upgrade flow
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-2 mt-4">
        <h2 className="text-lg font-semibold text-gray-scale-12">
          {sentTo ? "Check your email" : "Sign in to Cloud"}
        </h2>
        <p className="text-sm text-gray-scale-11 max-w-xs mx-auto">
          {sentTo
            ? `We sent a magic code to ${sentTo}`
            : "Sync your conversations across devices and never lose your chat history."}
        </p>
      </div>

      {!sentTo ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-gray-scale-2 border border-gray-scale-4 rounded-xl text-gray-scale-12 placeholder:text-gray-scale-11 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              autoFocus
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full px-4 py-3 bg-gray-scale-6 text-gray-scale-12 rounded-xl font-medium text-sm hover:bg-gray-scale-7 border border-gray-scale-8 hover:border-gray-scale-9 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-scale-6 border-t-gray-scale-1 rounded-full animate-spin" />
                Sending code...
              </span>
            ) : (
              "Continue with Email"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full px-4 py-3 bg-gray-scale-2 border border-gray-scale-4 rounded-xl text-gray-scale-12 placeholder:text-gray-scale-11 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-center tracking-[0.5em] font-mono text-xl"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setCode("");
                setError(null);
              }}
              className="px-4 py-3 bg-gray-scale-3 text-gray-scale-11 rounded-xl font-medium text-sm hover:bg-gray-scale-4 hover:text-gray-scale-12 transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="px-4 py-3 bg-gray-scale-12 text-gray-scale-1 rounded-xl font-medium text-sm hover:bg-gray-scale-11 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-scale-6 border-t-gray-scale-1 rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify Code"
              )}
            </button>
          </div>

          <p className="text-center">
            <button
              type="button"
              onClick={handleSendCode}
              disabled={isLoading}
              className="text-sm text-gray-scale-11 hover:text-gray-scale-12 underline underline-offset-2 transition-colors"
            >
              Didn&apos;t receive a code? Send again
            </button>
          </p>
        </form>
      )}

      <div className="pt-4 border-t border-gray-scale-3 dark:border-gray-scale-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-scale-2/50">
            <CloudIcon size={18} weight="duotone" className="text-sky-500" />
            <p className="text-sm font-medium text-gray-scale-12">
              Cross-device Sync
            </p>
            <p className="text-sm text-gray-scale-11 leading-relaxed">
              Access your chats on any device with secure cloud sync.
            </p>
          </div>
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-scale-2/50">
            <FingerprintIcon
              size={18}
              weight="bold"
              className="text-emerald-500"
            />
            <p className="text-sm font-medium text-gray-scale-12">
              Always Encrypted
            </p>
            <p className="text-sm text-gray-scale-11 leading-relaxed">
              Your data is encrypted locally before it touches the cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelsSection() {
  const [search, setSearch] = useState("");
  const { models } = useModelStore();
  const { db } = useData();
  const [filteredModels, setFilteredModels] = useState(models);

  const { user } = db.useAuth();

  const userData = db.useQuery(
    user ? { $users: { $: { where: { id: user.id } } } } : null
  );
  const userSettings = userData?.data?.$users?.[0]?.settings;

  const toggleModel = (modelId: string, disabled: boolean) => {
    if (!user) return;

    const currentSettings = userSettings || {};
    const currentDisabled = Array.isArray(currentSettings.disabledModels)
      ? currentSettings.disabledModels
      : [];

    let newDisabled;
    if (disabled) {
      // Disable the model (add to list)
      newDisabled = [...currentDisabled, modelId];
    } else {
      // Enable the model (remove from list)
      newDisabled = currentDisabled.filter((id: string) => id !== modelId);
    }

    // Deduplicate just in case
    newDisabled = Array.from(new Set(newDisabled));

    db.transact(
      db.tx.$users[user.id].update({
        settings: {
          ...currentSettings,
          disabledModels: newDisabled,
        },
      })
    );
  };

  const filterModels = useCallback(
    (search: string) => {
      setFilteredModels(
        models.filter(
          (model) =>
            model.name.toLowerCase().includes(search.toLowerCase()) ||
            model.id.toLowerCase().includes(search.toLowerCase()) ||
            model.description?.toLowerCase().includes(search.toLowerCase())
        )
      );
    },
    [models]
  );

  useEffect(() => {
    filterModels(search);
  }, [search, filterModels]);

  const handleEnableAll = () => {
    if (!user) return;
    db.transact(
      db.tx.$users[user.id].update({
        settings: { disabledModels: [] },
      })
    );
  };

  const handleDisableAll = () => {
    if (!user) return;
    db.transact(
      db.tx.$users[user.id].merge({
        settings: { disabledModels: filteredModels.map((model) => model.id) },
      })
    );
  };

  const setDefaultModel = (modelId: string) => {
    if (!user) return;
    db.transact(
      db.tx.$users[user.id].merge({
        settings: { defaultModel: modelId },
      })
    );
  };

  const addToFavorites = (modelId: string) => {
    if (!user) return;
    db.transact(
      db.tx.$users[user.id].merge({
        settings: { favorites: [...(userSettings?.favorites || []), modelId] },
      })
    );
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-gray-scale-11 mb-1 flex items-center gap-2">
        Models
      </h2>
      <p className="text-sm text-gray-scale-11">
        Select what models you want to enable. You can also set defaults and
        favorites.
      </p>
      <input
        type="text"
        placeholder="Search models..."
        className=" mt-4 w-full px-2 py-1 text-sm bg-gray-scale-2 border border-gray-scale-4 rounded-lg text-gray-scale-12 placeholder:text-gray-scale-11 focus:outline-none focus:ring-2 focus:ring-sky-7 focus:border-transparent transition-all"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-col h-full gap-2 mt-4 overflow-y-auto">
        <div className="flex flex-row gap-1 items-center justify-end">
          <button
            onClick={handleEnableAll}
            className="px-2 py-1 text-sm text-gray-scale-11 hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4 rounded-lg transition-colors"
          >
            <p className="text-sm text-gray-scale-11">Enable All</p>
          </button>
          <button
            onClick={handleDisableAll}
            className="px-2 py-1 text-sm text-gray-scale-11 hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4 rounded-lg transition-colors"
          >
            <p className="text-sm text-gray-scale-11">Disable All</p>
          </button>
        </div>
        {filteredModels.map((model) => {
          const isDisabled =
            userSettings?.disabledModels &&
            userSettings?.disabledModels.length > 0 &&
            userSettings?.disabledModels?.includes(model.id);
          return (
            <div
              className={`flex flex-row gap-1 items-center justify-between group ${
                isDisabled ? "opacity-50" : ""
              }`}
              key={model.id}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-row items-center gap-2">
                  <p className="text-sm font-medium text-gray-scale-11">
                    {model.name}
                  </p>
                  {userSettings?.defaultModel === model.id && (
                    <p className="text-[11px] text-gray-scale-11 font-mono font-semibold uppercase">
                      Default
                    </p>
                  )}
                  {userSettings?.favorites &&
                    userSettings?.favorites.includes(model.id) && (
                      <StarIcon
                        size={12}
                        weight="fill"
                        className="text-yellow-500"
                      />
                    )}
                </div>
                <p className="text-sm text-gray-scale-11 truncate">
                  {model.id}
                </p>
              </div>
              <div className="flex flex-row gap-2 items-center justify-center">
                {!isDisabled && (
                  <button
                    onClick={() => setDefaultModel(model.id)}
                    className=" text-sm rounded transition-colors cursor-pointer group-hover:block bg-gray-scale-3 hover:bg-gray-scale-4 px-1 hidden"
                  >
                    <p className="text-sm text-gray-scale-11">Make Default</p>
                  </button>
                )}

                {!isDisabled && (
                  <button
                    onClick={() => addToFavorites(model.id)}
                    className=" text-sm rounded transition-colors cursor-pointer group-hover:block bg-gray-scale-3 hover:bg-gray-scale-4 px-1 hidden"
                  >
                    <p className="text-sm text-gray-scale-11">
                      Add to Favorites
                    </p>
                  </button>
                )}

                {isDisabled ? (
                  <button
                    onClick={() => toggleModel(model.id, false)}
                    className="h-4 w-4 text-sm rounded transition-colors text-gray-scale-11 cursor-pointer hover:text-gray-scale-12 bg-gray-scale-3 hover:bg-gray-scale-4"
                  ></button>
                ) : (
                  <button
                    onClick={() => toggleModel(model.id, true)}
                    className="h-4 w-4 text-sm rounded transition-colors bg-gray-scale-4 items-center justify-center flex cursor-pointer"
                  >
                    <CheckIcon
                      size={12}
                      weight="bold"
                      className="text-gray-scale-11"
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemPromptSection() {
  const { user, db } = useData();

  // Cloud Data
  const { data: userData } = db.useQuery(
    user ? { $users: { $: { where: { id: user.id } } } } : null
  );
  // Note: Schema defines systemPrompt as a top-level field on $users, not inside settings JSON
  const cloudSystemPrompt = userData?.$users?.[0]?.systemPrompt;

  // Local Data
  const [localSystemPrompt, setLocalSystemPrompt] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("chaterface_system_prompt");
    if (stored) setLocalSystemPrompt(stored);
  }, []);

  // Determine which value to show
  // If user is logged in, we always prefer the cloud value (as requested)
  const displayValue = user ? cloudSystemPrompt ?? "" : localSystemPrompt;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    if (user) {
      // Update Cloud
      db.transact(
        db.tx.$users[user.id].update({
          systemPrompt: newValue,
        })
      );
    } else {
      // Update Local
      setLocalSystemPrompt(newValue);
      localStorage.setItem("chaterface_system_prompt", newValue);
    }
  };

  return (
    <div className="flex flex-col mt-4">
      <h2 className="text-gray-scale-11 text-sm font-medium">System Prompt</h2>
      <p className="text-gray-scale-11 text-sm mt-1">
        Set the system prompt for Chaterface.
      </p>
      <textarea
        value={displayValue}
        className="w-full px-2 py-1 mt-2 text-sm bg-gray-scale-2 border border-gray-scale-4 rounded-lg text-gray-scale-12 placeholder:text-gray-scale-11 focus:outline-none focus:ring-2 focus:ring-sky-7 focus:border-transparent transition-all"
        onChange={handleChange}
        placeholder="Enter your system prompt"
      />
    </div>
  );
}
