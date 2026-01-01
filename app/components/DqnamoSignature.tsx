"use client";

import { Pirata_One } from "next/font/google";
import { cn } from "@/lib/utils";

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: ["400"],
});

interface DqnamoSignatureProps {
  className?: string;
}

export default function DqnamoSignature({ className }: DqnamoSignatureProps) {
  return (
    <p
      className={cn(
        "relative text-gray-scale-11 text-xl cursor-pointer overflow-hidden transition-colors duration-300 hover:text-gray-scale-12",
        pirataOne.className,
        className
      )}
      onClick={() => {
        window.open("https://dqnamo.com", "_blank");
      }}
    >
      dqnamo
    </p>
  );
}
