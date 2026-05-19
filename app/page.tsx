import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/Footer";
import Logo from "@/components/Logo";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";

export default function Home() {
  return (
    <main className="flex w-full flex-col divide-y divide-grayscale-3 dark:divide-grayscale-2">
      <MobileHeader />

      <div className="relative mx-auto max-w-4xl flex w-full flex-col border-x border-grayscale-3 p-4 pt-[4.5rem] dark:border-grayscale-2 md:p-8 lg:p-16">
        <div className="flex flex-col gap-px p-2">
          <Logo />
          <div className="mt-3 flex flex-row items-center gap-1">
            <h1 className="text-xl font-medium text-grayscale-12">
              FactoryPlane
            </h1>
          </div>
          <p className="max-w-md text-balance text-sm leading-6 text-grayscale-11">
            Cloud software factory using your existing coding agents.
          </p>
          <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
            <Button className="text-xs" href="/login" variant="primary">
              <RocketLaunchIcon size={16} weight="bold" />
              Get Started
            </Button>
          </div>
        </div>

        <Footer className="p-2 mt-8" />
      </div>
    </main>
  );
}
