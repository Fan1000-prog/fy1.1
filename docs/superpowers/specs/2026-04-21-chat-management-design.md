# Chat Management — Design Spec
Date: 2026-04-21

## Overview

Persist chat conversations in `localStorage` so users can resume previous chats and delete them. All storage access is encapsulated in a dedicated module so the backend can be swapped later with no changes to the chat UI.

---

## Data Model

```ts
interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  tool?: string;
  timestamp: string; // ISO string
}

interface Conversation {
  id: string;       // crypto.randomUUID()
  title: string;    // first user message, truncated to 40 chars
  preview: string;  // last message, truncated to 60 chars
  updatedAt: string; // ISO — used for sorting and time-grouping
  messages: StoredMessage[];
}
```

All conversations stored as a JSON array under the single `localStorage` key: `fy-conversations`.

---

## Module: `src/lib/conversations.ts`

Four exported functions — the chat page uses only these, never `localStorage` directly:

| Function | Signature | Description |
|---|---|---|
| `listConversations` | `() => Conversation[]` | Returns all conversations sorted newest first |
| `saveConversation` | `(conv: Conversation) => void` | Inserts a new conversation |
| `updateConversation` | `(id: string, patch: Partial<Conversation>) => void` | Merges patch into existing conversation |
| `deleteConversation` | `(id: string) => void` | Removes conversation by id |

Migration path: when a real backend is added, only this file changes.

---

## Chat Page Behavior

### On load
- `listConversations()` populates the sidebar, replacing `DEMO_CONVERSATIONS`
- Most recent conversation is auto-selected and its messages loaded into state
- If no conversations exist, open the welcome screen

### New chat
- Generates a fresh `id` via `crypto.randomUUID()`
- Clears messages to welcome screen
- Does NOT save to storage until the user sends the first message (avoids empty entries)

### On send
- First message in a new chat: `saveConversation()` with title = first user message (max 40 chars)
- Every subsequent AI reply: `updateConversation()` to refresh `preview` and `updatedAt`

### Switching conversations
- Clicking a sidebar item loads that conversation's messages into state
- Active conversation is kept current in storage on every AI reply

### Delete
- Trash icon (`Trash2` from lucide-react) appears on hover per sidebar row
- Calls `deleteConversation(id)`
- If deleted conversation was active: open a new blank chat

---

## Sidebar UI

Conversations grouped by recency using existing i18n keys plus one new key:

```
Today            ← chat_today (exists)
  └─ Title…      [trash on hover]   10:32
Yesterday        ← chat_yesterday (exists)
  └─ Title…      [trash on hover]   Hier
Earlier          ← chat_earlier (new key, added to all 3 locales)
  └─ Title…      [trash on hover]   Lun
```

- Trash icon: `text-muted-foreground`, turns `text-destructive` on hover
- Active row: existing `bg-sidebar-accent` highlight, no change
- Empty state: single muted line — no new component needed

---

## i18n Additions

One new key added to all three locales in `src/lib/i18n.tsx`:

| Key | fr | mg | en |
|---|---|---|---|
| `chat_earlier` | "Plus tôt" | "Taloha" | "Earlier" |

---

## Out of Scope

- Rename conversations
- Search / filter
- Pin / favorite
- Bulk delete
- Backend persistence (designed for, not built now)
