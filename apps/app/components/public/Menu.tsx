import { Menu as BaseMenu } from "@base-ui/react/menu";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/helpers/classname-helper";

type MenuComposedProps = Omit<
  React.ComponentProps<typeof BaseMenu.Root>,
  "children"
> & {
  trigger: React.ReactNode;
  children: React.ReactNode;
  showArrow?: boolean;
  triggerProps?: React.ComponentProps<typeof BaseMenu.Trigger>;
  positionerProps?: React.ComponentProps<typeof BaseMenu.Positioner>;
  popupProps?: React.ComponentProps<typeof BaseMenu.Popup>;
  viewportProps?: React.ComponentProps<typeof BaseMenu.Viewport>;
};

const Root = (props: React.ComponentProps<typeof BaseMenu.Root>) => (
  <BaseMenu.Root {...props} />
);

const Trigger = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger>) => (
  <BaseMenu.Trigger
    className={cn(
      "flex cursor-pointer flex-row items-center gap-1.5 rounded-lg border border-b-2 border-grayscale-3 bg-white px-2 py-1 text-sm font-medium text-grayscale-11 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 data-[popup-open]:border-grayscale-4 data-[popup-open]:bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-4 dark:data-[popup-open]:border-grayscale-5 dark:data-[popup-open]:bg-grayscale-4",
      className,
    )}
    {...props}
  />
);

const Portal = (props: React.ComponentProps<typeof BaseMenu.Portal>) => (
  <BaseMenu.Portal {...props} />
);

const Backdrop = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Backdrop>) => (
  <BaseMenu.Backdrop className={cn("fixed inset-0", className)} {...props} />
);

const Positioner = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Positioner>) => (
  <BaseMenu.Positioner
    className={cn("z-50 outline-none", className)}
    {...props}
  />
);

const Popup = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup>) => (
  <BaseMenu.Popup
    className={cn(
      "min-w-40 origin-[var(--transform-origin)] rounded-lg border border-grayscale-3 bg-white dark:bg-grayscale-2 p-1 small-shadow outline-none transition-[opacity,scale,transform] duration-100 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-grayscale-4",
      className,
    )}
    {...props}
  />
);

const Arrow = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Arrow>) => (
  <BaseMenu.Arrow
    className={cn(
      "size-2 rotate-45 border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2",
      className,
    )}
    {...props}
  />
);

const Viewport = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Viewport>) => (
  <BaseMenu.Viewport
    className={cn("flex flex-col gap-px", className)}
    {...props}
  />
);

const itemClasses =
  "flex min-h-7 cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-grayscale-11 outline-none data-[disabled]:pointer-events-none data-[disabled]:text-grayscale-8 data-[highlighted]:bg-grayscale-3 data-[highlighted]:text-grayscale-12 dark:data-[highlighted]:bg-grayscale-4";

const Item = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item>) => (
  <BaseMenu.Item className={cn(itemClasses, className)} {...props} />
);

const LinkItem = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.LinkItem>) => (
  <BaseMenu.LinkItem
    className={cn(itemClasses, "no-underline", className)}
    {...props}
  />
);

const Separator = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Separator>) => (
  <BaseMenu.Separator
    className={cn(
      "-mx-1 my-1 h-px bg-grayscale-3 dark:bg-grayscale-4",
      className,
    )}
    {...props}
  />
);

const Group = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Group>) => (
  <BaseMenu.Group
    className={cn("flex flex-col gap-px", className)}
    {...props}
  />
);

const GroupLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.GroupLabel>) => (
  <BaseMenu.GroupLabel
    className={cn(
      "px-2 pb-1 pt-1.5 text-grayscale-9 text-xs tracking-wide",
      className,
    )}
    {...props}
  />
);

const CheckboxItem = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.CheckboxItem>) => (
  <BaseMenu.CheckboxItem
    className={cn(itemClasses, "grid grid-cols-[1rem_1fr] pl-1.5", className)}
    {...props}
  />
);

const CheckboxItemIndicator = ({
  className,
  keepMounted = true,
  ...props
}: React.ComponentProps<typeof BaseMenu.CheckboxItemIndicator>) => (
  <BaseMenu.CheckboxItemIndicator
    keepMounted={keepMounted}
    className={cn(
      "flex size-4 items-center justify-center rounded border border-accent-8 bg-accent-3 text-accent-11 data-[unchecked]:opacity-0 before:size-1.5 before:rounded-[2px] before:bg-current before:content-['']",
      className,
    )}
    {...props}
  />
);

const RadioGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.RadioGroup>) => (
  <BaseMenu.RadioGroup
    className={cn("flex flex-col gap-px", className)}
    {...props}
  />
);

const RadioItem = ({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.RadioItem>) => (
  <BaseMenu.RadioItem
    className={cn(itemClasses, "grid grid-cols-[1rem_1fr] pl-1.5", className)}
    {...props}
  />
);

const RadioItemIndicator = ({
  className,
  keepMounted = true,
  ...props
}: React.ComponentProps<typeof BaseMenu.RadioItemIndicator>) => (
  <BaseMenu.RadioItemIndicator
    keepMounted={keepMounted}
    className={cn(
      "m-auto size-2 rounded-full bg-accent-10 data-[unchecked]:opacity-0",
      className,
    )}
    {...props}
  />
);

const SubmenuRoot = (
  props: React.ComponentProps<typeof BaseMenu.SubmenuRoot>,
) => <BaseMenu.SubmenuRoot {...props} />;

const SubmenuTrigger = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.SubmenuTrigger>) => (
  <BaseMenu.SubmenuTrigger
    className={cn(
      itemClasses,
      "grid grid-cols-[minmax(0,1fr)_auto_auto]",
      className,
    )}
    {...props}
  >
    {children}
    <CaretRight
      aria-hidden="true"
      className="text-grayscale-8"
      size={12}
      weight="bold"
    />
  </BaseMenu.SubmenuTrigger>
);

const Composed = ({
  trigger,
  children,
  modal = false,
  showArrow = true,
  triggerProps,
  positionerProps,
  popupProps,
  viewportProps,
  ...props
}: MenuComposedProps) => (
  <Root modal={modal} {...props}>
    <Trigger {...triggerProps}>{trigger}</Trigger>
    <Portal>
      <Positioner {...positionerProps}>
        <Popup {...popupProps}>
          {showArrow ? <Arrow /> : null}
          <Viewport {...viewportProps}>{children}</Viewport>
        </Popup>
      </Positioner>
    </Portal>
  </Root>
);

export const Menu = {
  Composed,
  Root,
  Trigger,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Viewport,
  Item,
  LinkItem,
  Separator,
  Group,
  GroupLabel,
  CheckboxItem,
  CheckboxItemIndicator,
  RadioGroup,
  RadioItem,
  RadioItemIndicator,
  SubmenuRoot,
  SubmenuTrigger,
  createHandle: BaseMenu.createHandle,
};
