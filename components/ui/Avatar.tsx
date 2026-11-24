import Image from "next/image";
import { clsx } from "clsx";

export interface AvatarProps {
  name?: string;
  variant?: "user" | "assistant";
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name?.trim()) return "TS";
  const cleaned = name.replace(/\([^)]*\)/g, " ").trim() || name.trim();
  const parts = cleaned
    .split(/\s+/)
    .map((p) => p.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "TS";
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
          "shrink-0 rounded-lg bg-background-tertiary border border-primary/35 flex items-center justify-center",
          sizeClass,
          className
        )}
      >
        <Image
          src="/images/T_logo.svg"
          alt=""
          width={14}
          height={24}
          unoptimized
          className={clsx(
            "w-auto object-contain",
            size === "sm" ? "h-4" : "h-5"
          )}
        />
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
