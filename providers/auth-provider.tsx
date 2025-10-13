'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { init, id } from '@instantdb/react';
import { Homepage } from '../components/Homepage';
import { CircleNotch } from '@phosphor-icons/react';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || '';

const db = init({ appId: APP_ID });

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_NAME = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_NAME || '';

interface AuthContextType {
  user: any | null; // Consider defining a more specific user type
  profile: any | null;
  isLoading: boolean;
  error: Error | null;
  db: any;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, user, error } = db.useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const sessionId = user?.id ?? null;

  useEffect(() => {
    if (!user) return;

    const ensureProfile = async () => {
      const existingProfile = await db
        .queryOnce({
          userProfiles: {
            $: {
              where: {
                'user.id': user.id,
              },
            },
          },
        })
        .then((data) => data.data.userProfiles[0]);

      if (!existingProfile) {
        const profileId = id();
        await db.transact(
          db.tx.userProfiles[profileId]
            .update({
              credits: 200,
            })
            .link({ user: user.id })
        );
      }
    };

    ensureProfile();
  }, [user]);

  const { data: profileData, error: profileError } = db.useQuery({
    userProfiles: {
      $: {
        where: { 'user.id': user?.id ?? '' }
      }
    }
  })

  useEffect(() => {
    if (profileData) {
      setProfile(profileData.userProfiles[0])
    }
  }, [profileData])

  useEffect(() => {
    if (!user) {
      setProfile(null);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <CircleNotch size={24} weight="bold" className="animate-spin" />
      </div>
    )
  }
  if (error) {
    return <div>Authentication Error: {error.message}</div>;
  }

  const combinedError = React.useMemo(() => {
    if (error?.message) {
      return new Error(error.message);
    }
    if (profileError instanceof Error) {
      return profileError;
    }
    if (profileError && typeof (profileError as any).message === 'string') {
      return new Error((profileError as any).message);
    }
    return null;
  }, [error, profileError]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: combinedError,
        profile,
        db,
        sessionId,
      }}
    >
      {user ? (
        children
      ) : (
        <Homepage
          db={db}
          googleClientId={GOOGLE_CLIENT_ID}
          googleClientName={GOOGLE_CLIENT_NAME}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Return the whole context for flexibility, including user, isLoading, error
  return context;
} 