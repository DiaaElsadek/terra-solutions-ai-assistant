import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TERRA_LOGO_GOLD,
  TERRA_LOGO_VIEWBOX,
  TERRA_T_FULL_PATH,
  TERRA_T_SUBPATHS,
  TERRA_WORDMARK_FULL_PATH,
  TERRA_WORDMARK_GLYPHS,
} from "@/components/branding/terra-logo-geometry";
import {
  TERRA_LOADER_TIMING,
  TerraAnimatedLoader,
} from "@/components/branding/TerraAnimatedLoader";

describe("Terra Solutions Original SVG Geometry Parity", () => {
  it("preserves exact viewBox, colors, T paths, and all 14 grouped TERRA SOLUTIONS paths from the original SVG asset", () => {
    const svgPath = path.join(process.cwd(), "public", "images", "terra_solutions_image.svg");
    const rawSvg = fs.readFileSync(svgPath, "utf8");

    const viewBoxMatch = rawSvg.match(/viewBox="([^"]+)"/);
    assert.equal(viewBoxMatch?.[1], TERRA_LOGO_VIEWBOX);

    const pathMatches = [...rawSvg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((m) => m[1].trim());
    assert.equal(pathMatches.length, 2, "Original SVG must contain T mark path + wordmark path");

    // Verify T mark exact reconstruction
    assert.equal(TERRA_T_SUBPATHS.length, 2);
    assert.equal(TERRA_T_SUBPATHS.join(" "), pathMatches[0]);
    assert.equal(TERRA_T_FULL_PATH, pathMatches[0]);

    // Verify wordmark exact 14 letters (including inner holes for R, R, A, O, O)
    assert.equal(TERRA_WORDMARK_GLYPHS.length, 14);
    assert.equal(
      TERRA_WORDMARK_GLYPHS.map((g) => g.char).join(""),
      "TERRASOLUTIONS"
    );
    assert.equal(
      TERRA_WORDMARK_GLYPHS.map((g) => g.d).join(" "),
      pathMatches[1]
    );
    assert.equal(TERRA_WORDMARK_FULL_PATH, pathMatches[1]);

    // Monotonically left-to-right non-overlapping character bounding boxes
    for (let i = 1; i < TERRA_WORDMARK_GLYPHS.length; i++) {
      const prev = TERRA_WORDMARK_GLYPHS[i - 1].bounds;
      const curr = TERRA_WORDMARK_GLYPHS[i].bounds;
      assert.ok(
        curr.x > prev.x + prev.width * 0.9,
        `Glyph ${TERRA_WORDMARK_GLYPHS[i].id} (${curr.x}) must appear cleanly after ${TERRA_WORDMARK_GLYPHS[i - 1].id} (${prev.x + prev.width})`
      );
    }
  });
});

describe("TerraAnimatedLoader Component & Choreography Safety", () => {
  it("renders accessible 5-phase SVG reveal markup with exact gold fill and timing order", () => {
    const noop = () => {};
    const html = renderToStaticMarkup(
      React.createElement(TerraAnimatedLoader, { onComplete: noop })
    );

    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
    assert.ok(html.includes(TERRA_LOGO_GOLD));
    assert.ok(html.includes(TERRA_LOGO_VIEWBOX));
    assert.ok(html.includes("terra-t-translate"));
    assert.ok(html.includes("terra-t-scale"));
    assert.ok(html.includes("terra-glyph-reveal"));
    assert.ok(html.includes("terra-logo-sheen"));
    for (const glyph of TERRA_WORDMARK_GLYPHS) {
      assert.ok(html.includes(glyph.d), `Must contain exact vector path for glyph ${glyph.id}`);
    }

    assert.ok(TERRA_LOADER_TIMING.tMoveDelayMs > TERRA_LOADER_TIMING.tStrokeDelayMs);
    assert.ok(TERRA_LOADER_TIMING.terraWordStartMs > TERRA_LOADER_TIMING.tMoveDelayMs);
    assert.ok(TERRA_LOADER_TIMING.sheenDelayMs > TERRA_LOADER_TIMING.terraWordStartMs);
    assert.ok(TERRA_LOADER_TIMING.exitStartMs > TERRA_LOADER_TIMING.sheenDelayMs);
  });

  it("renders static untouched artwork under reduced-motion override", () => {
    const html = renderToStaticMarkup(
      React.createElement(TerraAnimatedLoader, {
        onComplete: () => {},
        forceReducedMotion: true,
      })
    );
    assert.ok(html.includes('data-terra-loader-state="reduced"'));
    assert.ok(html.includes(TERRA_T_FULL_PATH));
    assert.equal(html.includes("terra-t-translate"), false);
    assert.equal(html.includes("terra-glyph-reveal"), false);
  });
});

