# Environment Variables & Local Setup

## Server-Only Secret Configuration (`.env` / `.env.local`)

Configure secret credentials on the server only. **Never prefix API keys with `NEXT_PUBLIC_`, never commit `.env*` to Git, and never expose secrets to client components or logs.**

| Variable | Scope | Required? | Purpose |
| --- | --- | --- | --- |
| `API_KEY` | Server only | Already set in `.env` | Fallback LLM API key read by Gemini (or OpenAI if `sk-...` or `AI_PROVIDER=openai`) |
| `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY` | Server only | Optional explicit override | Preferred dedicated Google Gemini API key |
| `GEMINI_MODEL` | Server only | Optional (default `gemini-2.5-flash`) | Override Gemini model ID |
| `AI_PROVIDER` | Server only | Optional (`"gemini"` \| `"openai"`) | Force provider preference when multiple keys exist |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Server only | Optional | Secondary OpenAI adapter support (`gpt-4o-mini` default) |
| `GOOGLE_SEARCH_API_KEY` | Server only | Optional | Google Custom Search secondary external web references |
| `GOOGLE_SEARCH_ENGINE_ID` | Server only | Optional | Programmable Search Engine ID (`cx`) for Google Search |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Server only | Optional | Target Google Sheets workbook ID (defaults to `1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE`) |
| `GOOGLE_SHEETS_GIDS` | Server only | Optional | JSON object mapping worksheet names to Google tab `gid`s (e.g. `{"Laser":"..."}`) for direct tab + cell jumps |
| `NEXT_PUBLIC_APP_NAME` | Public | Set in `.env.local` | Display title (`"Terra AI Assistant"`) |
| `NEXT_PUBLIC_APP_VERSION` | Public | Set in `.env.local` | App display version |

---

## Verification Without Live Paid Quota

- **Run full retrieval & grounding benchmark (`56` cases):** `npm run eval`
- **Run full automated unit, schema, renderer, security, fallback & API route test suite:** `npm test`
- **Rebuild canonical knowledge dataset from `data/raw/Knowlege.xlsx`:** `npm run knowledge:build`
- **Production build & static checks:** `npx next typegen && npx tsc --noEmit && npm run lint && npm run build`

If `API_KEY` is missing or an external Gemini call fails due to quota/network restrictions, `/api/chat` automatically falls back cleanly to `Terra Local Knowledge Engine` (`local_fallback`).

