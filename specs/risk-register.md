# Risk Register

> Extracted from Posterita Master Plan v3.9 — Section 20

---

## 20. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Offline sync push fails silently | Low | Medium | Server always accepts; device retries indefinitely; outbox size limit with warning |
| Room wipe loses unpushed outbox | Low | Medium | `onCreate` callback + aggressive push frequency |
| Blink SDK compatibility | Medium | High | Evaluate from playground code early in Phase 1; if incompatible, plan replacement |
| Staff resistance to new UI | Medium | Medium | Keep cashier flow familiar; change navigation only first |
| Supabase Realtime drops | Medium | Low | Web console degrades to polling; Android never depends on Realtime |
| Render cold starts | Low | Medium | Keep instances warm; paid tier with zero-downtime deploys |
| Inventory count disputes overwhelm supervisor | Medium | Medium | Good dashboard UX; auto-resolution when 3rd scan agrees with either; batch dispute view |
| WhatsApp Flow approval delayed by Meta | Medium | High | Build button-based fallback flow alongside Flows; swap seamlessly |
| WhatsApp conversation costs spike | Low | Medium | Monitor monthly; set budget alerts; throttle non-critical templates |
| AI enrichment generates inaccurate product specs | High | Low | Human review required on every field; low-confidence flagged; specs prompt says "don't invent" |
| AI enrichment costs spike on large catalogue | Low | Low | ~$0.01/product; 1,000 products = $12.50. Negligible. |
| Scope creep into deferred features | High | Medium | MVP boundary documented; all deferrals require explicit decision |
| CRM connector fails silently | Medium | Low | CRM is non-critical; dead letter queue with alerts; support team uses Retail OS directly as fallback |
| Shelf barcode labels fade/damage | Medium | Medium | Laminated labels; re-print endpoint; shelf can be looked up by zone+number if barcode unreadable |
| Dual-scan requirement slows inventory counts | Low | Medium | It's deliberate — accuracy over speed. But offer "spot check" mode for daily quick counts (single scan) |
