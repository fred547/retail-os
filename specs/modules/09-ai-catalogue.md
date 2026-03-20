# AI Catalogue
> References: shared/architecture.md, shared/data-model.md

## Overview

AI-assisted product catalogue enrichment uses the Anthropic Claude API to generate product descriptions, features, specs, tags, and marketing copy from minimal input (name, SKU, price, category, photo). All AI suggestions require human review before touching the master record. The module also handles catalogue PDF generation with multiple templates and WhatsApp QR codes.

## Relevant Tables

`product`, `product_enrichment`, `product_media`, `product_augmentation`

## API Routes

### Catalogue

- `POST /v1/catalogue/enrich/{product_id}` — Trigger AI enrichment for one product
- `POST /v1/catalogue/enrich/batch` — Trigger enrichment for array of product IDs
- `GET /v1/catalogue/enrichment-queue` — Review queue (products with pending suggestions)
- `GET /v1/catalogue/enrichment/{product_id}` — All suggestions for a product
- `POST /v1/catalogue/enrichment/{id}/accept` — Accept a suggestion
- `POST /v1/catalogue/enrichment/{id}/reject` — Reject a suggestion
- `POST /v1/catalogue/enrichment/{id}/edit` — Accept with edits
- `POST /v1/catalogue/enrich/{product_id}/accept-high-confidence` — Batch accept >80% confidence
- `POST /v1/catalogue/generate` — Generate PDF catalogue from approved products
- `GET /v1/catalogue/templates` — List available PDF templates
- `GET /v1/catalogue/stats` — Enrichment progress dashboard data

## Business Rules

### Product Data Lifecycle

```
1. INGEST          2. AI ENRICHMENT      3. HUMAN REVIEW       4. PUBLISH
Staff enters       AI generates          Accept/Reject         Master record
minimal data       suggestions per       per field             updated
(Name, SKU,        field                 Edit if needed        -> POS card
 Price, Category,  (Short desc,          Diff view             -> Catalogue
 1 photo)          Long desc,            Batch mode            -> WhatsApp
                   Features,             Confidence %          -> Labels
                   Specs, Tags,                                -> Showroom
                   Marketing copy)
```

### AI Enrichment Engine

**Input to AI (per product):**
- Product name, SKU, category, price
- Primary photo (sent as base64 image to Claude)
- Manufacturer name (if known)
- Category context
- Brand voice guidelines
- Existing descriptions from similar products (few-shot examples)

**AI generates (each as a separate `product_enrichment` row):**

| Field | Confidence Signal |
|---|---|
| `short_description` | High — product name + image usually sufficient |
| `long_description` | Medium — may need manufacturer specs |
| `features` | Medium — inferred from image + category |
| `specs` | Low — often needs manufacturer data |
| `tags` | High — straightforward categorization |
| `marketing_copy` | Medium — depends on brand voice accuracy |
| `whatsapp_trigger` | High — formulaic |
| `ai_alt_text` | High — image description |

### Human Review Rules

| Rule | Enforcement |
|---|---|
| Nothing auto-accepted | All AI suggestions start as `pending`. Human must act. |
| Low confidence flagged | Fields with confidence < 50% show warning and amber background |
| Batch accept available | "Accept All High-Confidence" button accepts only fields with confidence > 80% |
| Edit preserves AI trail | If human edits, both AI suggestion and human edit are stored |
| Reject leaves field empty | Rejected suggestions don't populate the master record |
| All fields must be reviewed | Product can't reach `catalogue_ready=true` until all enrichment rows are accepted/rejected/edited |

### Review States

```
pending -> ai_generated -> under_review -> approved (all fields reviewed)
                                        -> needs_revision (some fields rejected)
```

### Batch Enrichment Workflow

1. Upload products CSV — minimal data
2. Upload product photos — matched by SKU to Cloudinary
3. Trigger batch enrichment — BullMQ job per product, rate-limited to 10 concurrent
4. Progress dashboard shows: total, enriched, pending review, approved, rejected
5. Reviewer works through products one by one
6. Catalogue generation once products reach `catalogue_ready=true`

### Catalogue PDF Generation

| Template | Layout | Use Case |
|---|---|---|
| Credit card | Small product card with image, price, QR | Pocket reference cards |
| A5 portrait | Half-page product card | Showroom sell sheets |
| Compact sheet | Multiple products per page | Full catalogue booklet |
| Flyer | Single product, large image | Window display / promo |

Each template includes product image, name, price, short description, WhatsApp QR code, product barcode, brand logo.

**PDF generation endpoint:** `POST /v1/catalogue/generate` using Puppeteer or @react-pdf/renderer.

### AI Safety Controls

- AI never writes to master record directly
- Human review required for every field
- Confidence transparency (AI self-reports)
- Full audit trail
- Prompt versioning via `ai_prompt_hash`
- Rate limiting (10 concurrent API calls)
- Cost visibility dashboard
- "Do NOT invent specifications" in prompt
- Re-enrichment archived, not deleted

### Product Augmentation (Section 39.3)

Beyond catalogue enrichment, AI also discovers:
- Competitor pricing (web scraping)
- Manufacturer specs / datasheets
- Safety certifications
- Country of origin
- Related / complementary products
- Recall or safety alerts
- Trending / seasonal demand signals

### Cost Estimate

- Per product: ~$0.01 (1,500 input tokens + 500 output tokens)
- 100 products: ~$1.25
- 1,000 products: ~$12.50

## Dependencies

- Cloudinary (product images)
- Anthropic API (Claude)
- POS module (product grid reuse for catalogue mode)

## Implementation Notes

- **Phase 2:** AI enrichment engine, enrichment review UI, catalogue PDF generation
- **Phase 3:** Catalogue PDF templates ported from brand portal
- Decision 3: Reuse POS product grid for catalogue generation
- Decision 23: AI generates 20-30 starter products during signup, same pipeline
- Decision 34: AI product ID from photos uses same pipeline
