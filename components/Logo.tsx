import { cn } from "@/helpers/classname-helper";

type LogoProps = {
  className?: string;
};

const logoGrid = [
  {
    cells: [
      { active: false, id: "top-left" },
      { active: true, id: "top-center" },
      { active: true, id: "top-right" },
    ],
    id: "top",
  },
  {
    cells: [
      { active: true, id: "upper-left" },
      { active: false, id: "upper-center" },
      { active: false, id: "upper-right" },
    ],
    id: "upper",
  },
  {
    cells: [
      { active: false, id: "lower-left" },
      { active: true, id: "lower-center" },
      { active: false, id: "lower-right" },
    ],
    id: "lower",
  },
  {
    cells: [
      { active: true, id: "bottom-left" },
      { active: false, id: "bottom-center" },
      { active: false, id: "bottom-right" },
    ],
    id: "bottom",
  },
];

export default function Logo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        "small-shadow flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-grayscale-3 bg-white dark:border-grayscale-4 dark:bg-grayscale-3",
        className,
      )}
    >
      <div className="flex flex-col">
        {logoGrid.map((row) => (
          <div key={row.id} className="grid grid-cols-3">
            {row.cells.map((cell) => (
              <div
                key={cell.id}
                className={`size-1.5 ${cell.active ? "bg-accent-9" : ""}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
