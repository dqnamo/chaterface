"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/helpers/classname-helper";

const Root = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseSwitch.Root>) => (
  <BaseSwitch.Root
    className={cn(
      "relative flex h-4 w-7 rounded-full border border-grayscale-6 data-[checked]:border-accent-10 bg-grayscale-5 p-px transition-[background-color,opacity] duration-150 data-[checked]:bg-accent-9 dark:border-grayscale-5 dark:bg-grayscale-4 dark:data-[checked]:bg-accent-9",
      className,
    )}
    {...props}
  />
);

const Thumb = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseSwitch.Thumb>) => (
  <BaseSwitch.Thumb
    className={cn(
      "aspect-square h-full rounded-full bg-grayscale-1 data-[checked]:bg-accent-4 dark:data-[checked]:bg-accent-12 shadow-sm transition-transform duration-150 data-[checked]:translate-x-3 dark:bg-grayscale-10",
      className,
    )}
    {...props}
  />
);

export const Switch = {
  Composed: ({
    size = 16,
    ...props
  }: { size?: number } & React.ComponentProps<typeof BaseSwitch.Root>) => {
    const thumbSize = size;
    const rootWidth = size * 1.75;
    const difference = rootWidth - thumbSize;

    return (
      <Root {...props} style={{ width: rootWidth, height: thumbSize }}>
        <Thumb
          style={
            { "--switch-offset": `${difference}px` } as React.CSSProperties
          }
          className="data-[checked]:translate-x-[var(--switch-offset)]"
        />
      </Root>
    );
  },
  Root,
  Thumb,
};
