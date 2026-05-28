import { cn } from "@/helpers/classname-helper";

export function Footer({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-px", className)}>
      <p className="text-xs text-grayscale-9">
        Made with 💛 in{" "}
        <span className="font-medium text-grayscale-9">London</span> by{" "}
      </p>
      <a
        href="https://dqnamo.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-max font-medium text-lg text-grayscale-9 hover:text-grayscale-11 transition-colors duration-200 font-pirata"
      >
        dqnamo
      </a>
    </div>
  );
}
