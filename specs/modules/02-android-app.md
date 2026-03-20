# Android App
> References: shared/architecture.md

## Overview

The Android app is a single shell app for all internal store operations, built with Kotlin and Gradle multi-module architecture. It uses Android Play Feature Delivery to comply with Play Store policies and minimize install size. Only core modules install at first; feature modules download on demand when the user first taps them.

## Relevant Tables

All tables are accessed indirectly through the backend API. Local Room database caches server-owned entities and queues device-owned mutations via the outbox.

## API Routes

All backend API routes are consumed by the Android app through `:core:network`.

## Business Rules

### Module Structure — Android Dynamic Feature Modules

```
INSTALL-TIME (always present, every device):
─────────────────────────────────────────────
:app                          <- Shell, DI root, QR deep router
:core:designsystem            <- Theme, components, brand tokens
:core:auth                    <- Login, PIN, biometric, token management
:core:device                  <- Enrollment, heartbeat, revocation
:core:data                    <- Room DB, DAOs, sync engine, offline queue
:core:navigation              <- Shared nav graph, deep links, QR payload router
:core:sync                    <- Outbox push, server pull, retry engine
:core:network                 <- API client, interceptors, connectivity observer
:core:printer                 <- Epson ePOS + Zebra ZPL abstraction
:core:scanner                 <- Barcode/QR scan: camera + Bluetooth HID
:core:media                   <- Cloudinary upload, camera, signature capture
:feature:home                 <- Role-first home screen, brand switcher (owner)

ON-DEMAND (downloaded when user first opens feature):
─────────────────────────────────────────────────────
:feature:onboarding           <- Owner signup, AI product review       [trigger: first launch, no account]
:feature:pos                  <- POS, cart, checkout, payment           [trigger: tap POS tile]
:feature:reconciliation       <- Close till, evidence, discrepancy      [trigger: tap close till]
:feature:inventory-count      <- Dual-scan count, spot check            [trigger: tap Inventory tile]
:feature:barcode-my-store     <- Guided first-time barcoding (§34)      [trigger: tap "Barcode My Store"]
:feature:warehouse            <- Container receiving, inspection, claims  [trigger: tap Warehouse tile]
:feature:loyalty              <- Earn/redeem/consent at POS             [trigger: first loyalty interaction]
:feature:catalogue            <- POS grid -> PDF gen + barcode labels    [trigger: tap Catalogue tile]
:feature:chat                 <- AI assistant + messaging               [trigger: tap Chat tab]
:feature:logistics            <- Driver delivery, packages, COD, cash   [trigger: tap Logistics tile]
:feature:staff-ops            <- Attendance, leave, tasks, expenses     [trigger: tap Staff Ops tile]
:feature:supervisor           <- Approvals, checklists, shift mgmt      [trigger: tap Supervisor tile]
```

### Play Feature Delivery Implementation

```kotlin
// In :core:navigation — when user taps a feature tile on home screen
fun navigateToFeature(feature: DynamicFeature) {
    val manager = SplitInstallManagerFactory.create(context)
    if (manager.installedModules.contains(feature.moduleName)) {
        navController.navigate(feature.startDestination)  // instant
    } else {
        showDownloadProgress(feature) // "Downloading POS module... 78%"
        val request = SplitInstallRequest.newBuilder()
            .addModule(feature.moduleName)
            .build()
        manager.startInstall(request)
            .addOnSuccessListener { navController.navigate(feature.startDestination) }
            .addOnFailureListener { showDownloadError(it) }
    }
}
```

**Why this matters:**
- **Play Store compliant** — no unnecessary code downloaded
- **Fast first install** — base app ~8MB. A cashier never downloads `:feature:logistics` or `:feature:supervisor`
- **Owner testing** — owner downloads base -> onboarding downloads (~3MB) -> tries POS (~4MB) -> tries inventory (~2MB). Each feature downloads in seconds on 4G.
- **Home screen only shows tiles for features the user's role permits.** But even among permitted features, code isn't on disk until first tap.

### Approach to Existing Playground Code

1. **Evaluate** the existing code for reusable patterns (layouts, navigation, Blink integration, scanner handling)
2. **Adopt** good code directly into the new module structure where it fits
3. **Rebuild** anything that doesn't align with the target architecture (offline-first, capability-driven, clean module boundaries)
4. **Architecture wins** over code preservation
5. **No `:feature:pos-legacy` wrapper** — build `:feature:pos` properly from the start.

### `:core:scanner` — Configurable Scanning

Both camera and external Bluetooth barcode scanners are supported:

- **Camera-based scanning** via ML Kit or ZXing
- **Bluetooth HID scanner input** — external scanners that act as keyboard input
- **QR code scanning** — shelf labels, attendance QR, customer registration QR
- **Configurable modes:**
  - **Auto-scan:** scan detected -> immediately process -> ready for next (fastest for inventory counting)
  - **Scan-confirm:** scan detected -> show product/shelf -> user taps confirm -> process (safest for POS)
  - **Continuous batch:** rapid fire scanning with audio beep per scan, product list accumulates (for shelf counting)
- **Scan-to-resolution:** scanner emits a generic `ScanResult(barcode_data, format)` event. The consuming feature module resolves it.

### `:core:printer` — Multi-printer Support

| Printer Type | SDK | Use Case |
|---|---|---|
| Epson ePOS (receipt) | Epson ePOS SDK | POS receipts, small shelf labels |
| Zebra (label) | Zebra Link-OS SDK or ZPL direct | Enterprise shelf labels, product barcode labels |
| Generic (personal) | Android Print Framework | PDF catalogue pages, reports |

The module exposes a `PrinterService` interface. Printer type is configured per device during enrollment.

### `:feature:catalogue` — POS Screen Reuse for Catalogue

The POS product selection screen is reused for catalogue generation. Same product grid, same categories, same images — but with a different action mode:

- **POS mode:** tap product -> add to cart
- **Catalogue mode:** select products -> choose output format:
  - Print barcode labels (Zebra or Epson)
  - Generate PDF catalogue (credit card/A5/flyer templates)
  - Print shelf labels

## Dependencies

- Backend platform (all API endpoints)
- Cloudinary (media upload/display)
- Epson ePOS SDK, Zebra Link-OS SDK
- Blink SDK (card payments)

## Implementation Notes

- **Phase 1:** Shell, core modules, POS, onboarding, home, auth, device enrollment
- **Phase 2:** Inventory count, loyalty, catalogue, chat, logistics (basic), reconciliation
- **Phase 3:** Staff ops, supervisor, warehouse, barcode-my-store, full logistics
- Decision 31: Play Feature Delivery with SplitInstallManager
- Decision 1: Build `:feature:pos` fresh, no legacy wrapper
