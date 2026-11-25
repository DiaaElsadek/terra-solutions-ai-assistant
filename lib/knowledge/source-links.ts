/**
 * Google Sheets & Excel source deep-link builder (safe for both server and client use).
 *
 * Constructs direct A1-range links pointing to the configured Google Sheets workbook
 * (`https://docs.google.com/spreadsheets/d/1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE/edit?usp=sharing&ouid=109986504837760137236&rtpof=true&sd=true`)
 * including the exact worksheet tab `gid` and `#gid=<gid>&range=<cell>` fragment so
 * Google Sheets jumps straight to the target sheet, row, and cell.
 *
 * Supports optional runtime overrides via `GOOGLE_SHEETS_SPREADSHEET_ID` (ID or full URL),
 * `GOOGLE_SHEETS_OUID`, and `GOOGLE_SHEETS_GIDS` JSON mapping `{ sheetName: gid }`.
 */

export const DEFAULT_SPREADSHEET_ID = "1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE";
export const DEFAULT_SPREADSHEET_OUID = "109986504837760137236";

/** Verified worksheet tab GIDs for `1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE` (normalized lowercase keys). */
export const DEFAULT_SHEET_GIDS: Record<string, string> = {
  "filler+botox+threads": "192726685",
  "laser": "326362711",
  "hair+face treatments": "30279157",
  "skin booster": "54716895",
  "facial": "1938301887",
  "tattoo removal": "663794479",
  "pregnancy and lactation": "1522081939",
  "slimming": "1802431891",
  "facial machines": "32307695",
  "dental": "365887541",
};

let cachedGidMap: Map<string, string> | null = null;

function readServerEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name]?.trim() || undefined;
}

function getSpreadsheetConfig(): { spreadsheetId: string; ouid: string } {
  const configured = readServerEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  let spreadsheetId = DEFAULT_SPREADSHEET_ID;
  let ouid = readServerEnv("GOOGLE_SHEETS_OUID") || DEFAULT_SPREADSHEET_OUID;

  if (configured) {
    const idMatch = configured.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    spreadsheetId = idMatch?.[1] || configured;
    const ouidMatch = configured.match(/[?&]ouid=([0-9]+)/);
    if (ouidMatch?.[1] && !readServerEnv("GOOGLE_SHEETS_OUID")) {
      ouid = ouidMatch[1];
    }
  }

  return { spreadsheetId, ouid };
}

function getGidMap(): Map<string, string> {
  if (cachedGidMap) return cachedGidMap;
  const map = new Map<string, string>(Object.entries(DEFAULT_SHEET_GIDS));

  const raw = readServerEnv("GOOGLE_SHEETS_GIDS");
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
  const inferredExcel =
    Boolean(source.file && /knowlege\.xlsx$/i.test(source.file)) ||
    Boolean(
      !source.file &&
        (source.rawSheet || source.sheet) &&
        getGidMap().has((source.rawSheet || source.sheet || "").trim().toLowerCase())
    );

  if (!inferredExcel) {
    return { url: undefined, hasSheetGid: false };
  }

  const range =
    source.cellRange ||
    source.cell ||
    (source.row && source.row > 0 ? `A${source.row}` : undefined);

  const { spreadsheetId, ouid } = getSpreadsheetConfig();
  const baseQuery = `usp=sharing&ouid=${encodeURIComponent(ouid)}&rtpof=true&sd=true`;

  const sheetLookup = (source.rawSheet || source.sheet || "").trim().toLowerCase();
  const gid = sheetLookup ? getGidMap().get(sheetLookup) : undefined;

  if (!range) {
    if (gid) {
      const encodedGid = encodeURIComponent(gid);
      return {
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?${baseQuery}&gid=${encodedGid}#gid=${encodedGid}`,
        hasSheetGid: true,
      };
    }
    return {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?${baseQuery}`,
      hasSheetGid: false,
    };
  }

  const encodedRange = encodeURIComponent(range);

  if (gid) {
    const encodedGid = encodeURIComponent(gid);
    return {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?${baseQuery}&gid=${encodedGid}&range=${encodedRange}#gid=${encodedGid}&range=${encodedRange}`,
      hasSheetGid: true,
      range,
    };
  }

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?${baseQuery}&range=${encodedRange}#range=${encodedRange}`,
    hasSheetGid: false,
    range,
  };
}
