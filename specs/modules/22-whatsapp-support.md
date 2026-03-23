# WhatsApp Support Architecture
> Decision document — requires business decisions before implementation

## The Two Support Channels

### Channel A: Posterita → Merchants (B2B)
**Who:** Store owners/staff asking Posterita for help with the POS system.
**Volume:** Low (tens per day). **Complexity:** High (technical issues, setup, sync problems).
**Example:** "My terminal isn't syncing" / "How do I set up kitchen stations?"

### Channel B: Merchants → Consumers (B2C)
**Who:** Restaurant/shop customers asking about orders, receipts, loyalty points.
**Volume:** High (hundreds per merchant per day). **Complexity:** Low (order status, points balance, hours).
**Example:** "Where is my order?" / "How many loyalty points do I have?"

These two channels have different economics, branding, and knowledge base requirements.

---

## Recommended Architecture

### One WhatsApp Business API account (Posterita), multiple entry points

```
Consumer scans receipt QR
       ↓
  wa.me/+230XXXXX?text=RECEIPT ORDER-123
       ↓
┌──────────────────────────────┐
│   Posterita WhatsApp API     │
│   (single WABA, one number)  │
│                              │
│   Webhook → /api/whatsapp    │
│         ↓                    │
│   Route by message context   │
│   ├── "RECEIPT xxx" → B2C    │
│   ├── "SUPPORT xxx" → B2B   │
│   └── unknown → greeting     │
│         ↓                    │
│   AI Agent (Claude)          │
│   scoped to account context  │
│         ↓                    │
│   Can't resolve → escalate   │
│   to human (SalesIQ/Zoho)    │
└──────────────────────────────┘
```

### Why one number, not one per merchant

| Approach | Cost | Setup | Branding | Recommendation |
|----------|------|-------|----------|----------------|
| **One Posterita number** | ~$50/mo for API access | One-time Meta verification | "Posterita" name on all chats | **Start here** |
| **One number per merchant** | ~$50/mo × N merchants + BSP fees | Each merchant needs Meta Business verification (weeks) | Merchant's own brand | Future (Phase 2) |
| **BSP (Twilio/WATI) multi-number** | $0.005–0.08/msg + platform fee | BSP manages verification | Per-merchant or shared | Future (when scale justifies) |

**Start with one number.** Reasons:
- Meta Business verification takes 2–4 weeks per business. You can't onboard merchants fast.
- Each WABA costs $50+/mo minimum. At 100 merchants, that's $5,000/mo just for WhatsApp.
- One number with smart routing gives 80% of the value at 5% of the cost.
- The consumer experience is still good — they scan a QR, the AI knows their order context.

### When to upgrade to per-merchant numbers

When a merchant has >500 conversations/month AND wants their own branded WhatsApp presence AND is willing to go through Meta verification. Offer this as a premium feature.

---

## Architecture Detail

### 1. WhatsApp Business API Setup

Use **Meta Cloud API** (free tier: 1,000 service conversations/month, then ~$0.05/msg).

```
Meta Business Suite → WhatsApp Business Account → Phone number (+230XXXXX)
                                                 → Webhook URL: https://web.posterita.com/api/whatsapp
                                                 → Access token in env vars
```

No BSP needed initially. Direct Meta integration is free (you pay only per-conversation).

### 2. Webhook Handler

**New API route:** `/api/whatsapp/webhook`

```
POST /api/whatsapp/webhook
  ← Meta sends: { from: "+230XXXXXX", text: "RECEIPT GBR-20260319-047", ... }

  1. Parse message type:
     - "RECEIPT {order_ref}" → look up order → resolve account_id → B2C flow
     - "SUPPORT" or "HELP" → B2B flow (merchant asking for help)
     - Free text → check if existing conversation → continue, else greeting

  2. Resolve context:
     - From order_ref → account_id, store, products, customer
     - From phone → customer record (if exists)

  3. AI Agent (Claude):
     - System prompt scoped to the merchant's data
     - Tools: lookup_order, check_loyalty_points, get_store_hours, get_menu
     - Falls back to: "I'll connect you with a human" → webhook to SalesIQ

  4. Send reply via WhatsApp Cloud API
```

### 3. Knowledge Base Strategy

**Don't separate.** The knowledge base IS your Supabase database.

| Question | Data source |
|----------|-------------|
| "Where is my order?" | `orders` table → status, date |
| "How many points do I have?" | `loyalty_wallet` → balance |
| "What's on the menu?" | `product` table → name, price, category |
| "What are your hours?" | `store` table → operating hours (future field) |
| "My POS won't sync" | Error logs + sync_request_log + CLAUDE.md knowledge |
| "How do I set up stations?" | Specs docs + CLAUDE.md (embedded in system prompt) |

The AI agent queries Supabase directly using the same service role key. No separate knowledge base system needed.

### 4. SalesIQ / Zoho — For Human Escalation Only

Don't use SalesIQ as the primary channel. Use it as the **escalation destination** when the AI can't resolve:

```
Consumer → WhatsApp → AI Agent → can't resolve → "Connecting you to support..."
                                                         ↓
                                                   POST to SalesIQ API
                                                   (create ticket with context)
                                                         ↓
                                                   Human agent sees:
                                                   - Customer name/phone
                                                   - Merchant name
                                                   - Conversation history
                                                   - Order details
                                                   - What the AI tried
```

SalesIQ alternatives: Freshdesk, Zendesk, or even a simple Slack webhook to a #support channel.

### 5. Posterita Support (B2B)

For merchants asking Posterita for help:

```
Merchant → WhatsApp "SUPPORT my terminal won't sync"
        → AI Agent with POS knowledge base
        → System prompt includes:
          - All CLAUDE.md content
          - Spec files
          - Common troubleshooting steps
          - Access to their error_logs, sync_request_log
        → Can't resolve → escalate to Posterita support team
```

This is essentially the "AI chat assistant" from Phase 2 priorities, but via WhatsApp instead of in-app.

---

## Implementation Phases

### Phase 1: Receipt QR → WhatsApp → AI (B2C)
**Effort:** 1 week. **Cost:** $0 (Meta free tier).

1. Register Posterita WhatsApp Business number with Meta
2. `/api/whatsapp/webhook` — receive messages, parse RECEIPT context
3. Claude agent scoped to merchant's product/order data
4. Reply via WhatsApp Cloud API
5. Receipt QR already prints `wa.me/+230XXXXX?text=RECEIPT%20{ORDER_REF}`

### Phase 2: Loyalty Integration (B2C)
**Effort:** 3 days.

6. "Check my points" → query loyalty_wallet
7. Auto-create customer from WhatsApp phone number
8. Award points on receipt scan

### Phase 3: Posterita Support Agent (B2B)
**Effort:** 1 week.

9. "SUPPORT" keyword → different system prompt (POS knowledge)
10. Access to merchant's error_logs, sync history
11. Escalation to SalesIQ/Slack

### Phase 4: Per-Merchant Numbers (Premium)
**Effort:** 2 weeks. **Cost:** BSP fees.

12. Integrate with Twilio/WATI as BSP
13. Merchant self-service number provisioning
14. Per-merchant billing for WhatsApp conversations

---

## Data Model Changes

### New Supabase table: `whatsapp_conversation`

```sql
CREATE TABLE whatsapp_conversation (
  id            BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  account_id    TEXT,              -- resolved merchant context
  phone         TEXT NOT NULL,     -- customer WhatsApp number
  customer_id   INT,               -- linked customer record (if exists)
  channel       TEXT DEFAULT 'b2c', -- b2c or b2b
  status        TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  messages      JSONB DEFAULT '[]', -- conversation history for AI context
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Env vars needed

```
WHATSAPP_PHONE_NUMBER_ID=   # Meta phone number ID
WHATSAPP_ACCESS_TOKEN=      # Meta permanent access token
WHATSAPP_VERIFY_TOKEN=      # Webhook verification token
WHATSAPP_BUSINESS_ACCOUNT_ID=  # WABA ID
```

---

## Cost Estimate

| Item | Monthly cost |
|------|-------------|
| Meta WhatsApp Cloud API (first 1,000 conversations) | $0 |
| Additional conversations ($0.05/conversation) | ~$25–50 |
| Claude Haiku for AI agent (~$0.001/message) | ~$10–20 |
| **Total** | **~$35–70/month** |

Compare to: SalesIQ ($25/agent/mo), per-merchant WhatsApp numbers ($50/number/mo), or a dedicated support team ($2,000+/mo).

---

## Decision Required

Before implementation:

1. **Register a WhatsApp Business number** — needs a dedicated phone number (not personal). Can use a virtual number or new SIM.
2. **Meta Business verification** — needs business documents (certificate of incorporation, utility bill). Takes 2–4 weeks.
3. **Choose escalation tool** — SalesIQ (already have Zoho?), Freshdesk, Slack, or just email?
4. **Confirm approach** — one shared number now, per-merchant later?
