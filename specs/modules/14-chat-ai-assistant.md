# Chat and AI Assistant
> References: shared/architecture.md, shared/data-model.md

## Overview

The chat module provides three modes: AI assistant chat (MVP), direct messages (Phase 3), and group chats (Phase 3). The AI assistant is a conversational interface to the entire Retail OS — it queries data and executes actions using the same API endpoints as the UI, scoped to the user's permissions. Chat is the operational nervous system for staff communication.

## Relevant Tables

`chat_thread`, `chat_thread_member`, `chat_message`

## API Routes

### Chat

- `POST /v1/chat/threads` — Create thread (direct/group)
- `GET /v1/chat/threads` — List user's threads with unread counts
- `GET /v1/chat/threads/{id}/messages` — Message history (cursor-paginated)
- `POST /v1/chat/threads/{id}/messages` — Send message
- `POST /v1/chat/threads/{id}/read` — Mark thread as read
- `POST /v1/chat/ai` — Send message to AI assistant (returns AI response + any actions taken)

## Business Rules

### Three Chat Modes

**1. Direct Messages (user -> user) — Phase 3**
- Any staff member can message any other within the same brand
- Persistent, searchable, timestamped
- Supports text, photos, voice notes, location sharing
- Unread badge on chat tab, push notifications via FCM

**2. Group Chats — Phase 3**
- Created by supervisors or admins
- Predefined types: Store team, Brand managers, Drivers, All staff
- Custom groups allowed
- @mention for targeted notifications

**3. AI Assistant Chat — MVP**
- Every user has access to an AI chat thread
- AI queries the system on the user's behalf (scoped to permissions)
- AI executes actions (with capability/approval gates)

### AI Assistant Capabilities

| User says | AI does | Permission required |
|---|---|---|
| "What were sales at Grand Baie yesterday?" | Queries daily sales report | View reports |
| "How many sandals do we have in stock?" | Queries product stock | View products |
| "Create a leave request for Friday" | Creates leave request | Submit requests |
| "Who's working the morning shift tomorrow?" | Queries shift schedule | View shifts |
| "Assign restocking task to Ravi" | Creates task, assigns to Ravi | Create tasks (supervisor+) |
| "What's Marie Laurent's loyalty balance?" | Queries customer wallet | View customers |
| "Send the catalogue PDF to this WhatsApp number" | Triggers WhatsApp template | Send messages |
| "Generate an inventory count report for last week" | Generates report | View reports |
| "Show me unresolved discrepancies" | Queries reconciliation data | View reconciliation |
| "Approve Amina's leave request" | Executes approval | Approve requests (supervisor+) |

### Safety

The AI assistant is bound by the same capability model as the user. A cashier asking "approve this leave request" gets "You don't have permission to approve requests." Actions requiring manager approval still require it even via chat.

### Implementation

The AI assistant calls the same backend API endpoints the UI uses. No special backdoor. The `/v1/chat/ai` endpoint uses the Anthropic API with tool use — the tools are the existing API endpoints. The AI's JWT is the user's JWT, so all permission checks apply.

### Schema

```sql
CREATE TABLE chat_thread (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_type     TEXT NOT NULL CHECK (thread_type IN ('direct', 'group', 'ai')),
    name            TEXT,
    organization_id UUID NOT NULL REFERENCES organization(id),
    created_by      UUID NOT NULL REFERENCES "user"(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_thread_member (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES chat_thread(id),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'admin')),
    last_read_at    TIMESTAMPTZ,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(thread_id, user_id)
);

CREATE TABLE chat_message (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES chat_thread(id),
    sender_id       UUID REFERENCES "user"(id),
    message_type    TEXT NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'photo', 'voice', 'location',
                                            'system', 'ai_response', 'ai_action')),
    content         TEXT,
    media_url       TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Android Module

`:feature:chat` — Added to bottom nav as 5th tab: Home / POS / Chat / Tasks / More

## Dependencies

- All backend API modules (AI assistant queries/executes against them)
- Anthropic API (Claude with tool use)
- Cloudinary (photo/voice message storage)
- FCM (push notifications)

## Implementation Notes

- **Phase 2:** AI assistant chat only (MVP — highest ROI)
- **Phase 3:** Direct messages and group chat expansion
- Decision 25: AI assistant in MVP, direct/group in Phase 3
