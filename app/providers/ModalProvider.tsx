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

  const value = useMemo(
    () => ({ showModal, closeModal }),
    [showModal, closeModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {modalContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-center bg-white/80 dark:bg-black/80"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 1, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1, opacity: 0, y: 10 }}
              className={`bg-gray-1 border border-gray-3 dark:border-gray-2 rounded-xl better-shadow-md max-w-xl w-full ${
                modalSize == "content" ? "h-max mt-20" : "h-3/4 mt-10"
              } mx-4 overflow-hidden`}
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
