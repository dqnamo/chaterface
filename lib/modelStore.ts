import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        set({ isLoading: true });
        try {
          const response = await fetch("/api/chat/models/fetch", {
            method: "POST",
            body: JSON.stringify({ countOnly: true }),
          });
          const data = await response.json();
          const currentModels = get().models;

          // If count matches and we have models, we assume they are up to date
          if (currentModels.length === data.count && currentModels.length > 0) {
            set({ isLoading: false });
            return;
          }

          const fullResponse = await fetch("/api/chat/models/fetch", {
            method: "POST",
            body: JSON.stringify({ countOnly: false }),
          });
          const fullData = await fullResponse.json();
          set({ models: fullData });
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

