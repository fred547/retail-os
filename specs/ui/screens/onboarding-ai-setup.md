# Screen: Onboarding — AI Store Setup (v3.8.1)
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
AI-assisted onboarding flow exclusive to v3.8.1: collects brand name, store location, product category, then AI generates a starter product catalogue for owner review.

## Layout
Multi-step wizard with these sub-screens:
1. **Brand Name** — "What's your brand called?" + large input
2. **Store Location** — "Where's your first store?" + large input
3. **Product Category** — "What do you sell?" + selectable list (Fashion, Footwear, Electronics, F&B, Health & Beauty, Sports, Home & Living)
4. **AI Building** — Animated progress showing "Creating your store...", "Building products...", "Setting up loyalty..."
5. **AI Product Review** — Swipe-through of AI-suggested products with Accept/Skip per item + progress bar
6. **Complete** — Summary of what was created + "Go to Dashboard" CTA

## Key Components Used
- Card (for product review items)
- Btn (primary, success, ghost variants)
- StatusPill (category label on each product)
- ProgressBar (review progress indicator)
- Input (large variant, 20px font)

## Data Requirements
- Brand name, store location, product category (user input)
- AI-generated product suggestions (name, price, category, description)

## User Actions
- Fill in brand/location/category across steps
- Accept or Skip each AI-suggested product
- "Skip All" option to bypass product review
- Create PIN after review
- Final "Go to Dashboard" button

## Design Notes
- Category selection: each option is a bordered card, 14px padding, 1.5px border, highlights to blueLight on selection
- AI building screen: sparkle emoji, centered text, animated checkmarks
- Product review: shows confidence badge ("AI Suggestion"), product name/price/category, italic description
- Accept button: green "success" variant; Skip: ghost variant
- Progress bar tracks review completion
