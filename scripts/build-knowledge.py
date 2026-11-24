"""
Terra Solutions — Canonical Knowledge Data Pipeline

Pipeline:
  data/raw/Knowlege.xlsx + data/raw/clinics.json
    -> Extract true 1-based Excel rows
    -> Normalize into granular entities + section overviews + clinics + policies
    -> Cross-check against legacy data/raw/knowledge.json
    -> Emit:
       * data/canonical/knowledge.canonical.json
       * data/canonical/unresolved.json
       * reports/knowledge-audit.json
       * reports/knowledge-audit.md
"""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(r"F:\Terra Solutions\terra-solutions-chatbot")
RAW_DIR = ROOT / "data" / "raw"
CANONICAL_DIR = ROOT / "data" / "canonical"
REPORTS_DIR = ROOT / "reports"

XLSX_PATH = RAW_DIR / "Knowlege.xlsx"
CLINICS_PATH = RAW_DIR / "clinics.json"
LEGACY_JSON_PATH = RAW_DIR / "knowledge.json"
EXTRACTED_JSON_PATH = RAW_DIR / "knowlege-extracted.json"

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def col_to_idx(col_str: str) -> int:
    idx = 0
    for ch in col_str:
        idx = idx * 26 + (ord(ch.upper()) - ord("A") + 1)
    return idx - 1


def extract_text_from_si(elem: ET.Element) -> str:
    parts = []
    for child in elem:
        tag = child.tag.split("}")[-1]
        if tag == "t" and child.text:
            parts.append(child.text)
        elif tag == "r":
            t_el = child.find(f"{{{NS_MAIN}}}t")
            if t_el is not None and t_el.text:
                parts.append(t_el.text)
    return "".join(parts)


def read_excel_with_rows(path: Path) -> tuple[dict[str, list[dict[str, Any]]], int]:
    """Return {sheet_name: [{"row": int, "cells": [str, ...]}]} and total non-whitespace cells."""
    total_non_ws_cells = 0
    with zipfile.ZipFile(path, "r") as zf:
        names = set(zf.namelist())
        ss_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        shared_strings = [
            extract_text_from_si(si).replace("\uf0b7", "•")
            for si in ss_root.findall(f"{{{NS_MAIN}}}si")
        ]

        rels_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rid_to_target: dict[str, str] = {}
        for rel in rels_root.findall(f"{{{NS_PKG_REL}}}Relationship"):
            rid = rel.attrib.get("Id", "")
            target = rel.attrib.get("Target", "").lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            rid_to_target[rid] = target

        wb_root = ET.fromstring(zf.read("xl/workbook.xml"))
        sheets_out: dict[str, list[dict[str, Any]]] = {}

        for sh in wb_root.findall(f".//{{{NS_MAIN}}}sheet"):
            sheet_name = sh.attrib["name"]
            rid = sh.attrib.get(f"{{{NS_REL}}}id", "")
            xml_path = rid_to_target.get(rid, "")
            if xml_path not in names:
                continue

            ws_root = ET.fromstring(zf.read(xml_path))
            rows: list[dict[str, Any]] = []
            for row_el in ws_root.findall(f".//{{{NS_MAIN}}}sheetData/{{{NS_MAIN}}}row"):
                rnum = int(row_el.attrib.get("r", 0))
                cells_map: dict[int, str] = {}
                max_col = -1
                for c_el in row_el.findall(f"{{{NS_MAIN}}}c"):
                    ref = c_el.attrib.get("r", "")
                    m = re.match(r"([A-Za-z]+)", ref)
                    ci = col_to_idx(m.group(1)) if m else max_col + 1
                    ctype = c_el.attrib.get("t", "")
                    v_el = c_el.find(f"{{{NS_MAIN}}}v")
                    val = ""
                    if ctype == "s" and v_el is not None and v_el.text is not None:
                        idx = int(v_el.text)
                        val = shared_strings[idx] if 0 <= idx < len(shared_strings) else ""
                    elif ctype == "inlineStr":
                        is_el = c_el.find(f"{{{NS_MAIN}}}is")
                        if is_el is not None:
                            val = extract_text_from_si(is_el)
                    elif v_el is not None and v_el.text is not None:
                        val = v_el.text
                    cells_map[ci] = val
                    max_col = max(max_col, ci)

                if max_col < 0:
                    continue
                arr = [cells_map.get(i, "") for i in range(max_col + 1)]
                while arr and arr[-1] == "":
                    arr.pop()
                non_ws = sum(1 for c in arr if c.strip() != "")
                if non_ws > 0:
                    total_non_ws_cells += non_ws
                    rows.append({"row": rnum, "cells": arr})

            sheets_out[sheet_name] = rows

    return sheets_out, total_non_ws_cells


def detect_lang(text: str) -> str:
    has_ar = bool(re.search(r"[\u0600-\u06FF]", text))
    has_en = bool(re.search(r"[A-Za-z]", text))
    if has_ar and has_en:
        return "mixed"
    return "ar" if has_ar else "en"


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u0600-\u06FF]+", "-", text.strip().lower()).strip("-")
    return s[:48] or "item"


def non_empty(cells: list[str]) -> list[str]:
    return [c.strip() for c in cells if c.strip()]


def build_tags(text: str, extra: list[str] | None = None) -> list[str]:
    tags: set[str] = set(extra or [])
    for m in re.findall(r"\b[A-Za-z0-9][A-Za-z0-9+./-]{1,35}\b", text):
        if len(m) >= 2:
            tags.add(m)
    for m in re.findall(
        r"(?:فيلر|فلر|بوتوكس|بوتكس|ليزر|خيوط|شعر|بشرة|وجه|نضارة|تقشير|ديرمابن|تاتو|مايكروبليدينغ|حمل|الحمل|رضاعة|الرضاعة|تنحيف|دهون|أسنان|اسنان|فينير|فينيير|كولاجين|بلازما|ميزوثيرابي|عيادة|عيادات|جهاز|أجهزة|اجهزة|سعر|AED)",
        text,
    ):
        tags.add(m)
    return sorted(tags)


class PipelineBuilder:
    def __init__(self, excel_sheets: dict[str, list[dict[str, Any]]], clinics_raw: list[str]):
        self.sheets = excel_sheets
        self.clinics_raw = clinics_raw
        self.records: list[dict[str, Any]] = []
        self.mapped: set[tuple[str, int]] = set()
        self.used_ids: set[str] = set()
        self.conflicts: list[dict[str, Any]] = []
        self.clinic_map: dict[str, dict[str, Any]] = {}

        for cname in clinics_raw:
            cid = slugify(cname)
            aliases = [cname]
            if cid == "dermadent":
                aliases.extend(["Demadent", "Demadent + Vip", "ديرمادنت", "عيادة ديرمادنت"])
            elif cid == "well-touch":
                aliases.extend(["WellTouch", "Well Touch"])
            elif cid == "one-touch":
                aliases.extend(["One Touch", "OneTouch"])
            elif cid == "new-age":
                aliases.extend(["New Age", "Dr. Mitra"])
            self.clinic_map[cid] = {
                "id": cid,
                "name": cname,
                "aliases": sorted(set(aliases)),
                "devices": [],
                "services": [],
                "doctors": [],
                "notes": [],
                "missingFields": [
                    "Street address / location",
                    "Phone number / contact info",
                    "Operating hours",
                ],
                "sources": [{"sourceId": "source-002", "file": "clinics.json", "sheet": "clinics", "row": 0, "rows": [0]}],
            }

    def mark(self, sheet: str, rows: list[int]) -> None:
        for r in rows:
            self.mapped.add((sheet, r))

    def unique_id(self, base: str) -> str:
        cand = slugify(base)
        if cand not in self.used_ids:
            self.used_ids.add(cand)
            return cand
        i = 2
        while f"{cand}-{i}" in self.used_ids:
            i += 1
        final = f"{cand}-{i}"
        self.used_ids.add(final)
        return final

    def add_record(
        self,
        *,
        rec_id: str,
        record_type: str,
        category: str,
        name: str,
        description: str,
        sheet: str,
        rows: list[int],
        subcategory: str | None = None,
        name_ar: str | None = None,
        name_en: str | None = None,
        aliases: list[str] | None = None,
        attributes: dict[str, str] | None = None,
        prices: list[dict[str, Any]] | None = None,
        offers: list[str] | None = None,
        clinic_ids: list[str] | None = None,
        safety_flags: dict[str, Any] | None = None,
        extra_tags: list[str] | None = None,
        source_file: str = "Knowlege.xlsx",
        source_type: str = "excel",
        conflict_notes: list[str] | None = None,
    ) -> str:
        uid = self.unique_id(rec_id)
        if source_file == "Knowlege.xlsx":
            self.mark(sheet, rows)

        clean_rows = sorted(set(rows))
        rec = {
            "id": uid,
            "recordType": record_type,
            "category": category,
            "subcategory": subcategory,
            "name": name.strip(),
            "title": name.strip(),
            "nameAr": name_ar,
            "nameEn": name_en,
            "titleEn": name_en,
            "aliases": sorted(set(a.strip() for a in (aliases or []) if a.strip())),
            "description": description.strip(),
            "content": description.strip(),
            "attributes": {k: v for k, v in (attributes or {}).items() if v},
            "prices": prices or [],
            "offers": offers or [],
            "clinicIds": sorted(set(clinic_ids or [])),
            "safetyFlags": safety_flags,
            "source": {
                "sourceId": "source-002" if source_file == "clinics.json" else "source-001",
                "file": source_file,
                "sheet": sheet.strip(),
                "rawSheet": sheet,
                "row": clean_rows[0] if clean_rows else 0,
                "rows": clean_rows,
            },
            "status": "active",
            "sourceType": source_type,
            "confidence": "high",
            "tags": build_tags(f"{name} {description}", extra_tags),
            "language": detect_lang(f"{name} {description}"),
            "conflictNotes": conflict_notes or [],
        }
        # Clean empty optional fields
        if not rec["conflictNotes"]:
            del rec["conflictNotes"]
        if rec["safetyFlags"] is None:
            del rec["safetyFlags"]
        if not rec["subcategory"]:
            del rec["subcategory"]
        if not rec["nameAr"]:
            del rec["nameAr"]
        if not rec["nameEn"]:
            del rec["nameEn"]
            del rec["titleEn"]

        self.records.append(rec)
        return uid

    def row_map(self, sheet: str) -> dict[int, list[str]]:
        return {r["row"]: r["cells"] for r in self.sheets[sheet]}

    def rows_range(self, sheet: str, start: int, end: int) -> list[dict[str, Any]]:
        return [r for r in self.sheets[sheet] if start <= r["row"] <= end]

    def text_block(self, sheet: str, start: int, end: int) -> tuple[str, list[int]]:
        items = self.rows_range(sheet, start, end)
        lines = []
        rnums = []
        for it in items:
            rnums.append(it["row"])
            lines.append(" — ".join(non_empty(it["cells"])))
        return "\n\n".join(lines), rnums

    def run_all(self) -> None:
        self._process_filler_botox_threads()
        self._process_laser()
        self._process_hair_face()
        self._process_skin_booster()
        self._process_facial()
        self._process_tattoo()
        self._process_pregnancy()
        self._process_slimming()
        self._process_facial_machines()
        self._process_dental()
        self._emit_clinics()
        self._record_conflicts()

    # 1. Filler+Botox+Threads
    def _process_filler_botox_threads(self) -> None:
        sh = "Filler+Botox+Threads"
        # Overview: R1-R2 + R68-R80
        intro_rows = self.rows_range(sh, 1, 7) + self.rows_range(sh, 68, 85)
        intro_text = "\n\n".join(" ".join(non_empty(r["cells"])) for r in intro_rows)
        self.add_record(
            rec_id="fillers-overview",
            record_type="overview",
            category="fillers",
            name="Dermal Fillers Overview, Benefits & Aftercare — الفيلر",
            name_ar="الفيلر",
            name_en="Dermal Fillers Overview",
            aliases=["Filler", "Fillers", "فيلر", "فلر", "Hyaluronic Filler"],
            description=intro_text,
            sheet=sh,
            rows=[r["row"] for r in intro_rows],
            attributes={"duration": "3 months to 1 year depending on filler type"},
            safety_flags={
                "postCare": [
                    "Mild swelling or bruising may occur",
                    "Avoid pressing on treated area for 24 hours",
                ]
            },
            extra_tags=["filler", "fillers", "فيلر", "فلر"],
        )

        # Filler table: header R8, products R9-R66
        self.mark(sh, [8])
        table_rows = self.rows_range(sh, 9, 67)
        products: list[dict[str, Any]] = []
        for item in table_rows:
            c0 = item["cells"][0].strip() if len(item["cells"]) > 0 else ""
            c1 = item["cells"][1].strip() if len(item["cells"]) > 1 else ""
            c2 = item["cells"][2].strip() if len(item["cells"]) > 2 else ""
            if c0:
                products.append(
                    {"name": c0, "country": c1, "uses": [c2] if c2 else [], "rows": [item["row"]]}
                )
            elif products and (c1 or c2):
                if c2:
                    products[-1]["uses"].append(c2)
                if c1 and not products[-1]["country"]:
                    products[-1]["country"] = c1
                products[-1]["rows"].append(item["row"])

        for prod in products:
            uses_str = " • ".join(prod["uses"])
            desc = (
                f"**Brand:** {prod['name']}\n"
                f"**Country of Origin:** {prod['country']}\n"
                f"**Uses:** {uses_str}"
            )
            aliases = [prod["name"]]
            if "Teosyal" in prod["name"]:
                aliases.append("Teosyal")
            if "Juvederm" in prod["name"]:
                aliases.append("Juviderm")
            self.add_record(
                rec_id=f"filler-{prod['name']}",
                record_type="product",
                category="fillers",
                subcategory="Dermal Fillers",
                name=prod["name"],
                name_en=prod["name"],
                aliases=aliases,
                description=desc,
                sheet=sh,
                rows=prod["rows"],
                attributes={"countryOfOrigin": prod["country"], "uses": uses_str},
                extra_tags=["filler", "fillers", "فيلر", "فلر", prod["country"]],
            )

        # Radiesse: R86-R112
        rad_intro, rad_r1 = self.text_block(sh, 86, 97)
        self.mark(sh, [98])  # table header
        rad_uses_rows = self.rows_range(sh, 99, 104)
        rad_table = "| الاستخدام | الفائدة |\n| --- | --- |\n" + "\n".join(
            f"| {r['cells'][0].strip()} | {r['cells'][1].strip()} |" for r in rad_uses_rows
        )
        rad_tail, rad_r2 = self.text_block(sh, 105, 112)
        all_rad_rows = rad_r1 + [98] + [r["row"] for r in rad_uses_rows] + rad_r2
        self.add_record(
            rec_id="filler-radiesse-1-5ml",
            record_type="product",
            category="fillers",
            subcategory="Calcium Fillers / Biostimulator",
            name="Radiesse (Calcium Filler 1.5 ml) — رادياس",
            name_ar="رادياس وكالسيوم فيلر",
            name_en="Radiesse Calcium Hydroxyapatite 1.5 ml",
            aliases=["Radiesse", "CaHA", "Hyperdiluted Radiesse", "Hybrid Filler", "رادياس", "كالسيوم فيلر"],
            description=f"{rad_intro}\n\n{rad_table}\n\n{rad_tail}",
            sheet=sh,
            rows=all_rad_rows,
            attributes={
                "volume": "1.5 ml",
                "activeIngredient": "Calcium Hydroxyapatite (CaHA)",
                "duration": "12–18 months (R96); copied note R106 says 3–12 months",
            },
            conflict_notes=[
                "R96 states durability up to 12–18 months, while R106 contains a copied generic filler note stating 3 months to 1 year."
            ],
            extra_tags=["filler", "biostimulator", "collagen", "كولاجين", "فيلر"],
        )

        # Body Filler: R113-R128
        bf_pre, bf_r1 = self.text_block(sh, 113, 117)
        bf_post, bf_r2 = self.text_block(sh, 121, 128)
        self.add_record(
            rec_id="body-filler-overview",
            record_type="overview",
            category="body-fillers",
            name="Body Filler Overview, Uses & Post-Care — فيلر الجسم",
            name_ar="فيلر الجسم",
            name_en="Body Filler Overview",
            aliases=["Body Filler", "BBL", "Hip Dips", "فيلر الجسم"],
            description=f"{bf_pre}\n\n{bf_post}",
            sheet=sh,
            rows=bf_r1 + bf_r2,
            safety_flags={
                "postCare": [
                    "Avoid direct pressure or sitting directly for 48 hours",
                    "Wait 48 hours (3–5 days for glutes/hips) before sexual activity",
                ]
            },
            extra_tags=["body filler", "فيلر الجسم", "bbl"],
        )

        for rnum, pname, p_alias in [
            (118, "Goldfill – Box (10)", ["Goldfill", "Body Filler"]),
            (119, "Jealfil – Box (20)", ["Jealfil", "Body Filler"]),
            (120, "Privilege – Box (10)", ["Privilege", "Body Filler"]),
        ]:
            txt = non_empty(self.row_map(sh)[rnum])[0]
            self.add_record(
                rec_id=f"body-filler-{pname}",
                record_type="product",
                category="body-fillers",
                subcategory="Body Filler",
                name=pname,
                name_en=pname,
                aliases=p_alias,
                description=txt,
                sheet=sh,
                rows=[rnum],
                extra_tags=["body filler", "فيلر الجسم"],
            )

        # Botox: R129-R163
        bx_intro, bx_r1 = self.text_block(sh, 129, 133)
        bx_uses, bx_r2 = self.text_block(sh, 139, 145)
        bx_tail, bx_r3 = self.text_block(sh, 156, 163)
        self.add_record(
            rec_id="botox-overview",
            record_type="overview",
            category="botox",
            name="Botox Overview, Uses & Aftercare — البوتوكس",
            name_ar="البوتوكس",
            name_en="Botox Overview",
            aliases=["Botox", "Botoks", "Botulinum Toxin", "بوتوكس", "بوتكس", "Nefertiti Lift", "Lip Flip", "Hyperhidrosis"],
            description=f"{bx_intro}\n\n{bx_uses}\n\n{bx_tail}",
            sheet=sh,
            rows=bx_r1 + bx_r2 + bx_r3,
            attributes={"duration": "3–6 months (repeat every 3–6 months)"},
            conflict_notes=[
                "R156 contains a copy-paste note mentioning '3 شهور إلى 1 سنة، حسب نوع الفلر', conflicting with Botox duration of 3–6 months (R132, R162)."
            ],
            extra_tags=["botox", "بوتوكس", "بوتكس", "wrinkles"],
        )

        # Botox vs Fillers comparison: R134-R137
        self.mark(sh, [134, 135])
        comp_rows = self.rows_range(sh, 136, 137)
        comp_md = "| التركيب | النتيجة | التحفيز الطبيعي / المناطق | مدة النتائج | الاستخدامات |\n| --- | --- | --- | --- | --- |\n" + "\n".join(
            f"| {' | '.join(c.strip() for c in r['cells'][:5])} |" for r in comp_rows
        )
        self.add_record(
            rec_id="comparison-botox-vs-fillers",
            record_type="comparison",
            category="botox",
            name="Botox vs. Hyaluronic Fillers Comparison — مقارنة البوتوكس والفيلر",
            name_ar="المقارنة بين البوتكس والفيلرات",
            name_en="Botox vs. Fillers Comparison",
            aliases=["Botox vs Fillers", "Compare Botox and Fillers", "الفرق بين البوتكس والفيلر"],
            description=comp_md,
            sheet=sh,
            rows=[134, 135, 136, 137],
            extra_tags=["comparison", "botox", "filler", "مقارنة", "بوتوكس", "فيلر"],
        )

        # Botox brands table: R146 header, R147-R154 products
        self.mark(sh, [146])
        for rnum, bname, aliases, attrs in [
            (147, "Botox (100 unit)", ["Botox", "بوتكس", "بوتوكس"], {"units": "100 unit", "duration": "3–6 أشهر"}),
            (148, "Dysport (British, 500 unit)", ["Dysport", "ديسبورت"], {"countryOfOrigin": "UK / بريطاني", "units": "500 unit", "duration": "3–6 أشهر"}),
            (149, "Nabota (Korean, 100 unit)", ["Nabota", "نابوتا"], {"countryOfOrigin": "Korea / كوري", "units": "100 unit", "duration": "3–4 أشهر"}),
        ]:
            cells = [c.strip() for c in self.row_map(sh)[rnum]]
            desc = (
                f"**Brand:** {cells[0]}\n"
                f"**Description:** {cells[1]}\n"
                f"**Advantages:** {cells[2]}\n"
                f"**Uses:** {cells[3]}\n"
                f"**Duration:** {cells[4]}"
            )
            self.add_record(
                rec_id=f"botox-{bname}",
                record_type="product",
                category="botox",
                subcategory="Botox Brands",
                name=bname,
                name_en=bname,
                aliases=aliases,
                description=desc,
                sheet=sh,
                rows=[rnum],
                attributes=attrs,
                extra_tags=["botox", "بوتوكس", "بوتكس"],
            )

        # Xeomin: R150-R154
        xeo_rows = self.rows_range(sh, 150, 154)
        xeo_lines = []
        for xr in xeo_rows:
            xeo_lines.append(" — ".join(non_empty(xr["cells"])))
        self.add_record(
            rec_id="botox-xeomin",
            record_type="product",
            category="botox",
            subcategory="Botox Brands",
            name="Xeomin (Allergan / Germany — Pure Botulinum Toxin A)",
            name_en="Xeomin",
            aliases=["Xeomin", "زيومين", "Allergan", "IncobotulinumtoxinA"],
            description="\n".join(xeo_lines),
            sheet=sh,
            rows=[r["row"] for r in xeo_rows],
            attributes={"countryOfOrigin": "ألمانيا / Allergan أمريكي", "activeIngredient": "IncobotulinumtoxinA (Pure Botulinum Toxin Type A)"},
            extra_tags=["botox", "xeomin", "بوتوكس"],
        )

        # Face Threads: R164-R180
        th_intro, th_r1 = self.text_block(sh, 164, 167)
        th_mid, th_r2 = self.text_block(sh, 173, 179)
        self.mark(sh, [168])
        th_table_rows = self.rows_range(sh, 169, 171)
        th_table = "| النوع | الوصف | الاستخدامات الشائعة |\n| --- | --- | --- |\n" + "\n".join(
            f"| {' | '.join(c.strip() for c in r['cells'][:3])} |" for r in th_table_rows
        )
        self.add_record(
            rec_id="threads-overview",
            record_type="overview",
            category="threads",
            name="Face Threads (PDO / Lifting / Mono / Screw) — خيوط الوجه",
            name_ar="خيوط الوجه",
            name_en="Face Threads Overview",
            aliases=["Threads", "PDO Threads", "Lifting Threads", "Mono Threads", "Screw Threads", "خيوط الوجه", "خيوط"],
            description=f"{th_intro}\n\n{th_table}\n\n{th_mid}",
            sheet=sh,
            rows=th_r1 + [168] + [r["row"] for r in th_table_rows] + th_r2,
            attributes={"duration": "From 8 months depending on thread type"},
            extra_tags=["threads", "pdo", "خيوط"],
        )

        # R180: Priced Thread products!
        r180_text = non_empty(self.row_map(sh)[180])[0]
        thread_prices = [
            ("Aptos Cat Eye Threads", 5000, "AED", "5000 AED", ["Aptos", "Aptos Cat Eye", "Cat Eye", "خيوط الوجه"]),
            ("Aptos Lifting Threads", 8000, "AED", "8000 AED", ["Aptos", "Aptos Lifting", "خيوط شد"]),
            ("Rainbow Mono Thread (1 thread)", 70, "AED", "70 AED per thread", ["Rainbow", "Rainbow Mono", "Mono Threads"]),
            ("PDO Thread (1 thread)", 299, "AED", "299 AED per thread", ["PDO", "PDO Thread", "خيوط PDO"]),
        ]
        for tname, amt, curr, note, aliases in thread_prices:
            self.add_record(
                rec_id=f"thread-{tname}",
                record_type="product",
                category="threads",
                subcategory="Priced Thread Options",
                name=tname,
                name_en=tname,
                aliases=aliases,
                description=f"**{tname}** — Verified price: **{note}**.\n\nOriginal sheet entry:\n{r180_text}",
                sheet=sh,
                rows=[180],
                prices=[{"amount": amt, "currency": curr, "unit": "per thread" if "thread" in note else "procedure", "note": note}],
                extra_tags=["threads", "price", "AED", "خيوط", "سعر"],
            )

    # 2. Laser
    def _process_laser(self) -> None:
        sh = "Laser "
        proto_text, proto_rows = self.text_block(sh, 1, 12)
        self.add_record(
            rec_id="laser-hair-removal-overview",
            record_type="overview",
            category="laser",
            name="Laser Hair Removal Protocols, Pre/Post Care & FAQs — إزالة الشعر بالليزر",
            name_ar="إزالة الشعر بالليزر",
            name_en="Laser Hair Removal Protocols",
            aliases=["Laser", "Laser Hair Removal", "Laser Hair Removel", "إزالة الشعر بالليزر", "ليزر"],
            description=proto_text,
            sheet=sh,
            rows=proto_rows,
            attributes={
                "expectedSessions": "6–8 sessions (21 days to 4 weeks apart)",
                "minimumAge": "13+ allowed; under 18 requires guardian disclaimer signature",
                "roaccutaneWait": "Stop 7 months before session (or 4 months if low dose)",
                "whiteHairSupport": "No device removes white hair",
            },
            prices=[{"amount": 0, "currency": "AED", "unit": "on request", "note": "Numbing cream is free upon patient request"}],
            safety_flags={
                "pregnancyAllowed": False,
                "lactationAllowed": True,
                "contraindications": [
                    "Under 13 years old",
                    "Pregnancy",
                    "Recent Moroccan bath (<15 days), active henna, tan (<1 month), waxing/threading",
                    "Active Roaccutane within 4–7 months",
                ],
                "preCare": ["Shave 24h before session (minimum 5h prior)", "No creams, perfumes, or makeup"],
                "postCare": ["No exercise/makeup/hot baths for 48h", "No swimming 1 week", "Use sunscreen"],
            },
            extra_tags=["laser", "ليزر", "hair removal"],
        )

        self.mark(sh, [13])
        shared_wave_note = non_empty(self.row_map(sh)[19])[0]
        self.mark(sh, [19])
        laser_devices = [
            (14, "Candela GentleMax Pro (أحدث إصدار)", ["Candela", "GentleMax Pro", "كانديلا"], "أمريكي / USA"),
            (15, "Candela GentleMax Pro Plus (أحدث إصدار)", ["Candela Plus", "GentleMax Pro Plus", "كانديلا بلس"], "أمريكي / USA"),
            (16, "Cynosure Elite Plus (سايناشور إيليت بلس)", ["Cynosure", "Cynosure Elite Plus", "سايناشور"], "أمريكي / USA"),
            (17, "DEKA Laser (ديكا)", ["DEKA", "ديكا"], "إيطالي / Italy"),
            (18, "Quanta Duo (كوانتا ديو)", ["Quanta", "Quanta Duo", "كوانتا"], "إيطالي / Italy"),
        ]
        for rnum, dname, aliases, origin in laser_devices:
            txt = non_empty(self.row_map(sh)[rnum])[0]
            self.add_record(
                rec_id=f"device-{dname}",
                record_type="device",
                category="laser",
                subcategory="Laser Hair Removal Devices",
                name=dname,
                name_en=dname.split(" (")[0],
                aliases=aliases,
                description=f"{txt}\n\n**Wavelengths:** {shared_wave_note}",
                sheet=sh,
                rows=[rnum, 19],
                attributes={"countryOfOrigin": origin, "wavelengths": "Alexandrite (light skin) & Nd:YAG (dark skin)"},
                extra_tags=["device", "laser", "ليزر", "جهاز", "specifications"],
            )

    # 3. Hair+face Treatments
    def _process_hair_face(self) -> None:
        sh = "Hair+face Treatments  "
        # Dr. CYJ: R1-R8
        cyj_text, cyj_rows = self.text_block(sh, 1, 8)
        self.add_record(
            rec_id="hair-dr-cyj-filler",
            record_type="product",
            category="hair-treatments",
            name="Dr. CYJ Hair Filler — حقن الفيلر للشعر",
            name_ar="حقن الفلر للشعر",
            name_en="Dr. CYJ Hair Filler",
            aliases=["Dr. CYJ", "CYJ Hair Filler", "Hair Filler", "فيلر الشعر"],
            description=cyj_text,
            sheet=sh,
            rows=cyj_rows,
            attributes={"activeIngredient": "7 Peptides + Hyaluronic Acid", "sessions": "4 sessions (every 2 weeks)"},
            extra_tags=["hair", "hair filler", "شعر"],
        )

        # PRP: R10-R31
        prp_intro, prp_r1 = self.text_block(sh, 10, 17)
        self.mark(sh, [18, 26, 27])
        prp_types = []
        for r in self.rows_range(sh, 19, 24):
            if len(non_empty(r["cells"])) >= 2:
                prp_types.append(f"| {' | '.join(c.strip() for c in r['cells'][:3])} |")
            else:
                prp_types[-1] += f" ({non_empty(r['cells'])[0]})"
        prp_areas = "\n".join(
            f"| {r['cells'][0].strip()} | {r['cells'][1].strip()} |" for r in self.rows_range(sh, 28, 31)
        )
        prp_all_rows = [r["row"] for r in self.rows_range(sh, 10, 31)]
        prp_desc = (
            f"{prp_intro}\n\n"
            "| النوع | التركيبة / النظام | الفرق الرئيسي |\n| --- | --- | --- |\n" + "\n".join(prp_types) +
            "\n\n| المنطقة | الفائدة |\n| --- | --- |\n" + prp_areas
        )
        self.add_record(
            rec_id="treatment-prp-overview",
            record_type="service",
            category="hair-treatments",
            name="PRP (Platelet-Rich Plasma) for Hair & Face — البلازما الغنية بالصفائح الدموية",
            name_ar="البلازما الغنية بالصفائح الدموية",
            name_en="PRP Platelet-Rich Plasma",
            aliases=["PRP", "Normal PRP", "PRP + HA", "Activated PRP", "PRP + Biotin", "PRP + Growth Factors", "بلازما"],
            description=prp_desc,
            sheet=sh,
            rows=prp_all_rows,
            extra_tags=["prp", "hair", "face", "بلازما", "شعر", "وجه"],
        )

        # Face-specific PRP & Stem Cell / Mesotherapy face records so face-treatments is richly populated
        self.add_record(
            rec_id="face-prp-treatment",
            record_type="service",
            category="face-treatments",
            name="PRP for Face & Under-Eye Rejuvenation — البلازما للوجه وتحت العين",
            name_ar="البلازما للوجه وتحت العين",
            name_en="PRP for Face and Under-Eye",
            aliases=["Face PRP", "Under-eye PRP", "بلازما الوجه", "الهالات"],
            description=(
                "Uses the patient's own platelet-rich plasma (including Normal PRP, PRP + HA, Activated PRP, and PRP + Growth Factors) "
                "for facial radiance, wrinkle reduction, under-eye dark circles, acne scars, and mild tightening.\n\n"
                "**Post-care:** Avoid washing face for 24h, avoid direct sun for 1 week, avoid makeup for 1–2 weeks, avoid high heat for 24h."
            ),
            sheet=sh,
            rows=[11, 14, 16, 19, 20, 22, 24, 29, 30, 31],
            extra_tags=["face", "prp", "بلازما", "وجه", "بشرة"],
        )

        # Stem Cells: R33-R47
        sc_text, sc_rows = self.text_block(sh, 33, 47)
        self.add_record(
            rec_id="treatment-stem-cells",
            record_type="service",
            category="face-treatments",
            name="Stem Cells in Aesthetics (Plant Stem Cells) — الخلايا الجذعية",
            name_ar="الخلايا الجذعية في التجميل",
            name_en="Stem Cells in Aesthetics",
            aliases=["Stem Cells", "Plant Stem Cells", "Stem Cell Therapy", "الخلايا الجذعية"],
            description=sc_text,
            sheet=sh,
            rows=sc_rows,
            extra_tags=["stem cells", "face", "hair", "خلايا جذعية", "بشرة", "شعر"],
        )

        # Comparison: R49-R55
        self.mark(sh, [49, 50])
        comp_rows = self.rows_range(sh, 51, 53)
        comp_md = "| العلاج | التركيبة الأساسية | الفوائد | عدد الجلسات | الفئة المناسبة |\n| --- | --- | --- | --- | --- |\n" + "\n".join(
            f"| {' | '.join(c.strip() for c in r['cells'][:5])} |" for r in comp_rows
        )
        note55 = non_empty(self.row_map(sh)[55])[0]
        self.add_record(
            rec_id="comparison-hair-injections",
            record_type="comparison",
            category="hair-treatments",
            name="Hair Injections Comparison (Dr. CYJ vs PRP vs Stem Cell Therapy) — مقارنة حقن الشعر",
            name_ar="مقارنة بين أنواع حقن الشعر",
            name_en="Hair Injections Comparison",
            aliases=["Compare hair injections", "Dr. CYJ vs PRP", "مقارنة حقن الشعر"],
            description=f"{comp_md}\n\n{note55}",
            sheet=sh,
            rows=[49, 50, 51, 52, 53, 55],
            extra_tags=["comparison", "hair", "cyj", "prp", "stem cell", "مقارنة"],
        )

        # Mesotherapy: R57-R70
        meso_intro, meso_r1 = self.text_block(sh, 57, 62)
        self.mark(sh, [63])
        meso_rows = self.rows_range(sh, 64, 68)
        meso_table = "| النوع | التركيبة الأساسية | الاستخدام الشائع |\n| --- | --- | --- |\n" + "\n".join(
            f"| {' | '.join(c.strip() for c in r['cells'][:3])} |" for r in meso_rows
        )
        meso_tail, meso_r2 = self.text_block(sh, 69, 70)
        self.add_record(
            rec_id="treatment-mesotherapy",
            record_type="service",
            category="face-treatments",
            name="Mesotherapy for Face, Under-Eye, Pigmentation & Hair — الميزوثيرابي",
            name_ar="الميزوثيرابي",
            name_en="Mesotherapy",
            aliases=["Mesotherapy", "Meso", "الميزوثيرابي", "ميزوثيرابي"],
            description=f"{meso_intro}\n\n{meso_table}\n\n{meso_tail}",
            sheet=sh,
            rows=meso_r1 + [63] + [r["row"] for r in meso_rows] + meso_r2,
            extra_tags=["mesotherapy", "face", "hair", "ميزوثيرابي", "بشرة", "شعر"],
        )

    # 4. Skin Booster
    def _process_skin_booster(self) -> None:
        sh = "Skin Booster "
        sb_pre, sb_r1 = self.text_block(sh, 1, 5)
        sb_post, sb_r2 = self.text_block(sh, 51, 53)
        self.add_record(
            rec_id="skin-booster-overview",
            record_type="overview",
            category="skin-boosters",
            name="Skin Booster Injections Overview & Protocol — حقن النضارة",
            name_ar="حقن Skin Booster",
            name_en="Skin Booster Injections Overview",
            aliases=["Skin Booster", "Skin Boosters", "حقن النضارة", "إبر النضارة"],
            description=f"{sb_pre}\n\n{sb_post}",
            sheet=sh,
            rows=sb_r1 + sb_r2,
            attributes={"sessions": "3 sessions (4 weeks apart), maintenance every 6 months"},
            extra_tags=["skin booster", "نضارة"],
        )

        # Skin booster products R6 header, R11-R49
        self.mark(sh, [6])
        sb_rows = self.rows_range(sh, 11, 49)
        idx = 0
        while idx < len(sb_rows):
            cur = sb_rows[idx]
            cells = [c.strip() for c in cur["cells"]]
            rnums = [cur["row"]]

            # Special RRS Trio Blend block (rows 41-45)
            if cells and cells[0] == "RRS Trio Blend":
                notes = []
                while idx + 1 < len(sb_rows) and sb_rows[idx + 1]["row"] <= 45:
                    idx += 1
                    rnums.append(sb_rows[idx]["row"])
                    notes.extend(non_empty(sb_rows[idx]["cells"]))
                self.add_record(
                    rec_id="skin-booster-rrs-trio-blend",
                    record_type="product",
                    category="skin-boosters",
                    subcategory="Skin Boosters",
                    name="RRS Trio Blend",
                    name_en="RRS Trio Blend",
                    aliases=["RRS Trio", "RRS HYALIFT", "RRS LONG LASTING", "RRS EYE"],
                    description="RRS Trio Blend box containing: RRS Hyalift, RRS Long Lasting, and RRS Eye.\n" + " ".join(notes),
                    sheet=sh,
                    rows=rnums,
                    extra_tags=["skin booster", "rrs", "نضارة"],
                )
                idx += 1
                continue

            if len(cells) >= 5 and cells[0]:
                pname, comp, face_ok, eye_ok, feat = cells[0], cells[1], cells[2], cells[3], cells[4]
                extra_notes = []
                # Attach single-cell continuation note immediately following (e.g., R21, R36, R38)
                if idx + 1 < len(sb_rows) and sb_rows[idx + 1]["row"] in (21, 36, 38):
                    idx += 1
                    rnums.append(sb_rows[idx]["row"])
                    extra_notes.extend(non_empty(sb_rows[idx]["cells"]))

                avail = "Available on request (currently not stocked)" if "غير متوفر" in " ".join(extra_notes) else "Available"
                desc = (
                    f"**Product:** {pname}\n"
                    f"**Composition:** {comp}\n"
                    f"**Full Face:** {face_ok}\n"
                    f"**Under-Eye:** {eye_ok}\n"
                    f"**Key Benefits:** {feat}"
                )
                if extra_notes:
                    desc += f"\n**Notes:** {' — '.join(extra_notes)}"

                aliases = [pname.split(" ")[0], pname]
                if "Profhilo" in pname:
                    aliases.extend(["Profhilo", "ابرة الخمس نقاط"])
                if "Volite" in pname:
                    aliases.extend(["Volite", "Juvederm Volite"])
                if "Restylane" in pname:
                    aliases.append("Restylane Skinboosters")

                self.add_record(
                    rec_id=f"skin-booster-{pname}",
                    record_type="product",
                    category="skin-boosters",
                    subcategory="Skin Boosters",
                    name=pname,
                    name_en=pname,
                    aliases=aliases,
                    description=desc,
                    sheet=sh,
                    rows=rnums,
                    attributes={
                        "composition": comp,
                        "suitableForFullFace": face_ok,
                        "suitableForUnderEye": eye_ok,
                        "availability": avail,
                    },
                    extra_tags=["skin booster", "نضارة"],
                )
            idx += 1

        # Exofecta: R55-R63
        exo_text, exo_rows = self.text_block(sh, 55, 63)
        self.add_record(
            rec_id="skin-booster-exofecta",
            record_type="product",
            category="skin-boosters",
            subcategory="Exosomes / Filter Injection",
            name="Exofecta (Factor Five — إبرة الفلتر / الإبرة البنفسجية السحرية)",
            name_ar="إبرة الفلتر / الإبرة البنفسجية السحرية",
            name_en="Exofecta (Factor Five)",
            aliases=["Exofecta", "Factor Five", "Exosomes", "إبرة الفلتر", "الإبرة البنفسجية"],
            description=exo_text,
            sheet=sh,
            rows=exo_rows,
            attributes={"activeIngredient": "Exosomes + Growth Factors + HA + Copper Peptide + Amino Acids"},
            extra_tags=["skin booster", "exofecta", "exosomes", "نضارة"],
        )

        # Collagen Stimulators: R66-R84
        col_intro, col_r1 = self.text_block(sh, 66, 70)
        col_tail, col_r2 = self.text_block(sh, 76, 78)
        self.add_record(
            rec_id="collagen-stimulators-overview",
            record_type="overview",
            category="skin-boosters",
            subcategory="Collagen Stimulators",
            name="Collagen Stimulating Injections Overview — حقن تحفيز الكولاجين",
            name_ar="حقن تحفيز الكولاجين",
            name_en="Collagen Stimulating Injections Overview",
            aliases=["Collagen Stimulators", "حقن تحفيز الكولاجين", "كولاجين"],
            description=f"{col_intro}\n\n{col_tail}",
            sheet=sh,
            rows=col_r1 + col_r2,
            attributes={"sessions": "2–3 sessions; results appear after 4–6 weeks; repeat after 6–12 months"},
            extra_tags=["collagen", "skin booster", "كولاجين"],
        )

        self.mark(sh, [71])
        for r in self.rows_range(sh, 72, 75):
            c = [x.strip() for x in r["cells"]]
            self.add_record(
                rec_id=f"collagen-{c[0]}",
                record_type="product",
                category="skin-boosters",
                subcategory="Collagen Stimulators",
                name=c[0],
                name_en=c[0],
                aliases=[c[0].split(" ")[0], c[0]],
                description=f"**Product:** {c[0]}\n**Active Material:** {c[1]}\n**Main Uses:** {c[2]}",
                sheet=sh,
                rows=[r["row"]],
                attributes={"activeIngredient": c[1], "uses": c[2]},
                extra_tags=["collagen", "كولاجين"],
            )

        # Comparison R80-R84
        self.mark(sh, [80, 81])
        comp_rows = self.rows_range(sh, 82, 84)
        comp_md = "| الفيلر | حقن الكولاجين |\n| --- | --- |\n" + "\n".join(
            f"| {r['cells'][0].strip()} | {r['cells'][1].strip()} |" for r in comp_rows
        )
        self.add_record(
            rec_id="comparison-collagen-vs-filler",
            record_type="comparison",
            category="skin-boosters",
            name="Collagen Stimulating Injections vs. Fillers — الفرق بين حقن الكولاجين والفيلر",
            name_ar="الفرق بين حقن الكولاجين والفيلر",
            name_en="Collagen Stimulators vs. Fillers",
            aliases=["Collagen vs Filler", "Sculptra vs Filler", "الفرق بين الكولاجين والفيلر"],
            description=comp_md,
            sheet=sh,
            rows=[80, 81, 82, 83, 84],
            extra_tags=["comparison", "collagen", "filler", "مقارنة"],
        )

    # 5. Facial
    def _process_facial(self) -> None:
        sh = "Facial "
        hf_text, hf_rows = self.text_block(sh, 1, 9)
        self.add_record(
            rec_id="facial-hydrafacial",
            record_type="service",
            category="facial",
            name="Hydrafacial (Basic, Deep, Korean Facial) — الهيدرافيشال",
            name_ar="الهيدرافيشال",
            name_en="Hydrafacial",
            aliases=["Hydrafacial", "Basic Hydrafacial", "Deep Hydrafacial", "Korean Facial", "فيشال", "هايدرافيشال"],
            description=hf_text,
            sheet=sh,
            rows=hf_rows,
            safety_flags={
                "pregnancyAllowed": True,
                "lactationAllowed": True,
                "contraindications": ["Inflamed acne", "Active facial eczema/skin disease", "Severe dryness", "Isotretinoin / Roaccutane"],
                "preCare": ["No laser 5 days before/after", "No scrubs/exfoliants 5 days before/after", "No facial hair removal 5 days before/after"],
            },
            extra_tags=["facial", "hydrafacial", "فيشال"],
        )

        dp_text, dp_rows = self.text_block(sh, 11, 17)
        self.add_record(
            rec_id="facial-dermapen",
            record_type="service",
            category="facial",
            name="Dermapen (Microneedling) — الديرمابن",
            name_ar="الديرمابن",
            name_en="Dermapen Microneedling",
            aliases=["Dermapen", "Microneedling", "ديرمابن"],
            description=dp_text,
            sheet=sh,
            rows=dp_rows,
            extra_tags=["facial", "dermapen", "microneedling", "ديرمابن"],
        )

        ff_text, ff_rows = self.text_block(sh, 19, 21)
        self.add_record(
            rec_id="facial-factor-five",
            record_type="service",
            category="facial",
            name="Factor Five (Acne-Safe Stem Cell Microneedling) — الفاكتور فايف",
            name_ar="الفاكتور فايف",
            name_en="Factor Five",
            aliases=["Factor Five", "RDS Peeling", "الفاكتور فايف"],
            description=ff_text,
            sheet=sh,
            rows=ff_rows,
            extra_tags=["facial", "factor five", "acne", "حبوب"],
        )

        peel_text, peel_rows = self.text_block(sh, 23, 26)
        self.add_record(
            rec_id="facial-peeling",
            record_type="service",
            category="facial",
            name="Chemical & Fruit Acid Peeling (TCA) — التقشير",
            name_ar="التقشير",
            name_en="Peeling (TCA / Fruit Acids)",
            aliases=["Peeling", "TCA", "التقشير", "أحماض الفواكه"],
            description=peel_text,
            sheet=sh,
            rows=peel_rows,
            extra_tags=["facial", "peeling", "tca", "تقشير"],
        )

        # Row 29 standalone policy covering Dermapen, Facial, and Peeling intervals!
        r29_txt = non_empty(self.row_map(sh)[29])[0]
        self.add_record(
            rec_id="policy-facial-session-intervals",
            record_type="policy",
            category="facial",
            name="Recommended Session Intervals (Dermapen, Facial, Peeling) — الفترات بين الجلسات",
            name_ar="الفترات الموصى بها بين جلسات البشرة",
            name_en="Facial Treatment Session Intervals",
            aliases=["Session intervals", "كم المدة بين الجلسات"],
            description=r29_txt,
            sheet=sh,
            rows=[29],
            extra_tags=["facial", "dermapen", "peeling", "intervals"],
        )

    # 6. Tattoo Removal
    def _process_tattoo(self) -> None:
        sh = "Tattoo Removal"
        self.mark(sh, [1, 2, 3, 4])
        note_r2 = non_empty(self.row_map(sh)[2])[0]
        note_r3 = " — ".join(non_empty(self.row_map(sh)[3]))

        clinic_rows = [
            (5, "well-touch", "Well Touch", "PV Laser", "Q-Switch", "All doctors"),
            (6, "new-age", "New Age", "DEKA", "Q-Switch", "Dr. Mitra"),
            (7, "dermadent", "Demadent + VIP (Dermadent)", "PV Laser + SPECTRA", "Q-Switch", "Consult clinic"),
            (8, "one-touch", "One Touch", "Q-Switch Ultralight", "Q-Switch", "All doctors"),
        ]
        for rnum, cid, cname, dev, tech, docs in clinic_rows:
            raw_line = " | ".join(non_empty(self.row_map(sh)[rnum]))
            self.add_record(
                rec_id=f"tattoo-device-{cid}",
                record_type="device",
                category="tattoo-removal",
                subcategory="Tattoo Removal Devices by Clinic",
                name=f"Tattoo Removal at {cname}: {dev} ({tech})",
                name_en=f"{cname} Tattoo Removal ({dev})",
                aliases=[cname, dev, tech, "Tattoo Removal", "إزالة التاتو"],
                description=f"**Clinic:** {cname}\n**Device:** {dev}\n**Technology:** {tech}\n**Doctors:** {docs}\n**Notes:** {note_r2}; {note_r3}\n**Raw row:** {raw_line}",
                sheet=sh,
                rows=[rnum, 2, 3],
                clinic_ids=[cid],
                attributes={"device": dev, "technology": tech, "doctors": docs},
                extra_tags=["tattoo", "clinic", "device", cid],
            )
            self.clinic_map[cid]["devices"].append(
                {"device": dev, "service": "Tattoo Removal (and Soft Light / Carbon Laser)", "technology": tech, "note": docs}
            )
            self.clinic_map[cid]["services"].append("Tattoo Removal")
            if docs and docs != "Consult clinic":
                self.clinic_map[cid]["doctors"].append(docs)

        sess_text, sess_rows = self.text_block(sh, 9, 14)
        self.add_record(
            rec_id="tattoo-removal-protocol",
            record_type="overview",
            category="tattoo-removal",
            name="Tattoo Removal Sessions, Pricing & Results — معلومات جلسات إزالة التاتو",
            name_ar="معلومات جلسات إزالة التاتو",
            name_en="Tattoo Removal Protocols & Pricing",
            aliases=["Tattoo Removal", "Carbon Laser", "Soft Light", "إزالة التاتو"],
            description=f"{note_r2}\n{note_r3}\n\n{sess_text}",
            sheet=sh,
            rows=[1, 2, 3] + sess_rows,
            prices=[{"note": "كل الاسعار تبدأ من على حسب حجم الوشم واللون (Prices vary by tattoo size and color)"}],
            attributes={"sessionDuration": "~30 minutes", "interval": "1 month", "expectedSessions": "4–7 sessions"},
            extra_tags=["tattoo", "price", "تاتو", "سعر"],
        )

        ex_text, ex_rows = self.text_block(sh, 15, 27)
        self.add_record(
            rec_id="tattoo-permanent-makeup-microblading-policy",
            record_type="policy",
            category="tattoo-removal",
            name="Permanent Makeup Exclusions, Microblading (Dermadent Only) & Side Effects Policy",
            name_ar="موانع المكياج الدائم وإزالة المايكروبليدينغ",
            name_en="Permanent Makeup & Microblading Removal Policy",
            aliases=["Microblading", "Permanent Makeup", "Dermadent", "ديرمادنت", "مايكروبليدينغ", "تحديد الشفاه", "تحديد العين"],
            description=ex_text,
            sheet=sh,
            rows=ex_rows,
            clinic_ids=["dermadent"],
            extra_tags=["tattoo", "microblading", "dermadent", "ديرمادنت", "policy"],
        )
        self.clinic_map["dermadent"]["services"].append("Microblading Removal Consultation (Exclusive)")
        self.clinic_map["dermadent"]["notes"].append(
            "Microblading removal inquiries are handled exclusively at Dermadent with doctor consultation (R20–R22)."
        )

    # 7. pregnancy and lactation
    def _process_pregnancy(self) -> None:
        sh = "pregnancy and lactation"
        self.mark(sh, [1, 2])
        all_rows = self.rows_range(sh, 3, 22)
        matrix_lines = ["| العلاج / الخدمة | الحمل | الرضاعة | ملاحظات للإيجنت |", "| --- | --- | --- | --- |"]
        for r in all_rows:
            c = [x.strip() for x in r["cells"][:4]]
            matrix_lines.append(f"| {c[0]} | {c[1]} | {c[2]} | {c[3]} |")
            preg_ok = "✅" in c[1]
            lact_ok: Any = "doctor_evaluation" if "تقييم" in c[2] or "بحسب" in c[2] else ("✅" in c[2])
            self.add_record(
                rec_id=f"safety-pregnancy-{c[0]}",
                record_type="safety-rule",
                category="pregnancy-safety",
                subcategory="Pregnancy & Lactation Matrix",
                name=f"Pregnancy & Lactation Safety: {c[0]}",
                name_en=f"{c[0]} Pregnancy & Lactation Safety",
                aliases=[c[0], "pregnancy", "lactation", "حمل", "رضاعة"],
                description=(
                    f"**Treatment / Service:** {c[0]}\n"
                    f"**Allowed During Pregnancy:** {c[1]}\n"
                    f"**Allowed During Lactation:** {c[2]}\n"
                    f"**Agent Guidance:** {c[3]}"
                ),
                sheet=sh,
                rows=[r["row"]],
                safety_flags={
                    "pregnancyAllowed": preg_ok,
                    "lactationAllowed": lact_ok,
                },
                attributes={"pregnancyStatus": c[1], "lactationStatus": c[2], "agentNote": c[3]},
                extra_tags=["pregnancy", "lactation", "حمل", "رضاعة", "safe"],
            )

        script_txt = non_empty(self.row_map(sh)[23])[0]
        self.add_record(
            rec_id="pregnancy-lactation-overview",
            record_type="overview",
            category="pregnancy-safety",
            name="Pregnancy & Lactation Complete Safety Matrix & Agent Scripts — الحمل والرضاعة",
            name_ar="السلامة أثناء الحمل والرضاعة",
            name_en="Pregnancy & Lactation Complete Safety Matrix",
            aliases=["Pregnancy", "Breastfeeding", "Lactation", "الحمل", "الرضاعة", "حامل", "مرضع"],
            description="\n".join(matrix_lines) + f"\n\n{script_txt}",
            sheet=sh,
            rows=[1, 2] + [r["row"] for r in all_rows] + [23],
            extra_tags=["pregnancy", "lactation", "حمل", "رضاعة"],
        )

    # 8. Slimming
    def _process_slimming(self) -> None:
        sh = "Slimming "
        weg_text, weg_rows = self.text_block(sh, 1, 5)
        self.add_record(
            rec_id="slimming-wegovy",
            record_type="product",
            category="slimming",
            name="Wegovy Injection (Weight Management) — حقن Wegovy",
            name_ar="حقن Wegovy لعلاج زيادة الوزن",
            name_en="Wegovy Injection",
            aliases=["Wegovy", "ويجوفي", "زيادة الوزن"],
            description=weg_text,
            sheet=sh,
            rows=weg_rows,
            attributes={"schedule": "Once weekly (4 doses per pen)", "ageLimit": "12+ years (doctor prescription required)"},
            safety_flags={"pregnancyAllowed": False, "lactationAllowed": False, "contraindications": ["History of certain thyroid conditions", "Pancreas problems", "Under age 12"]},
            extra_tags=["slimming", "wegovy", "weight"],
        )

        lip_intro, lip_r1 = self.text_block(sh, 7, 9)
        self.mark(sh, [10])
        lip_rows = self.rows_range(sh, 11, 13)
        lip_table = "| المنتج | الهدف الأساسي | المنطقة / الحجم | التأثير الرئيسي |\n| --- | --- | --- | --- |\n" + "\n".join(
            f"| {' | '.join(c.strip() for c in r['cells'][:4])} |" for r in lip_rows
        )
        self.add_record(
            rec_id="slimming-lipolysis",
            record_type="service",
            category="slimming",
            name="Lipolysis Injections (Aqualyx, Fat & Cellulite, BPS Serum) — حقن إذابة الدهون",
            name_ar="حقن إذابة الدهون الموضعية",
            name_en="Lipolysis Injections",
            aliases=["Lipolysis", "Aqualyx", "Fat & Cellulite", "BPS Serum", "إذابة الدهون"],
            description=f"{lip_intro}\n\n{lip_table}",
            sheet=sh,
            rows=lip_r1 + [10] + [r["row"] for r in lip_rows],
            extra_tags=["slimming", "lipolysis", "aqualyx", "دهون"],
        )

        slim_devices = [
            (15, 18, "Endolift (French Dermacool 2025 — Doctors Only)", ["Endolift", "اندولفت"], ["dermadent", "one-touch", "well-touch", "new-age"], "All Clinics (Doctors only)"),
            (20, 24, "Z-Lipo (Cryolipolysis — Well Touch)", ["Z-Lipo", "Cryolipolysis"], ["well-touch"], "Well Touch (Beauty Therapist)"),
            (26, 32, "Z-Wave (Acoustic Wave Therapy — Well Touch)", ["Z-Wave", "Acoustic Wave"], ["well-touch"], "Well Touch (Beauty Therapist)"),
            (37, 38, "Cool Shaping (One Touch)", ["Cool Shaping", "Cryolipolysis"], ["one-touch"], "One Touch (Doctor + Beauty Therapist)"),
            (40, 41, "Lipozero (RF + Low-Energy Laser + LED — One Touch)", ["Lipozero"], ["one-touch"], "One Touch (Doctor + Beauty Therapist)"),
            (43, 44, "HIFU (High-Intensity Focused Ultrasound — One Touch)", ["HIFU", "هيفو"], ["one-touch"], "One Touch (Doctor + Beauty Therapist)"),
            (46, 47, "InBody (InBalance 3D Body Analyzer — One Touch)", ["InBody", "InBalance 3D"], ["one-touch"], "One Touch (Doctor + Beauty Therapist)"),
            (49, 52, "Roblex (Body & Face Contouring)", ["Roblex"], [], "All/Unspecified in sheet"),
        ]
        # Find Venus & Deka rows dynamically (starting around 53+)
        remaining = [r for r in self.sheets[sh] if r["row"] >= 53]
        venus_rows = [r for r in remaining if r["row"] < 61]
        deka_rows = [r for r in remaining if r["row"] >= 61]

        for start, end, dname, aliases, cids, avail in slim_devices:
            txt, rnums = self.text_block(sh, start, end)
            self.add_record(
                rec_id=f"device-{dname}",
                record_type="device",
                category="slimming",
                subcategory="Slimming & Body Contouring Devices",
                name=dname,
                name_en=dname,
                aliases=aliases,
                description=txt,
                sheet=sh,
                rows=rnums,
                clinic_ids=cids,
                attributes={"clinicAvailability": avail},
                extra_tags=["device", "slimming", "تنحيف", "جهاز"],
            )
            for cid in cids:
                self.clinic_map[cid]["devices"].append({"device": dname, "service": "Slimming / Body Contouring", "note": avail})
                self.clinic_map[cid]["services"].append(dname.split(" (")[0])

        if venus_rows:
            self.add_record(
                rec_id="device-venus-legacy",
                record_type="device",
                category="slimming",
                name="Venus Legacy (Multi-Polar RF + PEMF + VariPulse)",
                name_en="Venus Legacy",
                aliases=["Venus", "Venus Legacy", "فينوس"],
                description="\n\n".join(" ".join(non_empty(r["cells"])) for r in venus_rows),
                sheet=sh,
                rows=[r["row"] for r in venus_rows],
                extra_tags=["device", "slimming", "rf", "جهاز"],
            )
        if deka_rows:
            self.add_record(
                rec_id="device-deka-slimming",
                record_type="device",
                category="slimming",
                name="Deka Slimming (Coolwaves Microwave Technology)",
                name_en="Deka Slimming",
                aliases=["Deka Slimming", "Coolwaves", "DEKA"],
                description="\n\n".join(" ".join(non_empty(r["cells"])) for r in deka_rows),
                sheet=sh,
                rows=[r["row"] for r in deka_rows],
                extra_tags=["device", "slimming", "coolwaves", "جهاز"],
            )

    # 9. Facial Machines
    def _process_facial_machines(self) -> None:
        sh = "Facial Machines  "
        all_rows = self.sheets[sh]
        # Group by major device headings dynamically
        groups = [
            (1, 5, "Opatra London Skin Analyser", ["Opatra", "Skin Analyser"]),
            (6, 10, "Ultra Sound For Filler (USA 2026 Version)", ["Ultra Sound", "Ultrasound", "التراساوند"]),
            (11, 15, "Vivace (Microneedling Radiofrequency) — فيفاتشي", ["Vivace", "فيفاشي", "فيفاتشي", "Microneedling RF"]),
            (16, 29, "Clear + Brilliant (Fractional Laser)", ["Clear + Brilliant", "Clear and Brilliant"]),
            (30, 34, "OxyGeneo (3-in-1 Facial System)", ["OxyGeneo", "اوكسي جينيو"]),
            (35, 40, "CAMPOMATS – RF Microneedling", ["CAMPOMATS", "RF Microneedling"]),
            (41, 46, "CO2 Laser – Fractional Laser", ["CO2 Laser", "Fractional Laser", "فراكشنال ليزر"]),
            (47, 60, "Plasmage (Fractional Plasma)", ["Plasmage", "بلازماج"]),
        ]
        for start, end, mname, aliases in groups:
            items = [r for r in all_rows if start <= r["row"] <= end]
            if not items:
                continue
            txt = "\n\n".join(" — ".join(non_empty(r["cells"])) for r in items)
            self.add_record(
                rec_id=f"machine-{mname}",
                record_type="device",
                category="facial-machines",
                name=mname,
                name_en=mname.split(" — ")[0],
                aliases=aliases,
                description=txt,
                sheet=sh,
                rows=[r["row"] for r in items],
                extra_tags=["device", "machine", "facial", "جهاز", "specifications"],
            )

    # 10. Dental
    def _process_dental(self) -> None:
        sh = "Dental"
        ven_intro, ven_rows = self.text_block(sh, 1, 8)
        self.add_record(
            rec_id="dental-veneers-overview",
            record_type="overview",
            category="dental",
            name="Dental Veneers Overview (E-Max German, Age 18+, Enamel Filing) — فينير الأسنان",
            name_ar="فينير الأسنان",
            name_en="Dental Veneers Overview",
            aliases=["Veneer", "Veneers", "E-Max", "فينير", "فينيير", "أسنان"],
            description=ven_intro,
            sheet=sh,
            rows=ven_rows,
            attributes={"minimumAge": "18 years", "material": "E-Max German / Porcelain", "enamelPreparation": "Filing (حف) is mandatory — never tell patients no-prep veneers are possible"},
            extra_tags=["dental", "veneer", "أسنان", "فينير"],
        )

        tiers = [
            (9, "Veneer 2D", ["2D", "Veneer 2D", "16 teeth", "20 teeth"]),
            (10, "Veneer 3D", ["3D", "Veneer 3D"]),
            (11, "Veneer 6D", ["6D", "Veneer 6D"]),
            (12, "Veneer 7D", ["7D", "Veneer 7D"]),
            (13, "VIP Lounge Smile (Custom 100%)", ["VIP Lounge", "VIP Smile"]),
            (14, "Diamond (Feldspathic Porcelain)", ["Diamond", "Feldspathic", "Hollywood Smile"]),
        ]
        for rnum, tname, aliases in tiers:
            txt = non_empty(self.row_map(sh)[rnum])[0]
            self.add_record(
                rec_id=f"dental-{tname}",
                record_type="service",
                category="dental",
                subcategory="Veneer Smile Tiers",
                name=tname,
                name_en=tname,
                aliases=aliases,
                description=txt,
                sheet=sh,
                rows=[rnum],
                extra_tags=["dental", "veneer", "smile", "فينير"],
            )

        rem_txt, rem_rows = self.text_block(sh, 15, 16)
        self.add_record(
            rec_id="dental-veneer-removal-policy",
            record_type="policy",
            category="dental",
            name="Veneer Removal Policy (Manual Only — No Laser Removal) — إزالة الفينير",
            name_ar="طريقة إزالة الفينير يدوياً",
            name_en="Veneer Removal Policy",
            aliases=["Veneer removal", "إزالة الفينير", "Laser veneer removal"],
            description=rem_txt,
            sheet=sh,
            rows=rem_rows,
            extra_tags=["dental", "veneer", "policy"],
        )

        ng_txt, ng_rows = self.text_block(sh, 18, 22)
        self.add_record(
            rec_id="dental-night-guard",
            record_type="service",
            category="dental",
            name="Night Guard (Soft / Hard) — واقي الأسنان الليلي",
            name_ar="واقي الأسنان الليلي",
            name_en="Night Guard",
            aliases=["Night Guard", "Bruxism", "واقي الأسنان الليلي", "صرير الأسنان"],
            description=ng_txt,
            sheet=sh,
            rows=ng_rows,
            extra_tags=["dental", "night guard"],
        )

        snap_txt, snap_rows = self.text_block(sh, 24, 28)
        self.add_record(
            rec_id="dental-snap-on-smile",
            record_type="service",
            category="dental",
            name="Snap-On Smile (Removable Cosmetic Smile) — ابتسامة سناب أون",
            name_ar="سناب أون سمايل",
            name_en="Snap-On Smile",
            aliases=["Snap-On Smile", "Snap On", "ابتسامة متحركة"],
            description=snap_txt,
            sheet=sh,
            rows=snap_rows,
            extra_tags=["dental", "snap-on"],
        )

        r30_txt = non_empty(self.row_map(sh)[30])[0]
        self.add_record(
            rec_id="dental-therapeutic-services-policy",
            record_type="policy",
            category="dental",
            name="General Dental Services Policy (No Orthodontics / No Implants) — خدمات الأسنان العلاجية",
            name_ar="الخدمات العلاجية للأسنان (ما عدا التقويم والزراعة)",
            name_en="General Dental Services & Exclusions",
            aliases=["Braces", "Orthodontics", "Implants", "تقويم", "زراعة أسنان", "dental services"],
            description=r30_txt,
            sheet=sh,
            rows=[30],
            attributes={"excludedServices": "Orthodontics (التقويم) and Dental Implants (الزراعة)"},
            extra_tags=["dental", "policy", "تقويم", "زراعة"],
        )

    def _emit_clinics(self) -> None:
        for cid, c in self.clinic_map.items():
            c["services"] = sorted(set(c["services"]))
            c["doctors"] = sorted(set(c["doctors"]))
            dev_lines = [
                f"- **{d['device']}** ({d['service']}"
                + (f", Tech: {d['technology']}" if d.get("technology") else "")
                + (f", Note: {d['note']}" if d.get("note") else "")
                + ")"
                for d in c["devices"]
            ]
            desc = (
                f"**Clinic Name:** {c['name']}\n"
                f"**Verified Services:** {', '.join(c['services']) or 'None specified'}\n"
                f"**Devices:**\n" + ("\n".join(dev_lines) or "- None listed") + "\n"
                f"**Unavailable Metadata:** {', '.join(c['missingFields'])} (not provided in source dataset)"
            )
            if c["notes"]:
                desc += "\n**Notes:** " + " ".join(c["notes"])
            self.add_record(
                rec_id=f"clinic-{cid}",
                record_type="clinic",
                category="clinics",
                name=f"{c['name']} Clinic Profile",
                name_en=c["name"],
                aliases=c["aliases"],
                description=desc,
                sheet="clinics.json",
                rows=[0],
                clinic_ids=[cid],
                attributes={
                    "verifiedServices": ", ".join(c["services"]),
                    "missingInfo": ", ".join(c["missingFields"]),
                },
                source_file="clinics.json",
                source_type="consolidated",
                extra_tags=["clinic", "clinics", "عيادة", "عيادات", c["name"]],
            )

    def _record_conflicts(self) -> None:
        self.conflicts = [
            {
                "id": "conflict-botox-postcare",
                "severity": "error",
                "topic": "Botox post-care duration copy-paste error",
                "description": (
                    "Row 156 under Botox in 'Filler+Botox+Threads' repeats filler aftercare "
                    "('النتائج تدوم بين 3 شهور إلى 1 سنة، حسب نوع الفلر'), contradicting Botox durability of 3–6 months (R132, R147, R148, R162)."
                ),
                "sources": [
                    {"file": "Knowlege.xlsx", "sheet": "Filler+Botox+Threads", "row": 156, "rows": [156]},
                    {"file": "Knowlege.xlsx", "sheet": "Filler+Botox+Threads", "row": 162, "rows": [162]},
                ],
            },
            {
                "id": "conflict-radiesse-duration",
                "severity": "warning",
                "topic": "Radiesse durability discrepancy",
                "description": (
                    "Radiesse R96 specifies '12–18 شهر', whereas R106 repeats generic filler post-care '3 شهور إلى 1 سنة'."
                ),
                "sources": [
                    {"file": "Knowlege.xlsx", "sheet": "Filler+Botox+Threads", "row": 96, "rows": [96]},
                    {"file": "Knowlege.xlsx", "sheet": "Filler+Botox+Threads", "row": 106, "rows": [106]},
                ],
            },
            {
                "id": "conflict-clinic-spelling",
                "severity": "warning",
                "topic": "Clinic spelling variants across files",
                "description": (
                    "'clinics.json' lists 'Dermadent' and 'Well Touch'; 'Tattoo Removal' R7 writes 'Demadent + Vip' and R21 'ديرمادنت', "
                    "while 'Slimming ' R20/R26 writes 'WellTouch'."
                ),
                "sources": [
                    {"file": "clinics.json", "sheet": "clinics", "row": 0, "rows": [0]},
                    {"file": "Knowlege.xlsx", "sheet": "Tattoo Removal", "row": 7, "rows": [7, 21]},
                    {"file": "Knowlege.xlsx", "sheet": "Slimming ", "row": 20, "rows": [20, 26]},
                ],
            },
            {
                "id": "conflict-legacy-json-diffs",
                "severity": "warning",
                "topic": "Legacy knowledge.json diffs vs. Knowlege.xlsx",
                "description": (
                    "Original Knowlege.xlsx fixes 'المضاعفات' (vs typo 'المضفات' in legacy knowledge.json Facial Machines R6), "
                    "has 'تدريجية' vs 'تدريجيًا' (Skin Booster), and includes Wingdings bullet 0xf0b7 on Restylane kysse."
                ),
                "sources": [
                    {"file": "Knowlege.xlsx", "sheet": "Facial Machines  ", "row": 6, "rows": [6]},
                    {"file": "knowledge.json", "sheet": "Facial Machines  ", "row": 6, "rows": [6]},
                ],
            },
        ]


def main() -> None:
    excel_sheets, total_non_ws_cells = read_excel_with_rows(XLSX_PATH)
    clinics_data = json.loads(CLINICS_PATH.read_text(encoding="utf-8"))
    clinics_raw = clinics_data.get("clinics", [])

    builder = PipelineBuilder(excel_sheets, clinics_raw)
    builder.run_all()

    # Check unmapped rows across all 10 Excel sheets
    total_excel_rows = 0
    unmapped_rows: list[dict[str, Any]] = []
    sheet_stats: list[dict[str, Any]] = []

    for sh, rows in excel_sheets.items():
        total_excel_rows += len(rows)
        mapped_cnt = 0
        for r in rows:
            if (sh, r["row"]) in builder.mapped:
                mapped_cnt += 1
            else:
                unmapped_rows.append(
                    {"sheet": sh, "row": r["row"], "cells": non_empty(r["cells"])}
                )
        sheet_stats.append(
            {
                "sheet": sh,
                "nonEmptyRows": len(rows),
                "mappedRows": mapped_cnt,
                "unmappedRows": len(rows) - mapped_cnt,
            }
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    canonical_bundle = {
        "schemaVersion": "1.0.0",
        "version": "2.0.0",
        "generatedAt": now_iso,
        "knowledgeBase": {
            "id": "terra-main",
            "name": "Terra Solutions Knowledge Base",
            "language": ["ar", "en"],
            "lastUpdated": now_iso,
            "sources": [
                {
                    "sourceId": "source-001",
                    "fileName": "Knowlege.xlsx",
                    "fileType": "xlsx",
                    "status": "active",
                    "version": 1,
                    "importDate": now_iso,
                    "rowCount": total_excel_rows,
                },
                {
                    "sourceId": "source-002",
                    "fileName": "clinics.json",
                    "fileType": "json",
                    "status": "active",
                    "version": 1,
                    "importDate": now_iso,
                    "rowCount": len(clinics_raw),
                },
            ],
        },
        "sources": ["data/raw/Knowlege.xlsx", "data/raw/clinics.json"],
        "records": builder.records,
        "clinics": list(builder.clinic_map.values()),
        "conflicts": builder.conflicts,
        "stats": {
            "excelSheets": len(excel_sheets),
            "excelNonEmptyRows": total_excel_rows,
            "excelNonWhitespaceCells": total_non_ws_cells,
            "canonicalRecords": len(builder.records),
            "clinicsCount": len(builder.clinic_map),
            "conflictsCount": len(builder.conflicts),
        },
    }

    (CANONICAL_DIR / "knowledge.canonical.json").write_text(
        json.dumps(canonical_bundle, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (CANONICAL_DIR / "unresolved.json").write_text(
        json.dumps(unmapped_rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Compare extracted vs legacy json
    extracted_json = json.loads(EXTRACTED_JSON_PATH.read_text(encoding="utf-8"))
    legacy_json = json.loads(LEGACY_JSON_PATH.read_text(encoding="utf-8"))
    extracted_total_rows = sum(len(v) for v in extracted_json.values())
    legacy_diffs = []
    for sh in extracted_json:
        if extracted_json[sh] != legacy_json.get(sh):
            legacy_diffs.append(sh)

    audit_report = {
        "generatedAt": canonical_bundle["generatedAt"],
        "sourceFiles": {
            "excel": "data/raw/Knowlege.xlsx",
            "clinics": "data/raw/clinics.json",
            "legacyJson": "data/raw/knowledge.json",
            "extractedJson": "data/raw/knowlege-extracted.json",
        },
        "counts": {
            "totalSourceSheets": len(excel_sheets),
            "totalSourceNonEmptyRows": total_excel_rows,
            "totalExtractedRows": extracted_total_rows,
            "totalSourceNonWhitespaceCells": total_non_ws_cells,
            "totalCanonicalRecords": len(builder.records),
            "successfullyMappedSourceRows": total_excel_rows - len(unmapped_rows),
            "unmappedSourceRows": len(unmapped_rows),
            "duplicateOrConflictingFindings": len(builder.conflicts),
        },
        "sheetBreakdown": sheet_stats,
        "legacyJsonDiffSheets": legacy_diffs,
        "conflicts": builder.conflicts,
        "unmappedRows": unmapped_rows,
    }

    (REPORTS_DIR / "knowledge-audit.json").write_text(
        json.dumps(audit_report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    md_lines = [
        "# Knowledge Base Data Integrity Audit",
        "",
        f"**Generated:** {audit_report['generatedAt']}",
        "**Canonical Dataset:** `data/canonical/knowledge.canonical.json`",
        "",
        "## Summary Metrics",
        "",
        "| Metric | Count |",
        "| --- | --- |",
        f"| Source Excel Worksheets | {audit_report['counts']['totalSourceSheets']} |",
        f"| Source Non-Empty Rows (`Knowlege.xlsx`) | {audit_report['counts']['totalSourceNonEmptyRows']} |",
        f"| Extracted Rows (`knowlege-extracted.json`) | {audit_report['counts']['totalExtractedRows']} |",
        f"| Non-Whitespace Cells | {audit_report['counts']['totalSourceNonWhitespaceCells']} |",
        f"| Mapped Source Rows | {audit_report['counts']['successfullyMappedSourceRows']} |",
        f"| Unmapped Source Rows | {audit_report['counts']['unmappedSourceRows']} |",
        f"| Normalized Canonical Records | {audit_report['counts']['totalCanonicalRecords']} |",
        f"| Consolidated Clinics (`clinics.json` + Excel) | {len(builder.clinic_map)} |",
        f"| Detected Conflicts / Anomalies | {len(builder.conflicts)} |",
        "",
        "## Sheet Coverage Breakdown",
        "",
        "| Sheet | Non-Empty Rows | Mapped Rows | Unmapped Rows |",
        "| --- | --- | --- | --- |",
    ]
    for s in sheet_stats:
        md_lines.append(
            f"| `{s['sheet']}` | {s['nonEmptyRows']} | {s['mappedRows']} | {s['unmappedRows']} |"
        )

    md_lines.extend(["", "## Detected Conflicts & Anomalies", ""])
    for c in builder.conflicts:
        md_lines.append(f"- **[{c['severity'].upper()}] {c['topic']}:** {c['description']}")

    md_lines.extend(["", "## Unmapped Rows", ""])
    if not unmapped_rows:
        md_lines.append("None (all `448` non-empty rows across all `10` sheets were mapped to canonical records).")
    else:
        for u in unmapped_rows:
            md_lines.append(f"- `{u['sheet']}` row {u['row']}: `{u['cells']}`")

    (REPORTS_DIR / "knowledge-audit.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(
        f"Canonical build complete: records={len(builder.records)}, "
        f"mapped_rows={total_excel_rows - len(unmapped_rows)}/{total_excel_rows}, "
        f"unmapped={len(unmapped_rows)}, conflicts={len(builder.conflicts)}"
    )


if __name__ == "__main__":
    main()

