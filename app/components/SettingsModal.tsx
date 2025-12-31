"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useData } from "../providers/DataProvider";
import { getLocalApiKey, setLocalApiKey } from "@/lib/crypto";
import {
  CheckIcon,
  GearIcon,
  HeadCircuitIcon,
  StarIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useModelStore } from "@/lib/modelStore";
import { userplexClient } from "@/lib/userplexClient";

type Tab = "general" | "account" | "models";

export default function SettingsModal() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div className="flex flex-col max-h-[70vh] max-w-2xl w-full overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-gray-3 dark:border-gray-2 p-2">
        {/* <h1 className="text-gray-12 text-lg font-semibold mb-4">Settings</h1> */}
        <div className="flex gap-1">
          <AnimatedTabs
            tabs={[
              {
                name: "General",
                icon: (
                  <GearIcon
                    size={14}
                    weight="bold"
                    className="text-gray-10 z-10"
                  />
                ),
              },
              {
                name: "Account",
                icon: (
                  <UserIcon
                    size={14}
                    weight="bold"
                    className="text-gray-10 z-10"
                  />
                ),
              },
              {
                name: "Models",
                icon: (
                  <HeadCircuitIcon
                    size={14}
                    weight="bold"
                    className="text-gray-10 z-10"
                  />
                ),
              },
            ]}
            activeTab={
              activeTab === "general"
                ? "General"
                : activeTab === "account"
                ? "Account"
                : "Models"
            }
            onTabChange={(tab) =>
              setActiveTab(
                tab === "General"
                  ? "general"
                  : tab === "Account"
                  ? "account"
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
            >
              <ApiKeySection />
            </motion.div>
          )}
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <AccountSection />
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
          className="relative flex items-center text-gray-10 flex-row gap-1.5 py-1 px-2 rounded-md focus:outline-none cursor-pointer transition-colors"
        >
          {activeTab === tab.name && (
            <motion.div
              layoutId="active-tab-bg"
              className="absolute inset-0 bg-gray-2 rounded-md"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tab.icon}
          <span className="relative z-10 text-gray-10 text-sm">{tab.name}</span>
        </button>
      ))}
    </div>
  );
}

function ApiKeySection() {
  const { user } = useData();
  const { fetchModels, error, isLoading, setError, models } = useModelStore();
  // Initialize with local storage value
  const [apiKey, setApiKey] = useState(() => getLocalApiKey() || "");
  const [showKey, setShowKey] = useState(false);
  const initialKey = useRef(apiKey);

  useEffect(() => {
    // If the key is the same as when we opened the modal,
    // we only fetch if we don't have models yet.
    if (apiKey === initialKey.current) {
      if (apiKey && models.length === 0) {
        fetchModels();
      }
      return;
    }

    const timer = setTimeout(() => {
      setLocalApiKey(apiKey);
      if (apiKey) {
        // Force fetch to verify the new key
        fetchModels(true);
        userplexClient.logs.new({
          name: "api_key_set",
          user_id: user?.id ?? "",
        });
      } else {
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [apiKey, fetchModels, user?.id, setError, models.length]);

  return (
    <div className="">
      <h2 className="text-gray-11 text-sm font-medium">OpenRouter API Key</h2>
      <p className="text-gray-9 text-sm mb-4 mt-1">
        Add your OpenRouter API key to use AI models. These keys are stored
        locally on your device. Get one at{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-9 hover:text-gray-12 underline underline-offset-2"
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
            className={`w-full px-3 py-2.5 pr-20 bg-gray-2 border ${
              error ? "border-red-500" : "border-gray-4"
            } rounded-lg text-gray-12 placeholder:text-gray-8 focus:outline-none focus:ring-2 ${
              error ? "focus:ring-red-500/20" : "focus:ring-sky-7"
            } focus:border-transparent transition-all font-mono text-sm`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && (
              <div className="w-3 h-3 border-2 border-gray-6 border-t-gray-11 rounded-full animate-spin" />
            )}
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="px-2 py-1 text-sm text-gray-11 hover:text-gray-12 bg-gray-3 hover:bg-gray-4 rounded transition-colors"
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
          {!error && apiKey && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20"
            >
              <CheckIcon size={14} weight="bold" />
              API Key is valid
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, db, isAuthLoading, isGuest } = useData();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // If upgrading from guest, the user ID stays the same and data is preserved
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
      // Will auto sign-in as guest again via DataProvider
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    setIsLoading(false);
  };

  // Fully signed in (not guest) state
  if (user && !isGuest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-gray-2 rounded-xl border border-gray-3">
          <div className="w-12 h-12 bg-linear-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-12 truncate">
              {user.email}
            </p>
            <p className="text-sm text-gray-10">Signed in</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Synced
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="w-full px-4 py-2.5 bg-gray-3 text-gray-11 rounded-lg font-medium text-sm hover:bg-gray-4 hover:text-gray-12 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    );
  }

  // Guest user - show upgrade flow
  return (
    <div className="space-y-4">
      {/* Guest status banner */}
      {isGuest && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="w-10 h-10 bg-linear-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            G
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-12">Guest Account</p>
            <p className="text-sm text-gray-10">
              Your data is saved on this device only
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-12 mb-1 flex items-center gap-2">
          {isGuest ? "Create your account" : "Sign in or create account"}
          {isAuthLoading && (
            <div className="w-3 h-3 border border-gray-6 border-t-gray-11 rounded-full animate-spin" />
          )}
        </h2>
        <p className="text-sm text-gray-11">
          {isGuest
            ? "Add your email to sync conversations across devices and keep your data safe."
            : "Save your conversations and settings across devices."}
        </p>
      </div>

      {!sentTo ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-12">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 bg-gray-2 border border-gray-4 rounded-lg text-gray-12 placeholder:text-gray-8 focus:outline-none focus:ring-2 focus:ring-sky-7 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full px-4 py-2.5 bg-gray-12 text-gray-1 rounded-lg font-medium text-sm hover:bg-gray-11 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-6 border-t-gray-1 rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              "Continue with Email"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="bg-sky-2 border border-sky-6 rounded-lg p-3">
            <p className="text-sm text-sky-11">
              We sent a verification code to{" "}
              <strong className="text-sky-12">{sentTo}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-12">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2.5 bg-gray-2 border border-gray-4 rounded-lg text-gray-12 placeholder:text-gray-8 focus:outline-none focus:ring-2 focus:ring-sky-7 focus:border-transparent transition-all text-center tracking-widest font-mono text-lg"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setCode("");
                setError(null);
              }}
              className="px-4 py-2.5 bg-gray-3 text-gray-11 rounded-lg font-medium text-sm hover:bg-gray-4 hover:text-gray-12 transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="flex-1 px-4 py-2.5 bg-gray-12 text-gray-1 rounded-lg font-medium text-sm hover:bg-gray-11 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-6 border-t-gray-1 rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : isGuest ? (
                "Verify & Upgrade Account"
              ) : (
                "Verify & Sign In"
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={isLoading}
            className="w-full text-sm text-gray-11 hover:text-gray-12 transition-colors"
          >
            Didn&apos;t receive a code? Send again
          </button>
        </form>
      )}

      {isGuest && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-medium text-gray-12">
            Why create an account?
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-11">
            <li className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-sky-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Keep all your conversations when you upgrade
            </li>
            <li className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-sky-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Access from any device
            </li>
          </ul>
        </div>
      )}
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
      <h2 className="text-sm font-semibold text-gray-11 mb-1 flex items-center gap-2">
        Models
      </h2>
      <p className="text-sm text-gray-9">
        Select what models you want to enable. You can also set defaults and
        favorites.
      </p>
      <input
        type="text"
        placeholder="Search models..."
        className=" mt-4 w-full px-2 py-1 text-sm bg-gray-2 border border-gray-4 rounded-lg text-gray-12 placeholder:text-gray-8 focus:outline-none focus:ring-2 focus:ring-sky-7 focus:border-transparent transition-all"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-col h-full gap-2 mt-4 overflow-y-auto">
        <div className="flex flex-row gap-1 items-center justify-end">
          <button
            onClick={handleEnableAll}
            className="px-2 py-1 text-sm text-gray-11 hover:text-gray-12 bg-gray-3 hover:bg-gray-4 rounded-lg transition-colors"
          >
            <p className="text-sm text-gray-11">Enable All</p>
          </button>
          <button
            onClick={handleDisableAll}
            className="px-2 py-1 text-sm text-gray-11 hover:text-gray-12 bg-gray-3 hover:bg-gray-4 rounded-lg transition-colors"
          >
            <p className="text-sm text-gray-11">Disable All</p>
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
                  <p className="text-sm font-medium text-gray-11">
                    {model.name}
                  </p>
                  {userSettings?.defaultModel === model.id && (
                    <p className="text-[11px] text-gray-10 font-mono font-semibold uppercase">
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
                <p className="text-sm text-gray-9 truncate">{model.id}</p>
              </div>
              <div className="flex flex-row gap-2 items-center justify-center">
                {!isDisabled && (
                  <button
                    onClick={() => setDefaultModel(model.id)}
                    className=" text-sm rounded transition-colors cursor-pointer group-hover:block bg-gray-3 hover:bg-gray-4 px-1 hidden"
                  >
                    <p className="text-sm text-gray-10">Make Default</p>
                  </button>
                )}

                {!isDisabled && (
                  <button
                    onClick={() => addToFavorites(model.id)}
                    className=" text-sm rounded transition-colors cursor-pointer group-hover:block bg-gray-3 hover:bg-gray-4 px-1 hidden"
                  >
                    <p className="text-sm text-gray-10">Add to Favorites</p>
                  </button>
                )}

                {isDisabled ? (
                  <button
                    onClick={() => toggleModel(model.id, false)}
                    className="h-4 w-4 text-sm rounded transition-colors text-gray-11 cursor-pointer hover:text-gray-12 bg-gray-3 hover:bg-gray-4"
                  ></button>
                ) : (
                  <button
                    onClick={() => toggleModel(model.id, true)}
                    className="h-4 w-4 text-sm rounded transition-colors bg-gray-4 items-center justify-center flex cursor-pointer"
                  >
                    <CheckIcon
                      size={12}
                      weight="bold"
                      className="text-gray-10"
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
