# UI/UX Audit — Terra Solutions Assistant

**Audit Date:** 2026-11-25  
**Scope:** Complete code & visual audit of `app/`, `components/`, `hooks/`, `lib/ai/`, `constants/`, and `app/globals.css`.

---

## Executive Findings

While Terra's dark obsidian/gold color palette (`#0D0B07` / `#CBB36A`) and core RAG pipeline are functionally solid, inspecting every UI component and response pipeline revealed **8 high-impact UX, identity, and visual hierarchy weaknesses** that currently make the product feel like a developer prototype rather than an authoritative enterprise tool:

### 1. AI Provider & Infrastructure Leakage (Critical Identity Issue)
- **Evidence:** `components/chat/MessageBubble.tsx` renders `{message.provider}` (`"Google Gemini · gemini-2.5-flash"` or `"Terra Local Knowledge Engine"`); `components/chat/ChatHeader.tsx` displays `providerStatus.providerName` and exposes internal reason strings (`OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`); `app/api/chat/route.ts` adds `"Automatic local fallback active (GEMINI_RATE_LIMIT)..."` into user-visible `warnings[]`; `components/chat/ChatInput.tsx` labels `"Web Search Unavailable"`.
- **Remediation:** Completely decouple internal provider/error diagnostics (kept strictly in server logs & structured backend telemetry) from every employee-facing string. Unify visible product identity strictly around **Terra Solutions Assistant** / **Terra Assistant**, using neutral status phrasing (`"Verified Knowledge"`, `"تم إعداد الإجابة بالاعتماد على قاعدة المعرفة الداخلية"`).

### 2. Cluttered Message Bubbles & Duplicate Source Rows
- **Evidence:** `MessageBubble.tsx` puts every structured answer inside an enclosed `rounded-2xl bg-ai-bubble` card alongside multiple pills (`Strong Match`, `Clarification`, provider string) AND renders BOTH inline `source_list` blocks inside `AIResponseRenderer` AND a second `Company Sources:` row underneath. Nested boxes (`ai-bubble` → `callout` → `table` → `source_list`) create heavy card stacking and squeeze horizontal table width.
- **Remediation:** Transition assistant turns to an editorial briefing surface (clean left gold guide rule, clean `Terra Assistant` identity header, generous readable line width), unify sources into a sleek collapsible/expandable **Sources** bar with direct cell links & live row inspector, and refine nested block spacing.

### 3. Generic Empty State & Unfocused Prompt Grid
- **Evidence:** `ChatMessages.tsx` shows an empty screen with a generic H2 (`"How can I assist your call today?"`) and `SuggestedPrompts.tsx` renders 6 repetitive prompt cards lacking functional categories.
- **Remediation:** Build a high-craft **Terra Assistant Welcome Canvas** featuring the Arabic-friendly & English greeting (`"أهلًا بيك، إزاي أقدر أساعدك النهارده؟"`), 5 category pills mapped to actual supported KB domains (Services & Treatments, Prices & Offers, Devices & Tech, Clinics & Branches, Service Comparisons), and clickable real call-center prompt starters.

### 4. Visual Noise in Tables, Metrics & Loading Motion
- **Evidence:** `TypingIndicator.tsx` uses three bouncing dots (`animate-bounce`); `Hero.tsx` relies on a generic blurred glow blob without a realistic product preview; `AIResponseRenderer.tsx` renders heavy borders and always-visible inline copy buttons inside every numeric table cell.
- **Remediation:** Replace bouncing dots with a calm gold-accent shimmer pulse (`"Preparing your answer…"`), tighten tables to crisp horizontal hairlines with hover/focus-revealed cell copy controls and RTL-aligned tabular numbers, refine metric cards to match call-center scannability rather than oversized KPI widgets, and add a real interactive workspace preview inside `Hero.tsx`.

### 5. Inconsistent Naming Across Routes & Components
- **Evidence:** Components mix `"Terra AI"`, `"Terra AI Assistant"`, `"Terra AI Workspace"`, `"Knowledge Search Mode"`, and `"Server-backed · Canonical records"`.
- **Remediation:** Standardize every user-visible surface (`layout.tsx`, `Navbar`, `Hero`, `Footer`, `SignInForm`, `SignUpForm`, `Sidebar`, `ChatHeader`, `ChatInput`, `KnowledgeDrawer`) to **Terra Solutions Assistant** / **Terra Assistant** / **Verified Knowledge Catalog**.

### 6. Touch & Keyboard Accessibility Gaps
- **Evidence:** `ConversationItem.tsx` hides Rename/Delete buttons at `opacity-0` until desktop hover, making touch/mobile discovery harder; `Input.tsx` uses hardcoded `pl-10`/`pr-10` instead of logical `ps-10`/`pe-10`; `KnowledgeDrawer.tsx` (`max-w-md`) lacks smooth drawer transition choreography and cramps wide Excel row previews.
- **Remediation:** Use logical RTL/LTR spacing utilities (`ps-*`/`pe-*`), keep conversation row actions accessible on mobile/touch & active rows, expand `KnowledgeDrawer` cleanly (`max-w-lg`) with animated slide-in respecting `prefers-reduced-motion`, and replace raw technical error text with calm Arabic/English retry prompts.

