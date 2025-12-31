import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocalApiKey } from './crypto';

export type Model = {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture?: {
    modality?: string;
  };
};

interface ModelState {
  selectedModel: string;
  models: Model[];
  isLoading: boolean;
  error: string | null;
  setSelectedModel: (model: string) => void;
  fetchModels: (force?: boolean) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: 'xai/grok-4.1-fast',
      models: [],
      isLoading: false,
      error: null,
      setSelectedModel: (model) => set({ selectedModel: model }),
      setError: (error) => set({ error }),
      fetchModels: async (force = false) => {
        const { isLoading, models } = get();
        if (isLoading) return;
        
        const apiKey = getLocalApiKey();
        if (!apiKey) {
          set({ models: [], error: null });
          return;
        }

        // If we already have models and aren't forcing a refresh, skip
        if (models.length > 0 && !force) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Fetch models from OpenRouter
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Invalid API key");
            }
            throw new Error(`Failed to fetch models: ${response.statusText}`);
          }

          const data = await response.json();
          // OpenRouter returns { data: Model[] }
          if (data && Array.isArray(data.data)) {
            set({ models: data.data, error: null });
          }
        } catch (error: any) {
          console.error("Failed to fetch models:", error);
          set({ error: error.message || "Failed to fetch models" });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'model-storage',
      partialize: (state) => ({ 
        selectedModel: state.selectedModel, 
        models: state.models 
      }),
    }
  )
);

