/**
 * Terra Solutions — Brand Constants
 * Derived from the official Terra Solutions visual identity (terrasolutions.me).
 * Strict Identity Policy: Never expose upstream AI model/provider details to employees.
 */

export const BRAND = {
  name: "Terra Solutions",
  tagline: "Advanced Aesthetic & Medical Operations Support",
  assistant: {
    name: "Terra Solutions Assistant",
    shortName: "Terra Assistant",
    description:
      "Internal knowledge assistant for Terra Solutions employees — retrieve verified product details, device specifications, pricing, clinic availability, and safety protocols in seconds.",
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
  arabic: "IBM Plex Sans Arabic",
} as const;

/** Navigation links for the marketing pages. */
export const NAV_LINKS = [
  { label: "Capabilities", href: "/#capabilities" },
  { label: "Knowledge Coverage", href: "/#services" },
  { label: "Operations & Clinics", href: "/#about" },
] as const;
