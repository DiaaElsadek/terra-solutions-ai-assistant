import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

export interface BrandLogoProps {
  href?: string;
  subtitle?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  hideSubtitleOnMobile?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-auto",
  md: "h-9 w-auto",
  lg: "h-12 w-auto",
};

/**
 * Official Terra Solutions SVG brand mark and wordmark (`public/images/terra_solutions_image.svg`).
 */
export function BrandLogo({
  href = "/",
  subtitle = "Solutions Assistant",
  compact = false,
  size = "md",
  priority = false,
  hideSubtitleOnMobile = false,
  className,
}: BrandLogoProps) {
  const content = (
    <span className={clsx("inline-flex items-center gap-2.5 min-w-0", className)}>
      <Image
        src="/images/terra_solutions_image.svg"
        alt="Terra Solutions"
        width={193}
        height={76}
        unoptimized
        priority={priority}
        className={clsx(SIZE_CLASSES[size], "shrink-0 object-contain")}
      />
      {!compact && subtitle && (
        <span
          className={clsx(
            "border-l border-border/80 pl-2.5 text-[11px] font-medium text-foreground-muted leading-tight truncate",
            hideSubtitleOnMobile && "hidden sm:inline-block"
          )}
        >
          {subtitle}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="inline-flex items-center min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
    >
      {content}
    </Link>
  );
}
