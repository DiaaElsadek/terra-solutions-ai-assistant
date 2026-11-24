import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeVariant =
  | "gold"
  | "muted"
  | "outline"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold: "bg-primary/15 text-primary border border-primary/30",
  muted: "bg-background-tertiary text-foreground-muted border border-border",
  outline: "bg-transparent text-foreground-muted border border-border",
  success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  danger: "bg-red-500/15 text-red-300 border border-red-500/30",
};

export function Badge({
  variant = "gold",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

