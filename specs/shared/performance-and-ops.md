# Performance and Operations

> Extracted from Posterita Master Plan v3.9 — Sections 15, 16, 17, 24

---

## 15. Performance Targets

*Unchanged from v2 §15. All targets remain:*
- Cold start <3s, scan-to-cart <200ms, checkout <500ms, sync push <1s, API p95 <300ms, etc.

**Addition:**

| Metric | Target |
|---|---|
| Shelf scan to open confirmation | < 500ms |
| Product scan during count (continuous) | < 200ms between scans |
| Inventory count dashboard refresh | < 2 seconds (Realtime subscription) |
| Shelf label PDF generation (100 labels) | < 5 seconds |

---

## 16. Observability and Monitoring

*Unchanged from v2 §16. Sentry, Render metrics, UptimeRobot, structured logging, Firebase Crashlytics all remain as specified.*

---

## 17. Hosting, Cost, and Resource Planning

*Base infrastructure unchanged from v2 §17.*

### Updated Monthly Cost Estimate (Production MVP)

| Service | Estimate |
|---|---|
| Render (API + Worker + Redis) | $40-60 |
| Supabase Pro | $25 |
| Cloudinary Plus | $89 |
| Vercel Pro | $20 |
| Anthropic API (AI enrichment) | $5-15 (depends on catalogue size and re-enrichment frequency) |
| Meta WhatsApp (10K customers/yr, C4) | $20-50 (beyond free 1,000 conversations/month) |
| Sentry, UptimeRobot, Firebase | $0 (free tiers) |
| **Total** | **~$200-260/month** |

---

## 24. Backup and Recovery Strategy

*Unchanged from v2 §24. Supabase Pro daily backups at launch, PITR when volume justifies. Backup checklist remains.*
