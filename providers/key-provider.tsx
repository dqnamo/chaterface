'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface ProviderKeys {
  openrouter: string | null;
}

interface KeyContextType {
  providerKeys: ProviderKeys;
  setProviderKey: (provider: keyof ProviderKeys, key: string) => void;
  clearProviderKey: (provider: keyof ProviderKeys) => void;
  getProviderKey: () => string | null;
}

const KeyContext = createContext<KeyContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'openrouter_api_key';

export function KeyProvider({ children }: { children: React.ReactNode }) {
  const [providerKeys, setProviderKeys] = useState<ProviderKeys>({
    openrouter: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load keys from localStorage on mount
    try {
      const savedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedKey) {
        setProviderKeys({ openrouter: savedKey });
      }
    } catch (error) {
      console.error('Error loading API keys from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  const setProviderKey = (provider: keyof ProviderKeys, key: string) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, key);
      setProviderKeys(prev => ({
        ...prev,
        [provider]: key
      }));
    } catch (error) {
      console.error(`Error saving ${provider} API key to localStorage:`, error);
    }
  };

  const clearProviderKey = (provider: keyof ProviderKeys) => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setProviderKeys(prev => ({
        ...prev,
        [provider]: null
      }));
    } catch (error) {
      console.error(`Error clearing ${provider} API key from localStorage:`, error);
    }
  };

  const getProviderKey = () => {
    return providerKeys.openrouter || null;
  };

  // Don't render children until we've checked localStorage
  if (!isInitialized) {
    return null;
  }

  return (
    <KeyContext.Provider value={{ providerKeys, setProviderKey, clearProviderKey, getProviderKey }}>
      {children}
    </KeyContext.Provider>
  );
}

export function useKey() {
  const context = useContext(KeyContext);
  if (context === undefined) {
    throw new Error('useKey must be used within a KeyProvider');
  }
  return context;
} 