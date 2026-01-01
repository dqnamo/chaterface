import { cn } from "@/lib/utils";

export default function Button({
  children,
  className,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  const variantClasses = {
    primary:
      "bg-gray-scale-12 text-gray-scale-2 dark:text-gray-scale-12 border-black dark:bg-gray-scale-6 border dark:border-gray-scale-8 transition-colors duration-100",
    secondary:
      "bg-gray-scale-4 text-gray-scale-12 border border-gray-scale-6 hover:bg-gray-scale-5 transition-colors duration-200 hover:border-gray-scale-7",
    tertiary: "bg-gray-scale-2 border border-gray-scale-4",
  };

  return (
    <button
      className={cn(
        variantClasses[variant as keyof typeof variantClasses],
        "rounded-lg flex flex-row items-center gap-1 w-max px-2 py-1.5 cursor-pointer transition-colors duration-200",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
