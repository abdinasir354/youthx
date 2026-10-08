import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Brand logo: icon + "YouthX Foundation". `inverted` is for dark backgrounds (footer). */
export function Logo({ className, inverted = false, preload = false }: { className?: string; inverted?: boolean; preload?: boolean }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2", className)}>
      <Image
        src={inverted ? "/logo-icon-light.png" : "/logo-icon.png"}
        alt=""
        width={209}
        height={128}
        preload={preload}
        className="h-9 w-auto sm:h-10"
      />
      <span className="text-lg font-extrabold leading-none tracking-tight sm:text-xl">
        <span className="text-primary">YouthX</span>{" "}
        <span className={inverted ? "text-white" : "text-secondary"}>Foundation</span>
      </span>
    </Link>
  );
}
