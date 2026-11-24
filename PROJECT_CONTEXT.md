# Terra AI Assistant — Project Context & Architecture

## Overview

Terra AI Assistant is a three-experience internal web application built on **Next.js 16.4.6** using App Router route groups so the Marketing/Auth experience and the full-screen Chat Workspace share one design system while using dedicated layouts.

---

## Directory Structure

```text
app/
├── (marketing)/
│   ├── layout.tsx          # Navbar + Footer shell
│   ├── page.tsx            # Landing page (/)
│   ├── signin/page.tsx     # Sign In (/signin)
│   └── signup/page.tsx     # Sign Up (/signup)
├── (chat)/
│   ├── layout.tsx          # Full-viewport workspace container
│   └── chat/page.tsx       # Protected AI Workspace (/chat)
├── api/chat/route.ts       # Prepared server-side LLM proxy endpoint
├── globals.css             # Terra brand design tokens & Tailwind v4 @theme inline
├── layout.tsx              # Root layout (Inter, Space Grotesk, AuthProvider)
└── not-found.tsx           # Branded 404 page

components/
├── ui/                     # Button, Input, Card, Badge, Modal, Spinner, Avatar, BrandLogo
├── layout/                 # Navbar, Footer
├── landing/                # Hero, ProductsSection, CompanyIntro
├── auth/                   # SignInForm, SignUpForm, AuthGuard
├── chat/                   # ChatWorkspace, Sidebar, ConversationList, ConversationItem,
│                           # ChatHeader, ChatMessages, MessageBubble, MarkdownRenderer,
│                           # ChatInput, SuggestedPrompts, TypingIndicator
└── knowledge/              # KnowledgeDrawer (live category/record browser)

hooks/
├── useConversations.ts     # Conversation CRUD, search, date grouping, sidebar prefs
└── useChat.ts              # Message sending, retry, auto-titling, quota handling

lib/
├── ai/                     # AIProvider interface, prompt-builder, mock-provider, factory
├── auth/                   # AuthProvider interface, React Context, localAuthAdapter
├── knowledge/              # Parser, bilingual search engine, categories, data loader
├── search/                 # External SearchProvider interface + stubSearchProvider
└── storage/                # Safe localStorage wrapper + conversation store

constants/                  # brand.ts, config.ts, prompts.ts
types/                      # Shared TypeScript interfaces
public/data/knowledge.json  # Official Excel-derived JSON dataset
```

---

## LocalStorage Persistence Schema (`terra_v1_*`)

All browser persistence is centralized in `lib/storage/local-storage.ts` and `lib/storage/conversations.ts`.

| Key | Type | Purpose |
| --- | --- | --- |
| `terra_v1_conversations` | `ConversationSummary[]` | Index of conversations sorted by `updatedAt` |
| `terra_v1_conv_{id}` | `Message[]` | Messages belonging to conversation `{id}` |
| `terra_v1_active_conversation` | `string` | Last selected conversation ID |
| `terra_v1_preferences` | `UserPreferences` | `{ sidebarCollapsed, lastActiveConversationId }` |
| `terra_v1_auth_user` | `AuthUser` | Currently signed-in demo agent profile |
| `terra_v1_auth_session` | `string` | Active demo user ID |
| `terra_v1_auth_users` | `StoredUser[]` | Registered demo accounts (SHA-256 password hash + salt, never plaintext) |
| `terra_v1_remember_email` | `string` | Optional remembered email address |

### Safety Mechanisms
- **SSR Guard:** `isAvailable()` prevents access during server rendering.
- **Hydration Safety:** All reads happen inside `useEffect` with skeleton states prior to hydration.
- **Corruption Recovery:** Invalid JSON entries are caught, removed, and replaced with safe defaults.
- **Quota Handling:** `QuotaExceededError` is caught cleanly and surfaces a non-blocking banner warning.

---

## Backend Migration Roadmap

1. **Database Persistence:** Replace `lib/storage/conversations.ts` calls inside `hooks/useConversations.ts` and `hooks/useChat.ts` with REST/tRPC calls backed by PostgreSQL or Supabase.
2. **Production Authentication:** Implement `AuthProvider` (`lib/auth/types.ts`) with NextAuth/Auth.js, Clerk, or Auth0, and replace `AuthGuard` with server/middleware verification.
3. **LLM Synthesis & Vector RAG:** Complete `app/api/chat/route.ts` with your chosen LLM SDK and swap `KnowledgeEngine` (`lib/knowledge/index.ts`) to hybrid/vector retrieval if the dataset grows significantly.

