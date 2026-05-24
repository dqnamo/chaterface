"use client";

import type { ReactNode } from "react";
import Card from "@/components/public/Card";
import { cn } from "@/helpers/classname-helper";

export function FactorySectionPageShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col p-2">
          <h1 className="font-medium text-grayscale-12">{title}</h1>
          <p className="text-grayscale-10 text-sm">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FactorySectionCard({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <Card
      layer={0}
      className={cn("w-full max-w-2xl gap-4 rounded-[16px] p-1.5", className)}
    >
      <Card
        layer={1}
        className={cn(
          "small-shadow w-full max-w-2xl gap-4 rounded-[13px] bg-grayscale-1 p-2 dark:bg-grayscale-2",
          innerClassName,
        )}
      >
        {children}
      </Card>
    </Card>
  );
}
