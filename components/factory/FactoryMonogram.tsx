export default function FactoryMonogram({ name }: { name: string }) {
  const initials = getInitials(name);

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-grayscale-3 font-mono text-xs font-bold uppercase text-grayscale-11">
      {initials}
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "F";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}
