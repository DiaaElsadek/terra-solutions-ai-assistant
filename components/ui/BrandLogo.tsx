import Link from "next/link";
import { clsx } from "clsx";

export interface BrandLogoProps {
  href?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Terra Solutions brand mark and wordmark.
 */
export function BrandLogo({
  href = "/",
  subtitle = "AI Knowledge Assistant",
  compact = false,
  className,
}: BrandLogoProps) {
  const content = (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/40 text-primary font-display font-bold text-base tracking-tight">
        T
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold tracking-wide text-foreground">
            TERRA <span className="text-primary">SOLUTIONS</span>
          </span>
          {subtitle && (
            <span className="text-[11px] text-foreground-muted/80 font-normal">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
    >
      {content}
    </Link>
  );
}

