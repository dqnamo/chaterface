import { cn } from "@/helpers/classname-helper";

type ButtonSharedProps = {
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
};

type ButtonProps =
  | (ButtonSharedProps & React.ComponentPropsWithoutRef<"button">)
  | (ButtonSharedProps &
      React.ComponentPropsWithoutRef<"a"> & {
        href: string;
      });

export default function Button(props: ButtonProps) {
  const { variant = "primary", className } = props;
  const baseClasses =
    "cursor-pointer flex flex-row px-2 gap-1.5 py-1 text-sm font-medium rounded-lg transition-colors border border-b-2 text-grayscale-11";

  const variantClasses = {
    primary:
      "bg-grayscale-12  dark:bg-grayscale-5 dark:hover:bg-grayscale-6 dark:hover:border-grayscale-7 border-black dark:border-grayscale-6 rounded-lg text-grayscale-2 dark:text-grayscale-11",
    secondary:
      "bg-white hover:bg-grayscale-2 hover:border-grayscale-4 dark:hover:bg-grayscale-4 dark:hover:border-grayscale-5 dark:bg-grayscale-3 border-grayscale-3 dark:border-grayscale-4 rounded-lg",
  };

  const classes = cn(baseClasses, variantClasses[variant], className);

  if ("href" in props) {
    const {
      variant: _variant,
      className: _className,
      children,
      ...anchorProps
    } = props;

    return (
      <a className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const {
    variant: _variant,
    className: _className,
    children,
    ...buttonProps
  } = props;

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
