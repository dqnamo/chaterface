import { useModal } from "../providers/ModalProvider";
import { useEffect } from "react";
import Image from "next/image";
import { Varela_Round } from "next/font/google";
import { GithubLogoIcon } from "@phosphor-icons/react";

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: ["400"],
});

export default function WelcomeModal() {
  const { closeModal } = useModal();

  const handleClose = () => {
    localStorage.setItem("hasSeenWelcomeModal", "true");
    closeModal();
  };

  return (
    <div className="flex flex-col h-max w-full p-6">
      <div className="flex flex-row items-center gap-1">
        <Image
          src="/white-logomark.svg"
          alt="Logo"
          width={20}
          height={20}
          className="w-6 h-6"
        />
        <h1 className={`text-md font-medium text-gray-12`}>chaterface</h1>
      </div>
      <p className="text-gray-11 text-sm mt-4">
        A beautiful open-source chat interface for intelligence. Access over 300
        models, powered by OpenRouter.
      </p>

      <div className="flex flex-row items-center gap-2 mt-8">
        <button
          className="bg-gray-4 border border-gray-6 rounded-lg w-max px-3 py-1.5 cursor-pointer hover:bg-gray-5 transition-colors duration-200 hover:border-gray-7"
          onClick={handleClose}
        >
          <p className="text-gray-12 text-sm font-medium">Get Started</p>
        </button>
        <div
          className="flex flex-row items-center  bg-gray-2 overflow-hidden rounded-lg w-max border border-gray-5 hover:border-gray-6 transition-colors duration-200 group cursor-pointer"
          onClick={() =>
            window.open("https://github.com/dqnamo/chaterface", "_blank")
          }
        >
          <div className="p-2 flex items-center justify-center bg-gray-3 w-8 h-8">
            <GithubLogoIcon
              size={16}
              weight="bold"
              className="text-gray-11 group-hover:text-gray-12 transition-colors duration-200"
            />
          </div>
          <div className="flex flex-col bg-gray-2 px-2">
            <p className="text-gray-11 text-sm font-medium">30</p>
          </div>
        </div>
      </div>
    </div>
  );
}
