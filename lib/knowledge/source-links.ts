/**
 * Server-side Google Sheets & Excel source deep-link builder.
 *
 * Constructs direct A1-range links pointing to the configured Google Sheets workbook
 * (`1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE` by default, overrideable via `GOOGLE_SHEETS_SPREADSHEET_ID`
 * and optional per-sheet `GOOGLE_SHEETS_GIDS` JSON mapping `{ sheetName: gid }`).
 *
 * Never invents fake tab `gid`s when unmapped; attaches `hasSheetGid` truthfully.
 */

const DEFAULT_SPREADSHEET_ID = "1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE";

let cachedGidMap: Map<string, string> | null = null;

function getGidMap(): Map<string, string> {
  if (cachedGidMap) return cachedGidMap;
  const map = new Map<string, string>();
  const raw = process.env.GOOGLE_SHEETS_GIDS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" || typeof v === "number") {
          map.set(k.trim().toLowerCase(), String(v).trim());
        }
      }
    } catch {
      /* ignore invalid JSON in env */
    }
  }
  cachedGidMap = map;
  return map;
}

export function clearSheetGidCache(): void {
  cachedGidMap = null;
}

export interface SheetDeepLinkResult {
  url?: string;
  hasSheetGid: boolean;
  range?: string;
}

export function buildGoogleSheetCellLink(source: {
  file?: string;
  sheet?: string;
  rawSheet?: string;
  row?: number;
  cell?: string;
  cellRange?: string;
}): SheetDeepLinkResult {
  if (!source.file || !/knowlege\.xlsx$/i.test(source.file)) {
    return { url: undefined, hasSheetGid: false };
  }

  const range =
    source.cellRange ||
    source.cell ||
    (source.row && source.row > 0 ? `${source.row}:${source.row}` : undefined);

  if (!range) {
    return { url: undefined, hasSheetGid: false };
  }

  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;

  const sheetLookup = (source.rawSheet || source.sheet || "").trim().toLowerCase();
  const gid = sheetLookup ? getGidMap().get(sheetLookup) : undefined;
  const encodedRange = encodeURIComponent(range);

  if (gid) {
    return {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${encodeURIComponent(
        gid
      )}#gid=${encodeURIComponent(gid)}&range=${encodedRange}`,
      hasSheetGid: true,
      range,
    };
  }

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing&rtpof=true&sd=true&range=${encodedRange}#range=${encodedRange}`,
    hasSheetGid: false,
    range,
  };
}

