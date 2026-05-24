"use client";

import { Dialog } from "@base-ui/react/dialog";
import { MonitorIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeModeSelector } from "@/components/ThemeModeSelector";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/helpers/classname-helper";
import {
  DEFAULT_USER_AVATAR_COLOR,
  getUserAvatarColor,
  USER_AVATAR_COLOR_OPTIONS,
  type UserAvatarColorValue,
} from "@/helpers/user-avatar-colors";
import { getUserDisplayName } from "@/helpers/user-identity";
import type { AppDb } from "@/lib/db.client";

type UserRecord = {
  avatarColor?: UserAvatarColorValue;
  email?: string;
  id: string;
};

export default function UserSettingsModal({
  instantDb,
  onOpenChange,
  open,
}: {
  instantDb: AppDb;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const router = useRouter();
  const { isLoading, user } = instantDb.useAuth();
  const { data, isLoading: isUserLoading } = instantDb.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
          },
        }
      : null,
  );
  const currentUser = data?.$users?.[0] as UserRecord | undefined;
  const currentAvatarColor = getUserAvatarColor(currentUser?.avatarColor);
  const [selectedAvatarColor, setSelectedAvatarColor] =
    useState<UserAvatarColorValue>(DEFAULT_USER_AVATAR_COLOR);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      onOpenChange(false);
      router.replace("/login");
    }
  }, [isLoading, onOpenChange, router, user]);

  useEffect(() => {
    setSelectedAvatarColor(currentAvatarColor);
  }, [currentAvatarColor]);

  async function saveAvatarColor(color: UserAvatarColorValue) {
    if (!user?.id) {
      return;
    }

    setSelectedAvatarColor(color);
    setAvatarError(null);

    try {
      await instantDb.transact(
        instantDb.tx.$users[user.id].update({
          avatarColor: color,
        }),
      );
    } catch (saveError) {
      console.error(saveError);
      setSelectedAvatarColor(currentAvatarColor);
      setAvatarError(
        saveError instanceof Error
          ? saveError.message
          : "Presence color could not be saved.",
      );
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-12/20 backdrop-blur-sm" />
        <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-100 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl flex-col overflow-hidden rounded-lg border border-grayscale-3 bg-white text-grayscale-12 shadow-xl outline-none dark:border-grayscale-4 dark:bg-grayscale-2">
          <div className="flex items-start justify-between gap-4 border-grayscale-3 border-b px-4 py-3 dark:border-grayscale-4">
            <div className="min-w-0">
              <Dialog.Title className="font-semibold text-base text-grayscale-12">
                User settings
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-grayscale-10 text-sm">
                Configure preferences for your account.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close user settings"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 hover:text-grayscale-12 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-4"
              title="Close user settings"
            >
              <XIcon aria-hidden="true" size={16} weight="bold" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            {isLoading || !user || isUserLoading ? (
              <div className="flex min-h-40 items-center justify-center text-grayscale-11 text-sm">
                Loading settings...
              </div>
            ) : (
              <section className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4">
                <div className="border-grayscale-3 border-b px-3 py-2 dark:border-grayscale-4">
                  <h2 className="font-mono font-bold text-[11px] text-grayscale-10 uppercase tracking-wide">
                    Appearance
                  </h2>
                </div>
                <div className="flex flex-col divide-y divide-grayscale-3 dark:divide-grayscale-4">
                  <div className="flex flex-col gap-4 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-2 text-grayscale-11 dark:border-grayscale-4 dark:bg-grayscale-3">
                        <MonitorIcon
                          aria-hidden="true"
                          size={16}
                          weight="bold"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-grayscale-12 text-sm">
                          Theme
                        </p>
                        <p className="text-grayscale-10 text-xs">
                          Choose a light, dark, or system-matched appearance.
                        </p>
                      </div>
                    </div>
                    <ThemeModeSelector />
                  </div>

                  <div className="flex flex-col gap-4 px-3 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-grayscale-12 text-sm">
                          Presence color
                        </p>
                        <p className="text-grayscale-10 text-xs">
                          Used for cursors and live presence accents.
                        </p>
                      </div>
                      <UserAvatar
                        name={getUserDisplayName({
                          email: currentUser?.email ?? user.email,
                          id: user.id,
                        })}
                        seed={user.id}
                      />
                    </div>

                    <div className="flex flex-row flex-wrap items-center gap-2">
                      {USER_AVATAR_COLOR_OPTIONS.map((option) => {
                        const isSelected = selectedAvatarColor === option.id;

                        return (
                          <button
                            aria-label={`Use ${option.label} presence color`}
                            aria-pressed={isSelected}
                            className={cn(
                              "group relative flex size-5 aspect-square cursor-pointer items-center justify-center border-grayscale-6 bg-grayscale-2 transition-colors hover:border-grayscale-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-9 focus-visible:outline-offset-2",
                            )}
                            key={option.id}
                            onClick={() => saveAvatarColor(option.id)}
                            title={option.label}
                            type="button"
                          >
                            <span
                              className="relative size-5 aspect-square rounded-md transition-transform group-hover:scale-110"
                              style={{
                                backgroundColor: `var(--${option.id}-9)`,
                              }}
                            />
                            {isSelected ? (
                              <span
                                aria-hidden="true"
                                className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 size-2 rounded-xs"
                                style={{
                                  backgroundColor: `var(--${option.id}-5)`,
                                }}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {avatarError ? (
                      <p className="text-red-11 text-sm" role="alert">
                        {avatarError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
