# Rich Structured Response Schema & Renderer

## Protocol Contract (`lib/ai/response-schema.ts`)

Both Gemini (`meta.provider: "gemini"`) and the deterministic local fallback (`meta.provider: "local_fallback"`) produce validated payloads matching `RichAIResponse`:

```ts
export interface RichAIResponse {
  schemaVersion: "1.0";
  language: "ar" | "en" | "mixed";
  status: "success" | "partial" | "clarification" | "not_found";
  answer: {
    summary: string;
    blocks: RichResponseBlock[];
  };
  sources: VerifiedSourceReference[];
  meta: {
    provider: "gemini" | "local_fallback" | "openai";
    model: string;
    grounded: boolean;
    fallbackReason?: string;
    errorCategory?: AIErrorCode;
  };
}
```

---

## Supported Block Types (10 Discriminated Variants)

| Block `type` | Key Fields | Purpose |
| --- | --- | --- |
| `heading` | `level` (`1..3`), `text`, `tone?` | Section headings for fast call-center scanning |
| `paragraph` | `text`, `tone?` | Clear prose or highlighted semantic banners |
| `list` | `style` (`bullet` / `numbered`), `title?`, `items`, `tone?` | Rules, contraindications, instructions, candidate options |
| `table` | `title?`, `columns`, `rows` | Product comparisons, device directories, prices, clinic tables |
| `metric` | `label`, `value`, `tone?`, `calculationNote?` | Exact AED prices, counts, verified calculated percentages |
| `badge` | `label`, `tone?` | Verification status and match quality pills |
| `callout` | `tone`, `title?`, `text` | Conflict disclosures, unavailable info notices, clinical referrals |
| `quote` | `text`, `citation?` | Exact wording quoted from operational sheets |
| `divider` | — | Visual section separation |
| `source_list` | `title?`, `items` | Interactive source provenance pills (`fileName`, `sheetName`, `rowNumber`) |

---

## Semantic Tone System & Safe Rendering ([AIResponseRenderer.tsx](file:///F:/Terra%20Solutions/terra-solutions-chatbot/components/chat/AIResponseRenderer.tsx))

- Allowed tones: `"default" | "success" | "warning" | "danger" | "info" | "muted" | "accent"`.
- Models can NEVER pass arbitrary CSS hex colors or HTML tags (`<red>`, `<script>`): `sanitizePlainText()` strips markup server-side and client-side, never uses `dangerouslySetInnerHTML`, maps tones to Terra dark/gold & semantic Tailwind tokens, renders `dir="rtl"` for Arabic and `dir="ltr"` for English, aligns numerical cells cleanly with `—` placeholders, offers quick copy buttons on response & numeric table/metric values, and ignores unknown block types gracefully.
- Server citation validation cross-checks every `recordId` against actually retrieved `KnowledgeRecord[]` objects and removes unverified citations.

