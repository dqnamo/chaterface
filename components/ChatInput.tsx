import { useRef } from 'react';
import Button from './button';
import { useModelCatalog } from '@/lib/hooks/use-model-catalog';

export interface Model {
  id: string;
  name: string;
}

interface ChatInputProps {
  onSubmit: (content: string) => void;
  input: string;
  setInput?: (input: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  error: string | null;
  placeholder?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  submitButtonText?: string;
  loadingButtonText?: string;
}

export default function ChatInput({
  onSubmit,
  input,
  setInput,
  onChange,
  isLoading,
  error,
  placeholder = "Type a message...",
  selectedModel,
  onModelChange,
  disabled = false,
  submitButtonText = "Send",
  loadingButtonText = "Creating..."
}: ChatInputProps) {
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const { models: catalogModels, loading: modelsLoading } = useModelCatalog();
  const models = catalogModels.length > 0 ? catalogModels : [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSubmit(input.trim());
    setInput?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="backdrop-blur-sm max-w-3xl bg-sage-2 border border-sage-3 rounded-xl mx-auto overflow-hidden">
      {error && (
        <div className="px-4 py-2 text-sm text-red-500 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      <div className="flex flex-row">
        <textarea
          ref={messageInputRef}
          className="w-full bg-transparent outline-none p-4 text-sm resize-none min-h-[60px] max-h-[200px] text-sage-12 placeholder:text-sage-11"
          placeholder={placeholder}
          value={input}
          onChange={onChange || ((e) => setInput?.(e.target.value))}
          onKeyDown={handleKeyDown}
          disabled={isLoading || disabled}
          rows={1}
        />
      </div>
      <div className="flex flex-row p-2 pb-2 justify-between items-center border-t border-sage-3 overflow-hidden">
        <div className="flex items-center gap-4">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-sm bg-sage-3 text-sage-12 border border-sage-4 rounded-md px-2 py-1 outline-none hover:bg-sage-4 transition-colors"
            disabled={isLoading || modelsLoading || models.length === 0}
          >
            {modelsLoading && models.length === 0 && (
              <option value="">Loading models...</option>
            )}
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
            {!modelsLoading && models.length === 0 && (
              <option value="">No models available</option>
            )}
          </select>
        </div>

        <Button
          href=""
          onClick={(e) => {
            e.preventDefault();
            if (!disabled && !isLoading) {
              onSubmit(input.trim());
              setInput?.("");
            }
          }}
          size="small"
          className="ml-4 bg-sage-3 hover:bg-sage-4 text-sage-12 border border-sage-4 transition-colors"
          disabled={isLoading || !input.trim() || disabled}
        >
          {isLoading ? loadingButtonText : submitButtonText}
        </Button>
      </div>
    </div>
  );
} 