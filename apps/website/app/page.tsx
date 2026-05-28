import {
  ArrowRightIcon,
  ChatsTeardropIcon,
  CheckCircleIcon,
  DesktopTowerIcon,
  FadersIcon,
  FilesIcon,
  GithubLogoIcon,
  PlugsConnectedIcon,
  RocketLaunchIcon,
  TextboxIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/Footer";
import Logo from "@/components/Logo";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";

const featureCards = [
  {
    description:
      "Spin up a dedicated cloud worker for every prompt — including queued follow-ups and long-running jobs.",
    icon: <RocketLaunchIcon size={18} weight="bold" />,
    iconClassName: "text-accent-11",
    title: "Cloud workers",
  },
  {
    description:
      "Invite supervisors into the same factory so product, engineering, and ops can steer the work together.",
    icon: <UsersThreeIcon size={18} weight="bold" />,
    iconClassName: "text-green-11",
    title: "Shared supervision",
  },
  {
    description:
      "Plug in MCP servers and external tools without rebuilding your agent environment from scratch.",
    icon: <PlugsConnectedIcon size={18} weight="bold" />,
    iconClassName: "text-cyan-11",
    title: "Tool integrations",
  },
  {
    description:
      "Install reusable skills onto the factory computer so the workflows you run again and again just work.",
    icon: <FilesIcon size={18} weight="bold" />,
    iconClassName: "text-orange-11",
    title: "Skills library",
  },
  {
    description:
      "Store secrets at the factory level so every worker in the factory can use them securely.",
    icon: <TextboxIcon size={18} weight="bold" />,
    iconClassName: "text-crimson-11",
    title: "Secret handling",
  },
  {
    description:
      "Point workers at your repos and Git credentials so their changes can land cleanly.",
    icon: <GithubLogoIcon size={18} weight="bold" />,
    iconClassName: "text-grayscale-11",
    title: "GitHub setup",
  },
];

export default function Home() {
  return (
    <main className="flex w-full flex-col divide-y divide-grayscale-3 dark:divide-grayscale-2">
      <MobileHeader />

      <div className="relative mx-auto max-w-4xl flex w-full flex-col border-x border-grayscale-3 p-4 pt-[4.5rem] dark:border-grayscale-2 md:p-8 lg:p-10">
        <div className="flex flex-col gap-px p-2">
          <div className="flex flex-row items-center gap-2">
            <Logo className="size-9 rounded-md" />
            <p className="text-md font-medium leading-6 text-grayscale-12">
              FactoryPlane
            </p>
          </div>
          <p className="max-w-lg text-balance text-lg font-medium leading-6 text-grayscale-12 mt-8">
            Open source, collaborative software factory running in the cloud
            using your existing coding agents.
          </p>
          <p className="max-w-lg text-balance text-sm leading-6 text-grayscale-11 mt-1">
            Spin up workers in the cloud, invite supervisors, and steer the work
            together — all from one place.
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
              GitHub repo
            </Button>
          </div>
        </div>

        <FactoryDesktopPreview />
        <FeatureGrid />

        <div className="mt-8 flex flex-col gap-2">
          <div className="flex flex-col gap-px p-2">
            <h2 className="font-medium text-grayscale-12">Pricing & plans</h2>
            <p className="text-sm text-grayscale-11">
              Start free — self-host or use the hosted basic plan. No card
              required.
            </p>
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

function FactoryDesktopPreview() {
  return (
    <section className="mt-8">
      <div
        aria-label="Factory platform desktop UI preview"
        className="small-shadow overflow-x-auto rounded-[16px] border border-grayscale-3 bg-grayscale-2 p-1.5 dark:border-grayscale-4 dark:bg-grayscale-3"
        role="img"
      >
        <div className="flex h-[330px] min-w-[700px] overflow-hidden rounded-[13px] border border-grayscale-3 bg-grayscale-1 text-[11px] text-grayscale-12 leading-4 dark:border-grayscale-4">
          <aside className="flex w-12 shrink-0 flex-col justify-between border-grayscale-3 border-r p-1.5 dark:border-grayscale-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 dark:border-grayscale-4 dark:bg-grayscale-3">
                <span className="text-sm">+</span>
              </div>
              <div className="relative flex size-9 items-center justify-center rounded-lg bg-orange-9 font-semibold text-[11px] text-white">
                FP
                <span className="-right-1 -top-1 absolute flex size-4 items-center justify-center rounded-md border-2 border-grayscale-1 bg-blue-9 font-mono text-[10px]">
                  3
                </span>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-9 font-semibold text-[11px] text-white opacity-60">
                DX
              </div>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-grayscale-3 font-semibold text-[10px] text-grayscale-11">
              JP
            </div>
          </aside>

          <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-grayscale-3 border-r p-1.5 dark:border-grayscale-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-grayscale-3 text-grayscale-12">
              <ChatsTeardropIcon size={16} weight="bold" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg text-grayscale-11">
              <UsersThreeIcon size={16} weight="bold" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg text-grayscale-11">
              <DesktopTowerIcon size={16} weight="bold" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg text-grayscale-11">
              <FadersIcon size={16} weight="bold" />
            </span>
          </aside>

          <aside className="flex w-52 shrink-0 flex-col border-grayscale-3 border-r p-1.5 dark:border-grayscale-4">
            <div className="rounded-lg border border-black bg-grayscale-12 px-2 py-1.5 font-medium text-grayscale-2 text-xs dark:border-grayscale-6 dark:bg-grayscale-5 dark:text-grayscale-11">
              New worker
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between px-2 pb-1 font-mono font-semibold text-[10px] text-grayscale-10 uppercase">
                <span>Active workers</span>
                <span>3</span>
              </div>
              <div className="flex flex-col gap-px">
                <PreviewWorker
                  active
                  age="2m ago"
                  name="Ship settings page"
                  status="running"
                />
                <PreviewWorker
                  age="18m ago"
                  name="Add billing webhook tests"
                  status="idle"
                />
                <PreviewWorker
                  age="44m ago"
                  name="Review MCP scopes"
                  status="queued"
                />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between px-2 pb-1 font-mono font-semibold text-[10px] text-grayscale-10 uppercase">
                <span>Retired workers</span>
                <span>1</span>
              </div>
              <PreviewWorker
                age="Yesterday"
                name="Prototype login flow"
                status="retired"
              />
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 items-center justify-center px-6 py-5">
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <div className="flex flex-col items-center">
                <Logo className="size-8" />
                <h3 className="mt-3 font-medium text-grayscale-12 text-sm">
                  Spawn a new worker
                </h3>
                <p className="max-w-64 text-center text-[11px] text-grayscale-11 leading-4">
                  Describe the task and a fresh worker will be spawned in the
                  factory to do it.
                </p>
              </div>

              <div className="small-shadow w-full overflow-hidden rounded-xl border border-grayscale-3 bg-white dark:border-grayscale-4 dark:bg-grayscale-2">
                <div className="min-h-20 p-3 text-[11px] text-grayscale-10 leading-4">
                  Build the new homepage preview and feature grid, then verify
                  it on mobile and desktop.
                </div>
                <div className="flex items-center justify-between border-grayscale-3 border-t p-2 dark:border-grayscale-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-grayscale-3 bg-white px-2 py-1 text-[10px] text-grayscale-11 dark:border-grayscale-4 dark:bg-grayscale-3">
                      Attach image
                    </span>
                    <span className="rounded-lg bg-grayscale-3 px-2 py-1 font-mono text-grayscale-10 text-[10px] uppercase">
                      Codex
                    </span>
                  </div>
                  <span className="rounded-lg bg-grayscale-12 px-2 py-1 font-medium text-[10px] text-grayscale-2 dark:bg-grayscale-5 dark:text-grayscale-11">
                    Start worker
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function PreviewWorker({
  active = false,
  age,
  name,
  status,
}: {
  active?: boolean;
  age: string;
  name: string;
  status: "idle" | "queued" | "retired" | "running";
}) {
  const statusClasses = {
    idle: "bg-green-9",
    queued: "bg-amber-9",
    retired: "bg-grayscale-8",
    running: "bg-blue-9",
  };

  return (
    <div className={`rounded-lg p-2 ${active ? "bg-grayscale-3" : ""}`}>
      <span className="flex min-w-0 items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate">{name}</span>
          <span className="block truncate text-[10px] text-grayscale-10">
            {age}
          </span>
        </span>
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${statusClasses[status]}`}
        />
      </span>
    </div>
  );
}

function FeatureGrid() {
  return (
    <section className="mt-8">
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
        {featureCards.map((feature) => (
          <div
            className="flex flex-col items-start gap-2 p-2"
            key={feature.title}
          >
            <div className={feature.iconClassName}>{feature.icon}</div>
            <div>
              <h3 className="font-medium text-grayscale-12 text-sm">
                {feature.title}
              </h3>
              <p className="mt-1 text-grayscale-11 text-sm leading-5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
