import { clsx } from "clsx";
import { TerraMark } from "@/components/branding/TerraMark";

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
  if (variant === "assistant") {
    return (
      <TerraMark
        size={size === "sm" ? "xs" : "sm"}
        variant="tile"
        className={className}
      />
    );
  }

  const sizeClass = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "shrink-0 rounded-xl bg-background-tertiary border border-border-hover text-terra-gold-light font-semibold flex items-center justify-center",
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
