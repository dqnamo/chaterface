import { useState, useRef, useEffect } from 'react';
import { 
  useFloating, 
  useInteractions,
  useClick,
  useDismiss,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingFocusManager
} from '@floating-ui/react';
import type { ModelSummary } from "@/constants/models";
import { useModelCatalog } from "@/lib/hooks/use-model-catalog";
import { motion } from "motion/react";
import { CaretDown, Sparkle } from "@phosphor-icons/react";
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';
import { useModal } from '@/providers/modal-provider';
import PlansModal from './modals/PlansModal';

interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export default function ModelSelector({ 
  selectedModel, 
  setSelectedModel 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { models: catalogModels, loading, error } = useModelCatalog();
  const [availableModels, setAvailableModels] = useState<ModelSummary[]>([]);
  const references = useRef<Array<HTMLElement | null>>([]);
  const {user, profile} = useAuth();
  const {showModal} = useModal();
  useEffect(() => {
    if (!catalogModels.length) {
      setAvailableModels([]);
      return;
    }

    const freeModels = catalogModels.filter((model) => model.free);
    const unlockedModels = catalogModels;
    const visibleModels = user && profile?.hasPurchasedCredits
      ? unlockedModels
      : freeModels.length > 0
        ? freeModels
        : unlockedModels;

    setAvailableModels(visibleModels);

    const preferredModel = visibleModels.find((model) => model.id === selectedModel)
      || unlockedModels.find((model) => model.id === selectedModel);

    if (!preferredModel && visibleModels[0]) {
      setSelectedModel(visibleModels[0].id);
    }
  }, [catalogModels, profile?.hasPurchasedCredits, selectedModel, setSelectedModel, user]);
  
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    placement: 'top-start',
    onOpenChange: setIsOpen,
    middleware: [
      offset(5),
      flip({ padding: 8 }),
      shift()
    ],
    whileElementsMounted: autoUpdate
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss
  ]);

  const selectedModelData = catalogModels.find(model => model.id === selectedModel) || availableModels[0] || catalogModels[0];

  const buttonLabel = (() => {
    if (loading && !selectedModelData) {
      return "Loading models...";
    }
    if (!selectedModelData) {
      return "Select a model";
    }
    return selectedModelData.name;
  })();

  return (
    <div>
      <button
        type="button"
        className="bg-gray-1 dark:bg-gray-3 px-2 py-1 text-base flex items-center gap-2 rounded-md border border-gray-3 dark:border-gray-5 hover:bg-gray-2 dark:hover:bg-gray-4 transition-colors cursor-pointer text-gray-10 dark:text-gray-11 disabled:opacity-60 disabled:cursor-not-allowed"
        ref={refs.setReference}
        {...getReferenceProps()}
        disabled={loading && !availableModels.length}
      >
        {buttonLabel}
        <CaretDown size={12} weight="bold" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white dark:bg-gray-3 shadow-md border border-gray-4 dark:border-gray-5 rounded-md z-50 max-w-xl overflow-hidden"
          >
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.15, staggerChildren: 0.04, staggerDirection: -1 }}
              className="divide-y divide-gray-4"
              variants={{
                open: { opacity: 1, y: 0 },
                closed: { opacity: 0, y: 10 }
              }}
            >
              {error && (
                <div className="px-3 py-3 text-xs text-red-11">
                  {error}
                </div>
              )}
              {!error && availableModels.length === 0 && !loading && (
                <div className="px-3 py-3 text-xs text-gray-11">
                  No models available.
                </div>
              )}
              {availableModels.map((model, index) => (
                <motion.button
                  type="button"
                  key={model.id}
                  ref={(node) => {
                    references.current[index] = node;
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-2 dark:hover:bg-gray-4 transition-colors flex flex-row items-center gap-4 justify-between ${
                    selectedModel === model.id ? 'bg-gray-2 dark:bg-gray-4 text-gray-12' : 'text-gray-11'
                  }`}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsOpen(false);
                  }}
                  variants={{
                    open: { opacity: 1, y: 0 },
                    closed: { opacity: 0, y: -10 }
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-row gap-2 items-center">
                      <p className="text-xs text-gray-12 font-medium">
                        {model.name}
                      </p>
                      {model.free && (
                        <div className="flex flex-row items-center gap-1 rounded-full px-2 py-0.5 bg-sage-3 text-sage-11">
                          <Sparkle size={12} weight="fill" className="text-sage-11" />
                          <p className="text-[10px] font-medium">Free</p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-10">
                      Provider: {model.provider}
                    </p>

                    {model.contextLength && (
                      <p className="text-[11px] text-gray-10">
                        Context length: {model.contextLength.toLocaleString()}
                      </p>
                    )}
                  </div>
                </motion.button>
              ))}

              {!profile?.hasPurchasedCredits && availableModels.length < catalogModels.length && (
                <div className="px-3 py-3 text-sm text-gray-11 hover:bg-gray-2 dark:hover:bg-gray-4 transition-colors cursor-pointer" onClick={() => {showModal(<PlansModal />)}}>
                  <p className="text-gray-12 font-medium text-xs">
                    Looking for more models?
                  </p>
                  <p className="text-gray-11 text-xs">
                    You need to purchase credits to unlock all models.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </FloatingFocusManager>
      )}
    </div>
  );
} 