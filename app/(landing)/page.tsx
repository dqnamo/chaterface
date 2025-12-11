import Image from "next/image";
import Link from "next/link";
import GameOfLife from "../components/GameOfLife";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto border-x border-gray-3 border-dashed min-h-dvh">
      {/* Header */}
      <div className="flex flex-col overflow-hidden h-dvh relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-950 to-transparent h-full w-full z-40" />
        <GameOfLife />
        <div className="relative z-50">
          <div className="flex flex-row items-center justify-center my-8">
            <Link
              href="/"
              className="flex flex-row items-center justify-center relative z-10"
            >
              <Image
                src="/white-logomark.svg"
                alt="Logo"
                width={24}
                height={24}
                className="hidden dark:block"
              />
              <Image
                src="/black-logomark.svg"
                alt="Logo"
                width={24}
                height={24}
                className="block dark:hidden"
              />
              <h1 className="text-xl font-medium text-gray-12">Chaterface</h1>
            </Link>
            <div className="flex flex-row border border-gray-3 divide-x divide-gray-3 ml-2 mt-1">
              <p className="text-gray-10 text-sm px-2 bg-gray-2 h-full py-1 flex items-center justify-center">
                <GithubLogoIcon weight="bold" className="text-gray-10" />
              </p>
              <p className="text-gray-10 text-sm px-2 bg-gray-1 flex items-center justify-center">
                30
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 px-8 py-8 relative z-10">
            <h1 className="text-4xl font-semibold text-gray-12 mt-8 max-w-md text-center">
              Open Source Chat Interface to Inteligence.
            </h1>
            <p className="text-gray-10 text-sm max-w-md text-center">
              A beautiful and fast chat interface that can connect to over 100
              AI models. Powered by Next.js, InstantDB and OpenRouter.
            </p>
            <div className="flex flex-row items-center gap-4 mt-4">
              <p className="text-gray-12 hover:bg-sky-4 hover:text-sky-9 text-sm font-medium bg-gray-5/50 group-hover:text-gray-2 transition-all duration-300">
                View Code
              </p>
              {/* <p className="text-gray-9 bg-gray-4/50 text-sm font-medium group-hover:text-gray-2 transition-all duration-300">
                How do I self host?
              </p> */}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 px-16 w-3/4 mx-auto bg-gray-1 border border-gray-2 h-96 mt-auto relative z-10 rounded-t-xl z-50"></div>
      </div>

      {/* Main */}
      {/* <div className="flex flex-col items-start border-t border-gray-3 pt-2 border-dashed">
        <div className="flex flex-col p-16">
          <h2 className="text-xl font-medium text-gray-12">
            Self Hosting Guide
          </h2>
          <p className="text-gray-10 text-sm">
            Get started with running your own chaterface in under 5 minutes.
          </p>
        </div>
      </div> */}
    </div>
  );
}
