# Terra AI Assistant — Terra Solutions

Internal business knowledge management and conversational AI assistant built for **Terra Solutions** Call Center Agents and Customer Support Representatives.

Replaces manual searching across multi-sheet Excel files with a bilingual (Arabic & English) conversational workspace grounded in verified company data.

---

## Tech Stack

- **Framework:** Next.js 16.4.6 (App Router, Cache Components & Partial Prefetching)
- **UI & Styling:** React 19.3.0, Tailwind CSS 4.3.3 (`@tailwindcss/turbopack`), `lucide-react`
- **Markdown Rendering:** `react-markdown` + `remark-gfm`
- **Language:** TypeScript 5 (strict mode)
- **Visual Identity:** Extracted from Terra Solutions (`#0D0B07` / `#161209` dark surfaces, `#CBB36A` gold accents, `Inter` & `Space Grotesk` typography)

---

## Available Routes

| Route | Experience | Access |
| --- | --- | --- |
| `/` | Marketing Landing Page (Hero, Verified Products & Services, Company Intro, Footer) | Public |
| `/signin` | Agent Sign In (with demo local auth adapter) | Public |
| `/signup` | Agent Registration (with validation & SHA-256 local hashing) | Public |
| `/chat` | AI Knowledge Workspace (Sidebar, Conversation CRUD, Knowledge Explorer) | Protected (`AuthGuard`) |
| `/api/chat` | Prepared Server-Side LLM Proxy Contract | API Route |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

---

## Environment Variables

See `.env.local` for template keys.

- `NEXT_PUBLIC_APP_NAME` — Public display name (`"Terra AI Assistant"`)
- `NEXT_PUBLIC_APP_VERSION` — Public version string
- `OPENAI_API_KEY` *(server-only, optional)* — Future upstream LLM key
- `GOOGLE_AI_API_KEY` *(server-only, optional)* — Future upstream LLM key

> **Security Requirement:** Never prefix secret API keys with `NEXT_PUBLIC_`, never hardcode keys in source files, and never store keys in `localStorage`.

---

## Architecture & Further Reading

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — Folder structure, state management, localStorage schema, and architectural decisions
- [KNOWLEDGE_SCHEMA.md](./KNOWLEDGE_SCHEMA.md) — Excel-JSON schema, bilingual search engine, and how to update knowledge data
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) — Provider abstraction, prompt rules, mock vs. real LLM transition, and external search readiness

---

## Current Limitations (Frontend-Only Release)

1. **Local Authentication Only:** Uses `localAuthAdapter` (`localStorage` + SHA-256 hashing). Not intended for production identity security.
2. **Browser-Local Persistence:** Conversations and history live in `localStorage` (`terra_v1_*`) and are specific to the browser/device — not shared across employees.
3. **Knowledge Search Mode:** Uses `mockProvider` performing real deterministic retrieval and Markdown formatting against `public/data/knowledge.json` until a server-side LLM API key is connected via `/api/chat`.
4. **No Live Google Search:** `stubSearchProvider` is prepared as an interface and returns no external results until a server-side search endpoint is connected.
