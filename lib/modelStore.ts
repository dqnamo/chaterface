import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocalApiKey } from './crypto';

export type Model = {
  id: string;
  name: string;
  description?: string;
  context_length: number;
};

interface ModelState {
  selectedModel: string;
  models: Model[];
  isLoading: boolean;
  setSelectedModel: (model: string) => void;
  fetchModels: () => Promise<void>;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: 'xai/grok-4.1-fast',
      models: [],
      isLoading: false,
      setSelectedModel: (model) => set({ selectedModel: model }),
      fetchModels: async () => {
        const apiKey = getLocalApiKey();
        if (!apiKey) return;

        set({ isLoading: true });
        try {
          // Fetch models from OpenRouter
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
          }

          const data = await response.json();
          // OpenRouter returns { data: Model[] }
          if (data && Array.isArray(data.data)) {
            set({ models: data.data });
          }
        } catch (error) {
          console.error("Failed to fetch models:", error);
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

