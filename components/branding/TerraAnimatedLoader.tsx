"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  TERRA_LOGO_GOLD,
  TERRA_LOGO_GOLD_HIGHLIGHT,
  TERRA_LOGO_VIEWBOX,
  TERRA_T_FULL_PATH,
  TERRA_T_METRICS,
  TERRA_T_SUBPATHS,
  TERRA_WORDMARK_GLYPHS,
} from "./terra-logo-geometry";

/** Centralized choreography milestones (milliseconds) for all 5 reveal phases. */
export const TERRA_LOADER_TIMING = {
  /** Phase 1: Initial geometric T architectural draw & solid fill transition. */
  tStrokeDelayMs: 60,
  tStrokeDurationMs: 620,
  tFillDelayMs: 210,
  tFillDurationMs: 440,
  /** Phase 2: Coordinated continuous scale down & translation left. */
  tMoveDelayMs: 650,
  tMoveDurationMs: 780,
  /** Phase 3: Sequential character-by-character "TERRA SOLUTIONS" reveal. */
  terraWordStartMs: 1040,
  terraCharStaggerMs: 88,
  wordBreakPauseMs: 130,
  solutionsCharStaggerMs: 82,
  glyphRevealDurationMs: 340,
  /** Phase 4: Subtle sheen sweep across complete assembled brand lockup. */
  sheenDelayMs: 2560,
  sheenDurationMs: 460,
  /** Phase 5: Smooth fade transition revealing ready application. */
  exitStartMs: 3080,
  exitDurationMs: 480,
  /** Reduced-motion shortcut timeline. */
  reducedHoldMs: 460,
  reducedExitMs: 240,
  /** Safety failsafe guarantees UI access even if timers stall cleanly. */
  hardFailsafeMs: 4500,
} as const;

export interface TerraAnimatedLoaderProps {
  /** Called once the entrance transition has finished fading out. */
  onComplete: () => void;
  /** Override reduced motion detection (useful for deterministic QA/testing). */
  forceReducedMotion?: boolean;
  className?: string;
}

function getGlyphDelayMs(index: number): number {
  const { terraWordStartMs, terraCharStaggerMs, wordBreakPauseMs, solutionsCharStaggerMs } =
    TERRA_LOADER_TIMING;
  // Indices 0..4 are T-E-R-R-A, indices 5..13 are S-O-L-U-T-I-O-N-S
  if (index < 5) {
    return terraWordStartMs + index * terraCharStaggerMs;
  }
  const terraEndStart = terraWordStartMs + 4 * terraCharStaggerMs;
  return terraEndStart + wordBreakPauseMs + (index - 5) * solutionsCharStaggerMs;
}

/**
 * Signature Terra Solutions brand reveal loader.
 * Preserves exact original SVG vector geometry while choreographing:
 * 1. Centered large geometric T architectural reveal
 * 2. Continuous ease-out scale down + translation to final lockup position
 * 3. Left-to-right per-character reveal of original custom TERRA SOLUTIONS glyphs
 * 4. Soft sheen highlight & seamless entrance into the application
 */
export function TerraAnimatedLoader({
  onComplete,
  forceReducedMotion,
  className,
}: TerraAnimatedLoaderProps) {
  const rawUid = useId();
  const uid = useMemo(() => rawUid.replace(/[^a-zA-Z0-9_-]/g, "_"), [rawUid]);

  const [isExiting, setIsExiting] = useState(false);
  const [reducedMotion] = useState<boolean>(() => {
    if (typeof forceReducedMotion === "boolean") return forceReducedMotion;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      onComplete();
    };

    const exitStart = reducedMotion
      ? TERRA_LOADER_TIMING.reducedHoldMs
      : TERRA_LOADER_TIMING.exitStartMs;
    const exitDuration = reducedMotion
      ? TERRA_LOADER_TIMING.reducedExitMs
      : TERRA_LOADER_TIMING.exitDurationMs;

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, exitStart);

    const completeTimer = window.setTimeout(finish, exitStart + exitDuration + 40);
    const failsafeTimer = window.setTimeout(finish, TERRA_LOADER_TIMING.hardFailsafeMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
      window.clearTimeout(failsafeTimer);
    };
  }, [onComplete, reducedMotion]);

  // Lock viewport scroll cleanly while the fullscreen entrance overlay covers the page
  useEffect(() => {
    const html = document.documentElement;
    if (isExiting) {
      html.style.removeProperty("overflow");
      return;
    }
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      if (prevOverflow) html.style.overflow = prevOverflow;
      else html.style.removeProperty("overflow");
    };
  }, [isExiting]);

  const tMaskId = `terra-t-mask-${uid}`;
  const fullLogoClipId = `terra-full-clip-${uid}`;
  const sheenGradId = `terra-sheen-grad-${uid}`;
  const sheenGoldFilterGradId = `terra-t-glow-grad-${uid}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Terra Solutions Assistant"
      data-terra-loader-state={isExiting ? "exiting" : reducedMotion ? "reduced" : "playing"}
      className={clsx(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden select-none transition-opacity",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100",
        className
      )}
      style={{
        transitionDuration: `${
          reducedMotion
            ? TERRA_LOADER_TIMING.reducedExitMs
            : TERRA_LOADER_TIMING.exitDurationMs
        }ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <span className="sr-only">Loading Terra Solutions Assistant</span>

      {/* Subtle architectural vignette and ambient gold aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(22,18,9,0.5)_0%,#0D0B07_100%)]"
      />
      <div
        aria-hidden="true"
        className={clsx(
          "pointer-events-none absolute h-[320px] w-[480px] max-w-[90vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(203,179,106,0.11)_0%,rgba(203,179,106,0.03)_42%,transparent_72%)]",
          !reducedMotion && "terra-intro-glow"
        )}
      />

      {/* Responsive vector stage centered on every screen */}
      <div
        className={clsx(
          "relative flex items-center justify-center px-6 py-16 transition-transform",
          isExiting ? "scale-[1.015]" : "scale-100"
        )}
        style={{
          transitionDuration: `${
            reducedMotion
              ? TERRA_LOADER_TIMING.reducedExitMs
              : TERRA_LOADER_TIMING.exitDurationMs
          }ms`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={TERRA_LOGO_VIEWBOX}
          aria-hidden="true"
          className="w-[min(84vw,108vh,540px)] h-auto overflow-visible"
        >
          <defs>
            {/* Phase 1 vertical wipe mask for the geometric T solid fill */}
            <mask id={tMaskId} maskUnits="userSpaceOnUse">
              <rect
                x={TERRA_T_METRICS.x - 1}
                y={TERRA_T_METRICS.y - 1}
                width={TERRA_T_METRICS.width + 2}
                height={TERRA_T_METRICS.height + 2}
                fill="#FFFFFF"
                className={reducedMotion ? undefined : "terra-t-fill-wipe"}
                style={
                  reducedMotion
                    ? undefined
                    : {
                        animationDelay: `${TERRA_LOADER_TIMING.tFillDelayMs}ms`,
                        animationDuration: `${TERRA_LOADER_TIMING.tFillDurationMs}ms`,
                      }
                }
              />
            </mask>

            {/* Phase 3 individual horizontal glyph clip masks */}
            {!reducedMotion &&
              TERRA_WORDMARK_GLYPHS.map((glyph, idx) => (
                <clipPath key={glyph.id} id={`terra-glyph-clip-${uid}-${glyph.id}`}>
                  <rect
                    x={glyph.bounds.x - 0.5}
                    y={glyph.bounds.y - 1}
                    width={glyph.bounds.width + 1}
                    height={glyph.bounds.height + 2}
                    className="terra-glyph-wipe"
                    style={{
                      animationDelay: `${getGlyphDelayMs(idx)}ms`,
                      animationDuration: `${TERRA_LOADER_TIMING.glyphRevealDurationMs}ms`,
                    }}
                  />
                </clipPath>
              ))}

            {/* Phase 4 full logo clip mask so highlight sheen kisses only gold vector surfaces */}
            <clipPath id={fullLogoClipId} clipRule="evenodd">
              <path d={TERRA_T_FULL_PATH} clipRule="evenodd" />
              {TERRA_WORDMARK_GLYPHS.map((glyph) => (
                <path key={glyph.id} d={glyph.d} clipRule="evenodd" />
              ))}
            </clipPath>

            <linearGradient id={sheenGradId} x1="0%" y1="0%" x2="100%" y2="25%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="45%" stopColor="#FFF7DF" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#EAE0C3" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            <linearGradient id={sheenGoldFilterGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={TERRA_LOGO_GOLD_HIGHLIGHT} />
              <stop offset="100%" stopColor={TERRA_LOGO_GOLD} />
            </linearGradient>
          </defs>

          {reducedMotion ? (
            /* Static exact SVG artwork under prefers-reduced-motion */
            <g>
              <path
                d={TERRA_T_FULL_PATH}
                fill={TERRA_LOGO_GOLD}
                fillRule="evenodd"
              />
              {TERRA_WORDMARK_GLYPHS.map((glyph) => (
                <path
                  key={glyph.id}
                  d={glyph.d}
                  fill={TERRA_LOGO_GOLD}
                  fillRule="evenodd"
                />
              ))}
            </g>
          ) : (
            <>
              {/* Phases 1 & 2: Geometric T symbol (draw -> fill -> coordinated shrink & translate left) */}
              <g
                className="terra-t-translate"
                style={{
                  animationDelay: `${TERRA_LOADER_TIMING.tMoveDelayMs}ms`,
                  animationDuration: `${TERRA_LOADER_TIMING.tMoveDurationMs}ms`,
                }}
              >
                <g
                  transform={`translate(${TERRA_T_METRICS.centerX}, ${TERRA_T_METRICS.centerY})`}
                >
                  <g
                    className="terra-t-scale"
                    style={{
                      animationDelay: `${TERRA_LOADER_TIMING.tMoveDelayMs}ms`,
                      animationDuration: `${TERRA_LOADER_TIMING.tMoveDurationMs}ms`,
                    }}
                  >
                    <g
                      transform={`translate(${-TERRA_T_METRICS.centerX}, ${-TERRA_T_METRICS.centerY})`}
                    >
                      {/* Solid original gold T revealed smoothly beneath mask */}
                      <path
                        d={TERRA_T_FULL_PATH}
                        fill={TERRA_LOGO_GOLD}
                        fillRule="evenodd"
                        mask={`url(#${tMaskId})`}
                        className="terra-t-fill"
                        style={{
                          animationDelay: `${TERRA_LOADER_TIMING.tFillDelayMs}ms`,
                          animationDuration: `${TERRA_LOADER_TIMING.tFillDurationMs}ms`,
                        }}
                      />

                      {/* Crisp architectural contour trace during initial draw */}
                      {TERRA_T_SUBPATHS.map((subD, subIdx) => (
                        <path
                          key={`t-trace-${subIdx}`}
                          d={subD}
                          fill="none"
                          stroke={`url(#${sheenGoldFilterGradId})`}
                          strokeWidth="0.62"
                          strokeLinejoin="miter"
                          pathLength={1}
                          strokeDasharray="1"
                          className="terra-t-stroke"
                          style={{
                            animationDelay: `${
                              TERRA_LOADER_TIMING.tStrokeDelayMs + subIdx * 85
                            }ms`,
                            animationDuration: `${TERRA_LOADER_TIMING.tStrokeDurationMs}ms`,
                          }}
                        />
                      ))}
                    </g>
                  </g>
                </g>
              </g>

              {/* Phase 3: Sequentially animated custom TERRA SOLUTIONS glyphs */}
              <g>
                {TERRA_WORDMARK_GLYPHS.map((glyph, idx) => (
                  <g
                    key={glyph.id}
                    clipPath={`url(#terra-glyph-clip-${uid}-${glyph.id})`}
                  >
                    <path
                      d={glyph.d}
                      fill={TERRA_LOGO_GOLD}
                      fillRule="evenodd"
                      className="terra-glyph-reveal"
                      style={{
                        animationDelay: `${getGlyphDelayMs(idx)}ms`,
                        animationDuration: `${TERRA_LOADER_TIMING.glyphRevealDurationMs}ms`,
                      }}
                    />
                  </g>
                ))}
              </g>

              {/* Phase 4: Finishing diagonal gold sheen clipped cleanly to the assembled brand lockup */}
              <g clipPath={`url(#${fullLogoClipId})`} pointerEvents="none">
                <rect
                  x="0"
                  y="4"
                  width="64"
                  height="80"
                  fill={`url(#${sheenGradId})`}
                  className="terra-logo-sheen"
                  style={{
                    animationDelay: `${TERRA_LOADER_TIMING.sheenDelayMs}ms`,
                    animationDuration: `${TERRA_LOADER_TIMING.sheenDurationMs}ms`,
                  }}
                />
              </g>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

