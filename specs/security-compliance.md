# Security and Compliance

> Extracted from Posterita Master Plan v3.9 — Sections 18, 19

---

## 18. Security and Compliance

*Unchanged from v2 §18. Access control, audit trail, financial safety, AI safety gates all remain as specified.*

**Addition to Customer Communications:**

- All WhatsApp Flows must collect explicit consent before enrollment
- Consent is dual-scope (brand + product) with separate promo/news flags
- The consent table is append-only — every state change creates a new row for full audit
- Annual consent re-confirmation via WhatsApp template (DPA requirement)
- "STOP" keyword must trigger immediate consent withdrawal and acknowledge within the same conversation turn

---

## 19. Testing Strategy

*v2 §19 testing strategy remains with these additions:*

### Additional E2E Test Scenarios

| Scenario | Coverage |
|---|---|
| Inventory count: 2 devices scan same shelf, counts match | Inventory dual-scan + match |
| Inventory count: 2 devices disagree, 3rd device resolves | Dispute + tiebreak |
| Shelf scan error: scan wrong shelf while another is open | Error handling |
| Customer registration via WhatsApp Flow | WhatsApp + Customer + Loyalty |
| Consent grant -> check in CRM mirror | WhatsApp + Consent + CRM connector |
| Award points at POS -> check wallet on WhatsApp | POS + Loyalty + WhatsApp |
| Voucher redeem at POS -> verify voucher status | POS + Voucher + atomic transaction |
| Shelf label print for 50 shelves | Label generation + printer |
| Campaign activate -> audience estimation -> send templates | Campaign + WhatsApp templates |
| AI enrich product -> review -> accept -> verify master record updated | Catalogue + AI + Review workflow |
| AI enrich with low confidence -> reject -> re-enrich with more context | Catalogue + AI safety controls |
| Generate catalogue PDF from approved products | Catalogue + PDF + Cloudinary |
| Customer scans showroom QR -> receives product details on WhatsApp | Showrooming + WhatsApp + Catalogue |
| Enrolled customer scans receipt QR -> sees points confirmation | Receipt QR + Loyalty + WhatsApp |
| Non-enrolled customer scans receipt QR -> registers -> retroactive points awarded | Receipt QR + Registration + Retroactive award |
| Enrolled customer scans receipt for unlinked order -> order linked, points awarded | Receipt QR + Retroactive link + Idempotent award |
| Owner signup -> AI generates 25 products -> owner accepts 18, skips 7 -> 18 in master | Onboarding + AI generation + product review |
| Owner creates second brand -> AI generates products for different category | Multi-brand + AI context switching |
| Staff login picker -> select user -> enter PIN -> correct store capabilities loaded | Device auth + staff picker + capabilities |

### Additional Manual UAT

| Device Config | Test Focus |
|---|---|
| 2 devices in same count session | Dual-scan workflow, conflict detection |
| Customer WhatsApp on personal phone | Registration Flow, consent, points check |
| Shelf label on Epson receipt printer | Label format, barcode scannability |
