"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useModal } from "../providers/ModalProvider";
import Image from "next/image";
import { GithubLogoIcon } from "@phosphor-icons/react";
import WelcomeModal from "./WelcomeModal";

export default function InfoBar() {
  const { showModal } = useModal();
  return (
    <div className="fixed h-max w-max max-w-72 flex flex-col max-h-dvh right-0 top-0 p-2 z-60 gap-2 ">
      <motion.div
        initial={false}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-1 bg-white dark:bg-gray-scale-2 shadow-subtle border border-gray-scale-3 rounded-lg flex flex-row items-center gap-1"
      >
        <div
          onClick={() => showModal(<WelcomeModal />)}
          className="p-1.5 hover:bg-gray-scale-3 dark:hover:bg-gray-scale-6 rounded-md group transition-all duration-200"
        >
          <Image
            src="/white-logomark.svg"
            alt="Github"
            width={16}
            height={16}
            className="invert dark:invert-0 opacity-80"
          />
        </div>
        <Link
          href="https://dqnamo.com"
          target="_blank"
          className="h-7 w-7 flex items-center justify-center hover:bg-gray-scale-3 dark:hover:bg-gray-scale-6 rounded-md group transition-all duration-200"
        >
          <p className="text-gray-scale-11 text-xl leading-none  font-pirata-one">
            d
          </p>
        </Link>
        <Link
          href="https://github.com/dqnamo/chaterface"
          target="_blank"
          type="button"
          className="p-1.5 hover:bg-gray-scale-3 dark:hover:bg-gray-scale-6 rounded-md group transition-all duration-200"
        >
          <GithubLogoIcon
            className="text-gray-scale-11 transition-colors group-hover:text-gray-scale-12"
            size={16}
            weight="bold"
          />
        </Link>
      </motion.div>
    </div>
  );
}
