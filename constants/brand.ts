/**
 * Terra Solutions — Brand Constants
 * Derived from the official Terra Solutions website (terrasolutions.me).
 */

export const BRAND = {
  name: "Terra Solutions",
  tagline: "Advanced Aesthetic & Medical Solutions",
  assistant: {
    name: "Terra AI Assistant",
    shortName: "Terra AI",
    description:
      "Internal knowledge assistant for call center agents — access company information, products, services, and device specifications through natural language.",
  },
  copyright: "© 2026 Terra Solutions. All rights reserved.",
} as const;

/** Brand color palette — mirrors the CSS custom properties in globals.css. */
export const COLORS = {
  gold: "#CBB36A",
  goldDeep: "#9A7E3F",
  goldLight: "#EAE0C3",
  goldPale: "#D8C088",
  copper: "#A98142",
  dark: "#0D0B07",
  dark700: "#221C10",
  dark800: "#161209",
  white: "#FFFFFF",
  textMuted: "#CFC5AE",
} as const;

/** Typography configuration — matches next/font/google setup in layout.tsx. */
export const FONTS = {
  body: "Inter",
  display: "Space Grotesk",
} as const;

/** Navigation links for the marketing pages. */
export const NAV_LINKS = [
  { label: "Products & Services", href: "/#services" },
  { label: "About", href: "/#about" },
] as const;
