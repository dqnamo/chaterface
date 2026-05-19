"use client";

import CodeBlock from "@/components/CodeBlock";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import { Tabs } from "@/components/public/Tabs";
import type { CodeLine } from "@/helpers/syntax";

type PreviewTab = {
  value: string;
  label: string;
  content: React.ReactNode;
};

export type ComponentShowcaseProps = {
  title: string;
  previewTabs: PreviewTab[];
  usageCodeLines: CodeLine[];
  componentCodeLines: CodeLine[];
};

export default function ComponentShowcase({
  title,
  previewTabs,
  usageCodeLines,
  componentCodeLines,
}: ComponentShowcaseProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-px p-2">
        <h2 className="font-medium text-sm text-grayscale-10">{title}</h2>
      </div>
      <Card className="mt-2 h-80 overflow-hidden">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-1.5 lg:grid-cols-2">
          <div className="small-shadow flex min-h-0 flex-col rounded-lg border border-grayscale-3 bg-grayscale-1">
            <Tabs.Root
              className="flex flex-1 flex-col"
              defaultValue={previewTabs[0]?.value}
            >
              <div className="flex flex-row gap-2 p-2 border-b border-grayscale-2 justify-between items-center">
                <Tabs.List>
                  {previewTabs.map((tab) => (
                    <Tabs.Tab key={tab.value} value={tab.value}>
                      {tab.label}
                    </Tabs.Tab>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>
              </div>
              <div className="flex flex-1 flex-row items-center justify-center gap-2 p-8">
                {previewTabs.map((tab) => (
                  <Tabs.Panel
                    key={tab.value}
                    value={tab.value}
                    className="mt-0"
                  >
                    <div className="flex justify-center items-center h-full w-full">
                      {tab.content}
                    </div>
                  </Tabs.Panel>
                ))}
              </div>
            </Tabs.Root>
          </div>
          <div className="small-shadow flex min-h-0 flex-col overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1">
            <Tabs.Root
              className="flex min-h-0 flex-1 flex-col"
              defaultValue="usage"
            >
              <div className="flex flex-row gap-2 p-2 border-b border-grayscale-2 justify-between items-center">
                <Tabs.List>
                  <Tabs.Tab value="usage">Usage</Tabs.Tab>
                  <Tabs.Tab value="component">Component</Tabs.Tab>
                  <Tabs.Indicator />
                </Tabs.List>
                <Button variant="secondary" className="text-xs">
                  Copy
                </Button>
              </div>
              <Tabs.Panel
                value="usage"
                className="mt-0 flex min-h-0 flex-1 flex-col"
              >
                <CodeBlock lines={usageCodeLines} />
              </Tabs.Panel>
              <Tabs.Panel
                value="component"
                className="mt-0 flex min-h-0 flex-1 flex-col"
              >
                <CodeBlock lines={componentCodeLines} />
              </Tabs.Panel>
            </Tabs.Root>
          </div>
        </div>
      </Card>
    </div>
  );
}
