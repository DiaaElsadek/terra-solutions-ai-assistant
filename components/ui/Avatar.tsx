import { clsx } from "clsx";
import { Sparkles } from "lucide-react";

export interface AvatarProps {
  name?: string;
  variant?: "user" | "assistant";
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name?.trim()) return "TS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  variant = "user",
  size = "md",
  className,
}: AvatarProps) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-xs";

  if (variant === "assistant") {
    return (
      <div
        aria-hidden="true"
        className={clsx(
          "shrink-0 rounded-lg bg-primary/15 border border-primary/40 text-primary flex items-center justify-center",
          sizeClass,
          className
        )}
      >
        <Sparkles className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "shrink-0 rounded-lg bg-background-tertiary border border-border-hover text-terra-gold-light font-semibold flex items-center justify-center",
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

