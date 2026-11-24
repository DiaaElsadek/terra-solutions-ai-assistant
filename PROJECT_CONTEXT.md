# Terra AI Assistant — Project Context & Architecture

## Overview

Terra AI Assistant is a full-stack internal AI knowledge retrieval platform built on **Next.js 16.4.6** (App Router, Cache Components & Partial Prefetching), **React 19.3.0**, **TypeScript 5** (strict mode), and **Tailwind CSS 4.3.3** for Terra Solutions' Call Center and Customer Support teams.

---

## Directory Structure

```text
app/
├── (marketing)/              # Public landing, sign-in, sign-up pages
├── (chat)/chat/page.tsx      # Protected AI Knowledge Workspace
├── api/
│   ├── chat/route.ts         # Rate-limited RAG chat + NDJSON streaming endpoint
│   └── knowledge/route.ts    # Server-only Knowledge Explorer API (clinics/records/related)
├── globals.css               # Terra brand tokens (#0D0B07, #161209, #CBB36A)
└── layout.tsx                # Root layout & AuthProvider

components/
├── ui/                       # Button, Input, Card, Badge, Modal, Spinner, Avatar, BrandLogo
├── layout/                   # Navbar, Footer
├── landing/                  # Hero, ProductsSection, CompanyIntro (sanitized public summaries)
├── auth/                     # SignInForm, SignUpForm, AuthGuard
├── chat/                     # ChatWorkspace, Sidebar, ChatHeader, MessageBubble (Source Modal),
│                             # MarkdownRenderer, ChatInput (Stop generation), SuggestedPrompts
└── knowledge/                # KnowledgeDrawer (clinic filter, detail & related records)

data/
├── raw/                      # Original Knowlege.xlsx, clinics.json, legacy exports (private)
└── canonical/                # knowledge.canonical.json (148 records), unresolved.json ([])

lib/
├── knowledge/                # normalize, intent, synonyms, retriever, validator, server-store, public-summary
├── ai/                       # prompt-builder, response-validator, openai-provider, gemini-provider,
│                             # mock-provider, provider selector
├── security/                 # api-guard (rate limit, size/length checks, safe errors), privacy (PII redaction)
├── search/                   # google-search (optional server Custom Search) + types
├── auth/                     # local-adapter (demo-only localStorage SHA-256) + types + context
└── storage/                  # SSR-safe localStorage conversation persistence

evaluation/                   # 56-case bilingual QA set, evaluation runner & report generator
reports/                      # knowledge-audit.{json,md} & knowledge-evaluation.md
scripts/                      # build-knowledge.py, run-compiled.cjs, cjs-alias-hook.cjs
tests/                        # knowledge.test.ts, ai-and-security.test.ts, storage-and-auth.test.ts
```

---

## LocalStorage Persistence Schema (`terra_v1_*`)

Client workspace conversation history and demo auth remain in browser `localStorage` (`lib/storage/local-storage.ts`, `lib/storage/conversations.ts`) with SSR guards, corrupt-JSON auto-recovery, and `QuotaExceededError` handling:

| Key | Type | Purpose |
| --- | --- | --- |
| `terra_v1_conversations` | `ConversationSummary[]` | Sorted conversation summaries |
| `terra_v1_conv_{id}` | `Message[]` | Messages for conversation `{id}` |
| `terra_v1_active_conversation` | `string` | Active conversation ID |
| `terra_v1_preferences` | `UserPreferences` | Sidebar state & last active conversation |
| `terra_v1_auth_user` / `_session` | `AuthUser` / `string` | Demo agent session |
| `terra_v1_auth_users` | `StoredUser[]` | Demo accounts (salted SHA-256, never plaintext) |

---

## Production Hardening Roadmap

1. **Server Authentication Middleware:** Replace demo `localAuthAdapter` (`lib/auth/local-adapter.ts`) and browser-only `AuthGuard` with server-validated sessions (Auth.js / Clerk / SSO) guarding `/chat`, `/api/chat`, and `/api/knowledge`.
2. **Shared Database & Distributed Rate Limiting:** Replace `localStorage` conversation storage with PostgreSQL/Supabase and swap `lib/security/api-guard.ts`'s in-memory `Map` with Redis/Upstash for multi-instance deployments.
3. **Optional Hybrid Vector Retrieval:** The pre-indexed deterministic engine (`knowledgeRetriever`) handles `148` canonical records cleanly (`93.9%` Top-1, `100%` Recall@3); if the knowledge base scales to thousands of rows, add embedding vectors alongside lexical/synonym scoring.
