"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";

interface ModalContextType {
  showModal: (
    content: ReactNode,
    size?: "content" | "small" | "medium" | "large"
  ) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  const [modalSize, setModalSize] = useState<
    "content" | "small" | "medium" | "large"
  >("content");

  const showModal = useCallback(
    (
      content: ReactNode,
      size: "content" | "small" | "medium" | "large" = "content"
    ) => {
      setModalContent(content);
      setModalSize(size);
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalContent(null);
  }, []);

  const value = useMemo(
    () => ({ showModal, closeModal }),
    [showModal, closeModal]
  );

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalContent) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [modalContent]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {modalContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 px-2 z-50 flex justify-center items-start bg-gray-scale-1/80 dark:bg-black/80 overflow-y-auto py-24 scrollbar-hide"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 1, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1, opacity: 0, y: 10 }}
              className={`bg-white dark:bg-gray-scale-1 border border-gray-scale-3 dark:border-gray-scale-2 rounded-xl better-shadow-md max-w-xl w-full ${
                modalSize == "content" ? "h-fit" : "h-3/4"
              } overflow-hidden flex flex-col shrink-0`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full overflow-y-auto">{modalContent}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
