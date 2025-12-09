import Image from "next/image";
import Link from "next/link";

export default function Logo({
  style = "default",
  className,
  color = "black",
}: {
  style?: "small" | "default";
  className?: string;
  color?: "black" | "white";
}) {
  return (
    <Link href="/" className={`flex flex-row items-center justify-center`}>
      <Image
        src="/white-logomark.svg"
        alt="Logo"
        width={24}
        height={24}
        className="hidden dark:block"
      />
      <Image
        src="/black-logomark.svg"
        alt="Logo"
        width={24}
        height={24}
        className="block dark:block"
      />
      <h1 className={`text-xl font-medium text-gray-12`}>Chaterface</h1>
    </Link>
  );
}
