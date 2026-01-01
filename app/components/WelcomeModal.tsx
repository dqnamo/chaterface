import { useModal } from "../providers/ModalProvider";
import Image from "next/image";
import { Varela_Round } from "next/font/google";
import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CodeIcon,
  CommandIcon,
  CursorClickIcon,
  DevicesIcon,
  FingerprintIcon,
  GithubLogoIcon,
  GlobeIcon,
  HeadCircuitIcon,
  KeyIcon,
  LockIcon,
  MarkdownLogoIcon,
  PaletteIcon,
  SpeedometerIcon,
} from "@phosphor-icons/react";
import DqnamoSignature from "./DqnamoSignature";
import Button from "./ui/Button";

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: ["400"],
});

export default function WelcomeModal() {
  const { closeModal } = useModal();
  const [fullyExpanded, setFullyExpanded] = useState(false);

  const handleClose = () => {
    localStorage.setItem("hasSeenWelcomeModal", "true");
    closeModal();
  };

  return (
    <motion.div
      layout
      initial={{ height: "70vh" }}
      animate={{
        height: fullyExpanded ? "auto" : "70vh",
      }}
      className={`flex flex-col w-full relative ${varelaRound.variable}`}
    >
      <div
        className={`w-full bg-linear-to-t from-white via-white/80 dark:from-gray-scale-1 dark:via-gray-scale-1/80 to-transparent absolute bottom-0 left-0 flex flex-row items-end pb-8 pt-28 justify-center gap-2 z-50 transition-all duration-500 ${
          fullyExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Button
          variant="secondary"
          onClick={() => setFullyExpanded(true)}
          className="bg-white border-gray-scale-4 shadow-xs dark:border-gray-scale-6 dark:bg-gray-scale-4"
        >
          <span className="text-sm font-medium">Learn More</span>
          <ArrowDownIcon
            size={14}
            weight="bold"
            className="text-gray-scale-12"
          />
        </Button>
        <Button variant="primary" onClick={handleClose} className="shadow-xs">
          <span className="text-sm font-medium">Get Started</span>
          <ArrowRightIcon
            size={14}
            weight="bold"
            className="text-gray-scale-2 dark:text-gray-scale-12"
          />
        </Button>
      </div>

      <div
        className={`flex-1 p-1  ${
          fullyExpanded ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        <div
          className="relative bg-gray-scale-2 shrink-0 rounded-lg px-10 py-20 flex flex-col items-center justify-center"
          style={{
            backgroundImage: "url('/hand.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-radial from-white/80 dark:from-black/70 via-white/50 dark:via-black/40 to-transparent"></div>
          <div className="flex flex-row items-center gap-1 z-50">
            <Image
              src="/white-logomark.svg"
              alt="Logo"
              width={20}
              height={20}
              className="w-8 h-8 invert dark:invert-0"
            />
            <h1
              className={`text-lg font-medium text-gray-scale-12 dark:text-gray-scale-12`}
            >
              chaterface
            </h1>
          </div>
          <p className="text-gray-scale-11 z-50 font-medium text-sm mt-4">
            Your Interface to Intelligence
          </p>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 space-x-4 space-y-8 mt-4">
            <FeatureItem
              icon={
                <CodeIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Open Source"
              description="Fully open source with an MIT license."
            >
              <div
                className="mt-2 flex flex-row items-center  bg-gray-scale-2 overflow-hidden rounded-lg w-max border border-gray-scale-5 hover:border-gray-scale-6 transition-colors duration-200 group cursor-pointer"
                onClick={() =>
                  window.open("https://github.com/dqnamo/chaterface", "_blank")
                }
              >
                <div className="p-1 flex items-center justify-center bg-gray-scale-3 w-7 h-7">
                  <GithubLogoIcon
                    size={14}
                    weight="bold"
                    className="text-gray-scale-11 group-hover:text-gray-scale-12 transition-colors duration-200"
                  />
                </div>
                <div className="flex flex-col bg-gray-scale-2 px-2">
                  <p className="text-gray-scale-11 text-xs font-medium">30</p>
                </div>
              </div>
            </FeatureItem>

            <FeatureItem
              icon={
                <LockIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Secure & Private"
              description="All your data is stored locally unless you choose to enable cloud sync."
            />

            <FeatureItem
              icon={
                <HeadCircuitIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="300+ Models"
              description="Access over 300 models, powered by your own OpenRouter API key."
            />
            <FeatureItem
              icon={
                <SpeedometerIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Super Fast"
              description="Local first architecture for maximum speed and privacy."
            />

            <FeatureItem
              icon={
                <DevicesIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="PWA Support"
              description="Installable as a PWA for great UX on mobile."
            />

            <FeatureItem
              icon={
                <KeyIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="BYOK"
              description="Bring your own API key so you only pay for what you use."
            />

            <FeatureItem
              icon={
                <MarkdownLogoIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Great Markdown Support"
              description="Beautiful markdown support including code blocks, tables, and more."
            />

            <FeatureItem
              icon={
                <PaletteIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Beautiful UI"
              description="Beautiful UI with a focus on minimalism and ease of use."
            />

            <FeatureItem
              icon={
                <GlobeIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Universal Web Search"
              description="Search the web with every single model regardless of native support."
            />

            <FeatureItem
              icon={
                <FingerprintIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Encrypted Cloud Sync"
              description="Sync your data across devices with E2EE encryption."
            />

            <FeatureItem
              icon={
                <CommandIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="Keyboard Shortcuts"
              description="Keyboard shortcuts for power users so you can move faster."
            />

            <FeatureItem
              icon={
                <CursorClickIcon
                  size={16}
                  weight="bold"
                  className="text-gray-scale-11"
                />
              }
              title="One Click Self Hosting"
              description="One click self hosting for most major PaaS providers."
            >
              <p
                className="text-gray-scale-11 text-sm underline underline-offset-2"
                onClick={() =>
                  window.open("https://github.com/dqnamo/chaterface", "_blank")
                }
              >
                Learn more
              </p>
            </FeatureItem>
          </div>
        </div>
        {fullyExpanded && (
          <div className="bg-gray-scale-2  rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-gray-scale-11 text-xs">Built with love by</p>
              <DqnamoSignature className="text-gray-scale-11 text-3xl" />
            </div>
            <div className="flex flex-wrap items-center md:justify-center gap-2">
              <Button
                variant="secondary"
                className="bg-white dark:bg-gray-scale-4"
              >
                <span className="text-gray-scale-11 text-xs font-medium">
                  Email me
                </span>
              </Button>
              <Button
                variant="secondary"
                className="bg-white dark:bg-gray-scale-4"
                onClick={() =>
                  window.open("https://github.com/dqnamo/chaterface", "_blank")
                }
              >
                <span className="text-gray-scale-11 text-xs font-medium">
                  Github Repo
                </span>
              </Button>

              <Button variant="primary" onClick={handleClose}>
                <span className="text-xs font-medium">Get Started</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {icon}
      <p className="text-gray-scale-12 font-medium text-sm mt-1">{title}</p>
      <p className="text-gray-scale-11 text-sm">{description}</p>
      {children}
    </div>
  );
}
