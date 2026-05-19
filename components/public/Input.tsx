import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/helpers/classname-helper";

export default function Input({
  variant = "default",
  className,
  ...props
}: React.ComponentProps<typeof BaseInput> & {
  variant?: "default" | "underline";
}) {
  const baseClasses =
    "p-2 border border-grayscale-3 outline-none focus:ring-0 focus:border-accent-9 text-sm";
  const defaultClasses = "rounded-lg ";
  const underlineClasses = "border-x-0 border-t-0";

  const finalClasses = cn(
    baseClasses,
    variant === "underline" ? underlineClasses : defaultClasses,
    className,
  );

  return <BaseInput className={finalClasses} {...props} />;
}
