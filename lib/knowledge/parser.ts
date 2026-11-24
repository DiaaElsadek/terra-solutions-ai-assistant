/**
 * Knowledge data parser.
 * Transforms the semi-structured Excel-JSON export into normalized KnowledgeRecord objects.
 *
 * Handles real-world Excel export quirks present in Terra Solutions' data:
 * - Major topic headings vs generic sub-headings ("مميزاته:", "الآنواع :", etc.)
 * - Multi-column table headers followed by matching data rows
 * - Sparse table columns (e.g. ["clinic name", "", "Device", "", "Technology"])
 * - Multi-row cell continuations (e.g. ["", "", "extra bullet"])
 * - Mixed Arabic and English content with product names and prices
 */

import type { KnowledgeRecord, KnowledgeCategory } from "@/types/knowledge";
import { SHEET_TO_CATEGORY } from "./categories";

type RawData = Record<string, string[][]>;

/** Major topic patterns that start a new standalone KnowledgeRecord within a sheet. */
const MAJOR_TOPIC_PATTERNS: RegExp[] = [
  /^Filler$/i,
  /^Radiesse/i,
  /^Body Filler$/i,
  /^البوتوكس/,
  /^خيوط الوجه/,
  /^Laser Hair Remov/i,
  /^الأجهزة الموجودة بالعيادات/,
  /^حقن الفلر للشعر/,
  /^الـ\s*PRP/,
  /^الخلايا الجذعية/,
  /^مقارنة بين أنواع حقن الشعر/,
  /^الميزوثيرابي/,
  /^Skin Booster Injections$/i,
  /^Exofecta$/i,
  /^حقن تحفيز الكولاجين/,
  /^Hydrafacial$/i,
  /^الديرمابن/,
  /^الفاكتور فايف/,
  /^التقشير-Peeling/,
  /^إزالة التاتو/,
  /^pregnancy and lactation/i,
  /^حقن Wegovy/,
  /^Lipolysis/i,
  /^Endolift/i,
  /^Z-Lipo/i,
  /^Z-Wave/i,
  /^Cool Shaping/i,
  /^Lipozero/i,
  /^Hifu/i,
  /^Inbody/i,
  /^Roblex$/i,
  /^Venus\s*-\s*Legacy$/i,
  /^Deka Slimming/i,
  /^Opatra London/i,
  /^Ultra Sound For Filler$/i,
  /^فيفاتشي\s*-?Vivace/i,
  /^Clear \+ Brilliant$/i,
  /^OxyGeneo$/i,
  /^CAMPOMATS/i,
  /^CO2 Laser/i,
  /^Plasmage$/i,
  /^Veneer$/i,
  /^Night Guard/i,
  /^Snap-On Smile$/i,
];

/** Keywords typically found in real table header rows. */
const TABLE_HEADER_KEYWORDS = [
  "الاسم التجاري",
  "بلد التصنيع",
  "الاستخدامات",
  "الاستخدام",
  "الفائدة",
  "التركيب",
  "النتيجة",
  "النوع",
  "الوصف",
  "المزايا",
  "المدة الزمنية",
  "التركيبة",
  "الفرق الرئيسي",
  "المنطقة",
  "المصدر",
  "العلاج",
  "الفئة المناسبة",
  "مناسب للوجه",
  "مناسب تحت العين",
  "المميزات الرئيسية",
  "المادة الفعالة",
  "clinic name",
  "device",
  "technology",
  "اسم العلاج",
  "مسموح أثناء الحمل",
  "مسموح أثناء الرضاعة",
  "ملاحظات للإيجنت",
  "المنتج",
  "الهدف الأساسي",
  "التأثير الرئيسي",
  "الفيلر",
  "حقن الكولاجين",
];

/** Detect the primary language of a text string. */
function detectLanguage(text: string): "ar" | "en" | "mixed" {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  const latinPattern = /[a-zA-Z]/;
  const hasArabic = arabicPattern.test(text);
  const hasLatin = latinPattern.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  return "en";
}

/** Extract searchable English & Arabic tags plus bilingual domain tags. */
function extractTags(text: string, category: KnowledgeCategory): string[] {
  const tags = new Set<string>();

  const productPatterns = [
    /\b[A-Z][a-zA-Z0-9+-]*(?:\s+[A-Z0-9][a-zA-Z0-9+-]*){0,3}\b/g,
    /\b(?:Dr\.\s*)?[A-Z]{2,}[a-z]*\b/g,
  ];

  for (const pattern of productPatterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.trim();
      if (cleaned.length >= 2 && cleaned.length <= 45) {
        tags.add(cleaned);
      }
    }
  }

  const arabicMatches =
    text.match(
      /(?:فيلر|فلر|بوتوكس|بوتكس|ليزر|خيوط|حقن|نضارة|تجاعيد|شد|تقشير|بشرة|شعر|أسنان|اسنان|فينير|فينيير|تنحيف|كولاجين|بلازما|ميزوثيرابي|هالورونيك|تاتو|مايكروبليدينغ|حمل|الحمل|رضاعة|الرضاعة|عيادة|عيادات|جهاز|أجهزة|اجهزة|سعر|أسعار|اسعار|AED|ديرمابن|فيشال|هايدرافيشال)/gi
    ) || [];
  for (const keyword of arabicMatches) {
    tags.add(keyword);
  }

  // Add category-level bilingual tags so English queries find Arabic content and vice versa
  const categoryTags: Record<KnowledgeCategory, string[]> = {
    fillers: ["filler", "fillers", "فيلر", "فلر", "dermal filler", "hyaluronic"],
    botox: ["botox", "بوتوكس", "بوتكس", "dysport", "nabota", "xeomin", "wrinkles"],
    threads: ["thread", "threads", "pdo", "aptos", "rainbow", "خيوط", "price", "aed"],
    "body-fillers": ["body filler", "فيلر الجسم", "goldfill", "jealfil", "privilege", "bbl"],
    laser: ["laser", "hair removal", "ليزر", "إزالة الشعر", "device", "devices", "candela", "cynosure", "deka", "quanta"],
    "hair-treatments": ["hair", "prp", "mesotherapy", "stem cell", "cyj", "شعر", "بلازما", "خلايا جذعية"],
    "face-treatments": ["face", "prp", "mesotherapy", "stem cell", "بشرة", "وجه", "ميزوثيرابي"],
    "skin-boosters": ["skin booster", "profhilo", "jalupro", "exofecta", "sculptra", "radiesse", "نضارة", "كولاجين"],
    facial: ["facial", "hydrafacial", "dermapen", "microneedling", "factor five", "peeling", "فيشال", "ديرمابن", "تقشير"],
    "tattoo-removal": ["tattoo", "removal", "microblading", "q-switch", "clinic", "well touch", "new age", "demadent", "dermadent", "one touch", "vip", "تاتو", "عيادة", "جهاز"],
    "pregnancy-safety": ["pregnancy", "pregnant", "lactation", "breastfeeding", "safe", "حمل", "الحمل", "رضاعة", "الرضاعة", "حامل", "مرضع"],
    slimming: ["slimming", "wegovy", "lipolysis", "endolift", "z-lipo", "z-wave", "hifu", "venus", "deka", "inbody", "cool shaping", "lipozero", "clinic", "device", "تنحيف", "دهون"],
    "facial-machines": ["device", "devices", "machine", "machines", "vivace", "clear + brilliant", "oxygeneo", "campomats", "co2", "fractional", "plasmage", "opatra", "ultrasound", "جهاز", "أجهزة"],
    dental: ["dental", "teeth", "veneer", "veneers", "night guard", "snap-on", "smile", "أسنان", "اسنان", "فينير"],
  };

  for (const tag of categoryTags[category] || []) {
    tags.add(tag);
  }

  // Clinic & price tags if mentioned in text
  if (/well\s*touch|new\s*age|demadent|ديرمادنت|one\s*touch|all\s*the\s*clinics/i.test(text)) {
    tags.add("clinic");
    tags.add("clinics");
    tags.add("عيادة");
    tags.add("عيادات");
  }
  if (/\bAED\b|سعر|اسعار|أسعار/i.test(text)) {
    tags.add("price");
    tags.add("prices");
    tags.add("pricing");
    tags.add("سعر");
    tags.add("أسعار");
  }
  if (/جهاز|أجهزة|Device|Laser|Hifu|Vivace|Plasmage|OxyGeneo|Venus|Z-Lipo|Z-Wave|Inbody|Opatra/i.test(text)) {
    tags.add("device");
    tags.add("devices");
    tags.add("specifications");
    tags.add("جهاز");
    tags.add("أجهزة");
  }

  return Array.from(tags);
}

/** Check if a row is empty. */
function isEmptyRow(row: string[]): boolean {
  return row.every((c) => c.trim() === "");
}

/** Extract non-empty cell indices and values from a row. */
function getNonEmptyCells(row: string[]): Array<{ index: number; value: string }> {
  const cells: Array<{ index: number; value: string }> = [];
  for (let i = 0; i < row.length; i++) {
    const value = (row[i] ?? "").trim();
    if (value !== "") {
      cells.push({ index: i, value });
    }
  }
  return cells;
}

/** Determine whether a multi-cell row is a table header row. */
function isTableHeaderRow(row: string[]): boolean {
  const nonEmpty = getNonEmptyCells(row);
  if (nonEmpty.length < 2 || nonEmpty.length > 6) return false;
  if (!nonEmpty.every((c) => c.value.length < 60 && !c.value.includes("\n"))) {
    return false;
  }

  const joined = nonEmpty.map((c) => c.value.toLowerCase()).join(" | ");
  return TABLE_HEADER_KEYWORDS.some((kw) => joined.includes(kw.toLowerCase()));
}

/** Determine whether a single-cell row begins a major topic inside a sheet. */
function isMajorTopicRow(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  return MAJOR_TOPIC_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Determine the primary category for a topic based on its title and sheet defaults. */
function categorizeTopic(
  topicTitle: string,
  sheetCategories: KnowledgeCategory[]
): KnowledgeCategory {
  const lower = topicTitle.toLowerCase();

  if (/body filler|فيلر الجسم/.test(lower)) return "body-fillers";
  if (/filler|فيلر|فلر|radiesse/.test(lower) && sheetCategories.includes("fillers")) {
    return "fillers";
  }
  if (/botox|بوتوكس|بوتكس/.test(lower) && sheetCategories.includes("botox")) {
    return "botox";
  }
  if (/thread|خيوط/.test(lower) && sheetCategories.includes("threads")) {
    return "threads";
  }
  if (
    /cyj|مقارنة بين أنواع حقن الشعر/.test(lower) &&
    sheetCategories.includes("hair-treatments")
  ) {
    return "hair-treatments";
  }
  if (
    /ميزوثيرابي|mesotherapy|prp|خلايا جذعية|stem cell/i.test(lower) &&
    sheetCategories.includes("face-treatments")
  ) {
    return "hair-treatments"; // covers both hair & face; tags index both
  }

  return sheetCategories[0];
}

/** Generate a clean bilingual title for a topic when useful. */
function enrichTitle(rawTitle: string): { title: string; titleEn?: string } {
  const cleaned = rawTitle.replace(/\s+/g, " ").trim();
  const titleMap: Record<string, string> = {
    Filler: "Dermal Fillers — الفيلر",
    "Body Filler": "Body Fillers — فيلر الجسم",
    "البوتوكس": "Botox — البوتوكس",
    "خيوط الوجه:": "Face Threads (PDO / Aptos) — خيوط الوجه",
    "Laser Hair Removel": "Laser Hair Removal — إزالة الشعر بالليزر",
    "Laser Hair Removal": "Laser Hair Removal — إزالة الشعر بالليزر",
    "الأجهزة الموجودة بالعيادات :": "Clinic Laser Hair Removal Devices — أجهزة الليزر بالعيادات",
    "Skin Booster Injections": "Skin Booster Injections — حقن النضارة",
    "pregnancy and lactation (breastfeeding)":
      "Pregnancy & Lactation Safety Matrix — العلاجات أثناء الحمل والرضاعة",
    "إزالة التاتو (Tattoo Removal)": "Tattoo Removal & Clinic Devices — إزالة التاتو",
    "Veneer": "Dental Veneers — فينير الأسنان",
    "Hydrafacial": "Hydrafacial Treatments — الهيدرافيشال",
  };

  for (const [key, mapped] of Object.entries(titleMap)) {
    if (cleaned.toLowerCase() === key.toLowerCase()) {
      return { title: mapped, titleEn: mapped.split(" — ")[0] };
    }
  }

  return { title: cleaned };
}

interface ActiveTable {
  headers: string[];
  colIndices: number[];
  rows: string[][];
}

/**
 * Parse raw Excel-JSON data into normalized KnowledgeRecords.
 */
export function parseKnowledgeData(rawData: RawData): KnowledgeRecord[] {
  const records: KnowledgeRecord[] = [];
  let globalId = 0;

  for (const [sheetKey, rows] of Object.entries(rawData)) {
    const sheetCategories = SHEET_TO_CATEGORY[sheetKey];
    if (!sheetCategories || sheetCategories.length === 0) continue;

    let currentTopic = "";
    let currentCategory: KnowledgeCategory = sheetCategories[0];
    let blocks: string[] = [];
    let activeTable: ActiveTable | null = null;
    let topicStartRow = 0;
    let topicEndRow = 0;

    const flushTable = () => {
      if (!activeTable || activeTable.rows.length === 0) {
        activeTable = null;
        return;
      }

      const headerLine = `| ${activeTable.headers.join(" | ")} |`;
      const sepLine = `| ${activeTable.headers.map(() => "---").join(" | ")} |`;
      const bodyLines = activeTable.rows.map((cells) => {
        const sanitized = cells.map((c) => c.replace(/\|/g, "\\|").replace(/\n+/g, " "));
        return `| ${sanitized.join(" | ")} |`;
      });

      blocks.push([headerLine, sepLine, ...bodyLines].join("\n"));
      activeTable = null;
    };

    const flushTopic = () => {
      flushTable();
      const content = blocks.join("\n\n").trim();
      if (!content) {
        blocks = [];
        return;
      }

      const rawTitle = currentTopic || sheetKey.trim();
      const { title, titleEn } = enrichTitle(rawTitle);

      records.push({
        id: `${currentCategory}-${globalId++}`,
        category: currentCategory,
        subcategory: rawTitle,
        title,
        titleEn,
        content,
        tags: extractTags(`${title} ${content}`, currentCategory),
        language: detectLanguage(content),
        source: {
          sheet: sheetKey.trim(),
          rowRange: [topicStartRow, topicEndRow],
        },
      });

      blocks = [];
    };

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || isEmptyRow(row)) continue;

      topicEndRow = rowIdx;
      const nonEmpty = getNonEmptyCells(row);

      // 1. Check if this row is a table header
      if (isTableHeaderRow(row)) {
        flushTable();
        activeTable = {
          headers: nonEmpty.map((c) => c.value),
          colIndices: nonEmpty.map((c) => c.index),
          rows: [],
        };
        continue;
      }

      // 2. Check if we are inside an active table and this row fits the table
      if (activeTable) {
        const firstColIdx = activeTable.colIndices[0];
        const firstCellEmpty = !(row[firstColIdx] ?? "").trim();

        // Single-cell continuation / note row inside a table
        if (nonEmpty.length === 1) {
          const single = nonEmpty[0];
          // If it's a major topic header, break out of the table and start new topic
          if (isMajorTopicRow(single.value)) {
            flushTopic();
            currentTopic = single.value;
            currentCategory = categorizeTopic(currentTopic, sheetCategories);
            topicStartRow = rowIdx;
            continue;
          }

          // Continuation of previous product row in a later column (e.g. Virtue Balance uses)
          if (
            firstCellEmpty &&
            activeTable.rows.length > 0 &&
            activeTable.colIndices.includes(single.index)
          ) {
            const targetCol = activeTable.colIndices.indexOf(single.index);
            const prevRow = activeTable.rows[activeTable.rows.length - 1];
            prevRow[targetCol] = prevRow[targetCol]
              ? `${prevRow[targetCol]} • ${single.value}`
              : single.value;
            continue;
          }

          // Otherwise if it's a short note like "(هيالورونيك أسيد)" or "غير متوفر ولكن...", append to previous row or close table
          if (
            activeTable.rows.length > 0 &&
            (single.value.startsWith("(") ||
              single.value.includes("غير متوفر") ||
              single.value.includes("للوجه والجسم"))
          ) {
            const prevRow = activeTable.rows[activeTable.rows.length - 1];
            const lastIdx = prevRow.length - 1;
            prevRow[lastIdx] = prevRow[lastIdx]
              ? `${prevRow[lastIdx]} (${single.value})`
              : single.value;
            continue;
          }

          // Otherwise table has ended — fall through to normal single-cell handling
          flushTable();
        } else {
          // Multi-cell row inside a table: check if it maps to table columns
          // Handle special multi-row case like Xeomin where col 0 has origin lines ("ألمانيا", "Allergan- امريكي")
          const mappedRow = activeTable.colIndices.map((colIdx) =>
            (row[colIdx] ?? "").trim()
          );
          const populatedCount = mappedRow.filter((v) => v !== "").length;

          if (populatedCount >= 2 || (firstCellEmpty && populatedCount >= 1)) {
            // If first cell is empty and last row exists, merge instead of adding empty-key row
            if (firstCellEmpty && activeTable.rows.length > 0) {
              const prevRow = activeTable.rows[activeTable.rows.length - 1];
              mappedRow.forEach((val, idx) => {
                if (val) {
                  prevRow[idx] = prevRow[idx] ? `${prevRow[idx]} • ${val}` : val;
                }
              });
            } else {
              activeTable.rows.push(mappedRow);
            }
            continue;
          }

          flushTable();
        }
      }

      // 3. Single-cell row outside table
      if (nonEmpty.length === 1) {
        const text = nonEmpty[0].value;

        // Check if this starts a new major topic
        if (isMajorTopicRow(text)) {
          // Only flush if we already have content in the current topic
          if (blocks.length > 0 || currentTopic) {
            flushTopic();
          }
          currentTopic = text;
          currentCategory = categorizeTopic(currentTopic, sheetCategories);
          topicStartRow = rowIdx;
          continue;
        }

        // Subheading inside current topic (short single line ending with ":" or short sub-label)
        if (text.length < 70 && !text.includes("\n") && text.endsWith(":")) {
          blocks.push(`**${text}**`);
        } else if (text.length < 45 && !text.includes("\n") && blocks.length > 0) {
          blocks.push(`**${text}**`);
        } else {
          blocks.push(text);
        }
        continue;
      }

      // 4. Multi-cell row without an active table
      const joined = nonEmpty.map((c) => c.value).join(" — ");
      if (joined) {
        // Check if first cell is a major topic (like Tattoo Removal row 2)
        if (isMajorTopicRow(nonEmpty[0].value)) {
          flushTopic();
          currentTopic = nonEmpty[0].value;
          currentCategory = categorizeTopic(currentTopic, sheetCategories);
          topicStartRow = rowIdx;
          const rest = nonEmpty
            .slice(1)
            .map((c) => c.value)
            .join(" — ");
          if (rest) blocks.push(rest);
        } else {
          blocks.push(joined);
        }
      }
    }

    flushTopic();
  }

  return records;
}
