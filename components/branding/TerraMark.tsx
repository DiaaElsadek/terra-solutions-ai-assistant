import { clsx } from "clsx";
import {
  TERRA_LOGO_GOLD,
  TERRA_T_FULL_PATH,
} from "./terra-logo-geometry";

export type TerraMarkSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TerraMarkVariant = "bare" | "tile" | "circle" | "badge";

export interface TerraMarkProps {
  size?: TerraMarkSize;
  variant?: TerraMarkVariant;
  decorative?: boolean;
  label?: string;
  className?: string;
}

const CONTAINER_SIZES: Record<TerraMarkSize, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

const GLYPH_SIZES: Record<TerraMarkSize, string> = {
  xs: "h-4 w-auto",
  sm: "h-5 w-auto",
  md: "h-6 w-auto",
  lg: "h-8 w-auto",
  xl: "h-12 w-auto",
};

const VARIANT_CLASSES: Record<TerraMarkVariant, string> = {
  bare: "",
  badge:
    "rounded-lg border border-primary/30 bg-[#1B150A] shadow-[inset_0_1px_0_rgba(234,224,195,0.08)]",
  tile:
    "rounded-xl border border-primary/28 bg-gradient-to-b from-[#221C10] to-[#141008] terra-subtle-shadow",
  circle:
    "rounded-full border border-primary/30 bg-gradient-to-b from-[#221C10] to-[#141008] terra-subtle-shadow",
};

/**
 * Reusable inline SVG Terra geometric "T" identity mark derived strictly
 * from the original Terra Solutions brand artwork (`terra_solutions_image.svg`).
 */
export function TerraMark({
  size = "sm",
  variant = "tile",
  decorative = true,
  label = "Terra Solutions",
  className,
}: TerraMarkProps) {
  const svgNode = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="9.483 11.635 30.324 65.133"
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
      className={clsx(
        "shrink-0 select-none",
        variant === "bare" ? GLYPH_SIZES[size] : GLYPH_SIZES[size]
      )}
    >
      <path
        d={TERRA_T_FULL_PATH}
        fill={TERRA_LOGO_GOLD}
        fillRule="evenodd"
      />
    </svg>
  );

  if (variant === "bare") {
    return (
      <span
        className={clsx("inline-flex items-center justify-center shrink-0", className)}
      >
        {svgNode}
      </span>
    );
  }

  return (
    <span
      aria-hidden={decorative ? "true" : undefined}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center select-none",
        CONTAINER_SIZES[size],
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {svgNode}
    </span>
  );
}

