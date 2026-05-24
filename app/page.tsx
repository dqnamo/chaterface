import {
  ArrowRightIcon,
  CheckCircleIcon,
  GithubLogoIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/Footer";
import Logo from "@/components/Logo";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";

export default function Home() {
  return (
    <main className="flex w-full flex-col divide-y divide-grayscale-3 dark:divide-grayscale-2">
      <MobileHeader />

      <div className="relative mx-auto max-w-4xl flex w-full flex-col border-x border-grayscale-3 p-4 pt-[4.5rem] dark:border-grayscale-2 md:p-8 lg:p-16">
        <div className="flex flex-col gap-px p-2">
          <Logo />
          <p className="max-w-md text-balance text-sm leading-6 text-grayscale-11">
            Open source, collaborative software factory running in the cloud
            using your existing coding agents.
          </p>
          <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
            <Button className="text-xs" href="/login" variant="primary">
              <RocketLaunchIcon size={16} weight="bold" />
              Get Started
            </Button>
            <Button
              className="text-xs"
              href="https://github.com/dqnamo/factoryplane"
              target="_blank"
              variant="secondary"
            >
              <GithubLogoIcon size={16} weight="bold" />
              Github Repo
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <div className="flex flex-col gap-px p-2">
            <h2 className="font-medium text-grayscale-12">Pricing & Plans</h2>
            <p className="text-sm text-grayscale-11">Get started for free.</p>
          </div>

          <Card
            layer={0}
            className="p-1.5 grid grid-cols-3 gap-1.5 rounded-[16px]"
          >
            <Card
              layer={0}
              className="p-0 bg-grayscale-1 dark:bg-grayscale-3 dark:border-grayscale-5 rounded-[13px] small-shadow"
            >
              <div className="flex flex-col h-full">
                <div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
                  <p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
                    Open source
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-medium text-grayscale-12">
                      Free
                    </h3>
                    <p className="text-xs text-grayscale-10">Forever</p>
                  </div>
                  <p className="text-sm text-grayscale-10 mt-4">
                    Run it yourself on your own infrastructure.
                  </p>
                </div>
                <div className="flex flex-row p-2 mt-auto w-full">
                  <Button
                    className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
                    href="https://github.com/dqnamo/factoryplane"
                    target="_blank"
                    variant="secondary"
                  >
                    View on GitHub
                    <ArrowRightIcon size={14} weight="bold" />
                  </Button>
                </div>
              </div>
            </Card>
            <Card
              layer={0}
              className="p-0 bg-grayscale-1 dark:bg-grayscale-3 dark:border-grayscale-5 dark:divide-grayscale-4 col-span-2 grid grid-cols-2 divide-x divide-grayscale-3 rounded-[13px] small-shadow"
            >
              <div className="flex flex-col">
                <div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
                  <p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
                    Basic
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-medium text-grayscale-12">
                      Free
                    </h3>
                    <p className="text-xs text-grayscale-10">Forever</p>
                  </div>

                  <div className="flex flex-col mt-4 w-full gap-1">
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">
                        Bring your own agents
                      </p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9"
                      />
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">3 supervisors</p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9"
                      />
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">
                        Unlimited workers
                      </p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9 "
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-row p-2 w-full mt-auto">
                  <Button
                    className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
                    href="/login"
                    variant="secondary"
                  >
                    Get Started
                    <ArrowRightIcon size={14} weight="bold" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="p-2 px-4 border-b border-grayscale-3 dark:border-grayscale-4">
                  <p className="text-tiny font-mono uppercase tracking-wide font-bold text-grayscale-9">
                    Pro
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-medium text-grayscale-12">
                      US$15
                    </h3>
                    <p className="text-xs text-grayscale-10">Per user/month</p>
                  </div>

                  <div className="flex flex-col mt-4 w-full gap-1">
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">
                        Bring your own agents
                      </p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9"
                      />
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">
                        Unlimited supervisors
                      </p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9"
                      />
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-sm text-grayscale-10">
                        Unlimited workers
                      </p>
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        className="text-accent-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-row p-2 w-full mt-auto">
                  <Button
                    className="text-xs px-2 w-full flex flex-row items-center justify-between dark:bg-grayscale-6 dark:border-grayscale-7 dark:hover:bg-grayscale-7 dark:hover:border-grayscale-8"
                    href="/login"
                    variant="secondary"
                  >
                    Start 7-day free trial
                    <ArrowRightIcon size={14} weight="bold" />
                  </Button>
                </div>
              </div>
            </Card>
          </Card>
        </div>

        <Footer className="p-2 mt-8" />
      </div>
    </main>
  );
}
