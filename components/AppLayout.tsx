'use client';

import Button from "@/components/button";
import Logo from "@/components/logo";
import { Plus, MoonStars, Sun, SignOut, SignIn, GithubLogo } from "@phosphor-icons/react";
import { useAuth } from "@/providers/auth-provider";
import { useDatabase } from "@/providers/database-provider";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import hotkeys from 'hotkeys-js';
import { useCreateConversation } from "@/app/utils/conversation"
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react";
import { DateTime } from "luxon";

// Define the expected shape of a conversation based on AppSchema
type Conversation = InstaQLEntity<AppSchema, "conversations">;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile, db, sessionId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  // const { createConversationAndRedirect } = useCreateConversation();
  // Determine the active conversation ID from the pathname
  const conversationId = pathname.startsWith('/conversations/') ? pathname.split('/').pop() : null;

  // Fetch conversations associated with the current session
  const { data } = db.useQuery({
    conversations: {
      $: {
        where: {
          or: [{ 'user.id': user?.id ?? '' }, { sessionId: sessionId ?? '' }],
        },
        order: { createdAt: "desc" }
      },
    }
  }, {
    ruleParams: {
      sessionId: sessionId ?? ''
    }
  });

  useEffect(() => {
    if (data?.conversations) {
      // No need to map createdAt to Date, keep as ISO string from DB
      setConversations(data.conversations as Conversation[]);
    }

  }, [data]);

  // Set up keyboard shortcuts
  useEffect(() => {
    // Shortcut 'n' to create a new conversation
    hotkeys('n', (event) => {
      // Prevent triggering shortcut if focus is inside an input or textarea
      if (!(event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        router.push('/');
      }
    });

    return () => {
      hotkeys.unbind('n');
    };
  }, [router]);

  const signOut = () => {
    db.auth.signOut();
  };

  const setTheme = async (theme: string) => {
    await db.transact(db.tx.userProfiles[profile?.id].update({ theme: theme }));
  };
  
  const url = db.auth.createAuthorizationURL({
    clientName: "google-web",
    redirectURL: window.location.href,
  });

  return (
    <div className={`flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-sage-1 dark:bg-sage-1 ${profile?.theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className="flex-col p-2 items-start w-full max-w-64 overflow-hidden hidden md:flex">
        <div className="flex flex-row gap-2 justify-between w-full items-center">
          <Logo style="small" className="my-2 ml-1" color={profile?.theme === 'dark' ? 'white' : 'black'}/>
          
          <div className="flex flex-row gap-1">
            { profile && (
              <button
                onClick={() => setTheme(profile?.theme === 'dark' ? 'light' : 'dark')}
                className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300"
                aria-label={`Switch to ${profile?.theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {profile?.theme === 'light' ? (
                    <MoonStars size={16} weight="bold" className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300" />
                ) : (
                    <Sun size={16} weight="bold" className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300" />
                )}
              </button>
            )}

            {user ? (
              <button onClick={() => signOut()} className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300">
                <SignOut size={16} weight="bold" className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300" />
              </button>
            ) : (
              <Link href={url} className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300">
                <SignIn size={16} weight="bold" className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300" />
              </Link>
            )}
          </div>
        </div>
        {/* <Button onClick={createConversationAndRedirect} size="small" className="mt-2 w-full bg-sage-3 text-sage-11 hover:bg-sage-4 dark:bg-sage-3 dark:text-sage-11 dark:hover:bg-sage-4 duration-300 border border-sage-6 dark:border-sage-6" icon={<Plus size={16} weight="bold" />}>New Conversation</Button> */}

        

        <div className="flex flex-col gap-3 border bg-white dark:bg-sage-2 border-sage-3 dark:border-sage-3 rounded-md p-3 w-full mt-1">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-sage-12">Bring your own OpenRouter key</p>
            <p className="text-xs text-sage-10 dark:text-sage-10">
              Manage your API key from the settings page. Keys are saved locally in your browser and sent with each chat request.
            </p>
            <Link href="/settings" className="w-max text-xs font-medium text-sage-11 hover:text-sage-12 transition-colors duration-300 underline">
              Open settings
            </Link>
          </div>

          <div className="flex flex-col gap-2 border-t border-sage-3 pt-3">
            <p className="text-xs text-sage-10 dark:text-sage-10">Chaterface is a fully open source project by <Link href="https://x.com/dqnamo" target="_blank" className="font-medium text-sage-11 hover:text-sage-12 transition-colors duration-300">@dqnamo</Link> and <Link href="https://x.com/hyperaide" target="_blank" className="font-medium text-sage-11 hover:text-sage-12 transition-colors duration-300">Hyperaide</Link>.</p>
            <div className="flex flex-wrap w-full gap-2">
              <Link href="https://github.com/hyperaide/chaterface" target="_blank" className="flex flex-row items-center gap-1 group bg-sage-2 dark:bg-sage-4 hover:bg-sage-5 hover:border-sage-6 transition-colors duration-300 border border-sage-5 rounded-md p-1 px-2">
                <GithubLogo size={12} weight="bold" className="text-sage-11 dark:text-sage-11 group-hover:text-sage-12 transition-colors duration-300" />
                <p className="text-xs text-sage-11 dark:text-sage-11 hover:text-sage-12 transition-colors duration-300">Github</p>
              </Link>
            </div>
          </div>

        </div>

        {/* Conversation List */}
        <div className="w-full flex flex-col h-full relative">
          <div className="flex flex-row items-center justify-between gap-2 py-4">
            <p className="text-xs font-mono px-2 text-sage-11 dark:text-sage-11">Conversations</p>
            <Link href="/" className="w-max bg-sage-3 text-sage-11 hover:bg-sage-4 dark:bg-sage-3 dark:text-sage-11 dark:hover:bg-sage-4 duration-300 border border-sage-6 dark:border-sage-6 rounded p-1 hover:cursor-pointer">
              <Plus size={8} weight="bold" />
            </Link>
          </div>
          <div className="flex flex-col w-full overflow-y-auto gap-px relative">
          
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className={`flex flex-col justify-between text-sm px-2 py-1 w-full rounded-md hover:bg-sage-2 duration-300 ${conv.id === conversationId ? 'bg-sage-3 font-medium text-sage-12 dark:text-sage-12' : 'text-sage-11 dark:text-sage-11'}`}
              >
                <p className="truncate">{conv.name}</p>
                <p className="text-xs text-sage-10 dark:text-sage-10">{DateTime.fromISO(conv.createdAt as string).toRelative()}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center mt-2 overflow-hidden md:hidden">
        <div className="flex flex-row items-center gap-2">
          <Logo style="small" className="my-2 ml-1" color={profile?.theme === 'dark' ? 'white' : 'black'}/>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="md:w-full bg-white dark:bg-sage-2 mr-2 my-2 ml-2 md:ml-0 rounded-lg overflow-hidden border border-sage-4 dark:border-sage-5">
        {children}
      </div>
    </div>
  );
} 