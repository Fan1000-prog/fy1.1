import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FyLogo({ small }: { small?: boolean }) {
  const size = small ? 28 : 36;
  return (
    <Link href="/" className="flex items-center" aria-label="fy.">
      <Image
        src="/fy-logo.png"
        alt="fy."
        width={size * 2}
        height={size * 2}
        priority
        className={cn(
          "w-auto dark:brightness-0 dark:invert",
          small ? "h-10 sm:h-14" : "h-12 sm:h-14 md:h-[4.5rem]",
        )}
      />
    </Link>
  );
}
