import { cn } from "@/helpers/classname-helper";

export default function TextLink({ ...props }: React.ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={cn(
        "text-accent-9 text-sm inline leading-none bg-accent-2 hover:bg-accent-3 hover:text-accent-10 transition-colors",
        props.className,
      )}
    >
      {props.children}
    </a>
  );
}
