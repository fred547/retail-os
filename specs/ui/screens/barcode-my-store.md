# Screen: Barcode My Store
> Module: modules/06-inventory-and-count.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Guided first-time barcoding workflow: walk the store taking photos, AI identifies products, review suggestions, and print barcode/QR labels. Designed for new stores that have products but no barcodes yet.

## Layout (4-step wizard)

### Step 1: Introduction
- TopBar: "Barcode My Store" + "Guided first-time barcoding" subtitle
- Hero card: camera emoji, "Walk Your Store" title, description of the AI-powered flow
- Step list: numbered steps (1. Walk & Snap, 2. AI Identifies, 3. Review & Approve, 4. Print Labels)
- CTA: "Start Capturing" with camera icon

### Step 2: Camera Capture
- TopBar: "Capture Products" + photo count
- Black camera viewfinder area (simulated)
- Snap button
- Photo thumbnail strip showing captured photos
- "Done -- Send to AI" button (appears after first photo)

### Step 3: AI Review
- TopBar: "AI Review" + "N of M" progress
- Per-product review card: AI confidence %, product name, price
- Accept/Skip buttons (2-column: success green | ghost)
- Progress bar

### Step 4: Print Labels
- "Ready to print N labels" card with printer emoji
- Label info: "Labels include: barcode, product name, price, QR code"
- "Print All Labels" button + "Done" ghost button

## Key Components Used
- TopBar
- Card (hero, product review items)
- StatusPill (confidence badge)
- Btn (variants: primary, success, ghost, secondary)
- ProgressBar
- Icon (camera, barcode, printer)

## Data Requirements
- Captured photos
- AI product identification: name, price, confidence percentage
- Barcode generation for approved products
- Printer connectivity

## User Actions
- Take photos of products in the store
- Review AI-identified products one by one
- Accept or skip each suggestion
- Print barcode + QR labels for all approved products

## Design Notes
- Camera viewfinder: black background, 24px border-radius
- AI confidence: "AI Identified - 92% confidence" in blue, 10px/700
- Accept button: green "success" variant; Skip: ghost variant
- Photo thumbnails: 50x50, 8px border-radius, blueLight background
- Label printing card: centered, 48px printer emoji, 16px/800 heading
