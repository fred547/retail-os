# API Conventions

> Extracted from Posterita Master Plan v3.9 — Section 11

---

## 11. API Conventions

*Unchanged from v2 §11. Wire format (snake_case, /v1/ prefix), response envelopes, error codes, cursor pagination, idempotency, rate limiting all remain as specified.*

### Summary of Conventions

- **Wire format:** All API fields use `snake_case`. All routes are prefixed with `/v1/`.
- **Response envelopes:** Standard wrapper for all responses.
- **Error codes:** Consistent error code format across all endpoints.
- **Cursor pagination:** Cursor-based pagination for all list endpoints.
- **Idempotency:** `idempotency_key` support on all mutation endpoints to enable safe offline replay.
- **Rate limiting:** Per-endpoint rate limiting enforced via Redis.
