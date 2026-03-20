# Screen: WhatsApp Templates
> Module: modules/09-whatsapp-integration.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/WhatsApp.tsx (partial)

## Purpose
Preview and manage WhatsApp message templates for customer communications: loyalty welcome, points earned, voucher issued, digital receipt, receipt QR scan, and marketplace redemption.

## Layout
- TopBar: "WhatsApp Templates" + "Customer message preview" subtitle
- Template selector: horizontal scroll of pill-shaped tabs with template names
- WhatsApp-style preview area:
  - Beige background (#ECE5DD) simulating WhatsApp chat
  - "Today" date pill
  - Message bubbles (white for incoming, #DCF8C6 green for outgoing)
  - Quick reply buttons below messages
- Template name display at bottom with Meta approval note

## Key Components Used
- TopBar
- WhatsAppMsg (message bubble component with from, time, content, buttons)
- WAButton (quick reply button styled like WhatsApp)
- Pill selector tabs

## Data Requirements
- Template definitions: name, title, message content, button labels
- Template approval status (Meta/WhatsApp Business API)

## User Actions
- Tap template tabs to preview different message types
- View rendered message preview
- Access template for editing (implied)

## Available Templates
1. **loyalty_welcome**: Welcome to loyalty program + points bonus
2. **points_earned**: Points awarded after purchase + receipt link
3. **voucher_issued**: New voucher notification with code and validity
4. **digital_receipt**: Full receipt with line items sent via WhatsApp
5. **receipt_scan_new**: When a non-member scans receipt QR, prompt to join
6. **marketplace_redeem**: Points redemption catalog via WhatsApp

## Design Notes
- WhatsApp preview: ECE5DD background, 12px padding, 24px border-radius top corners
- Message bubbles: 85% max-width, 12px border-radius, 8px 12px padding, subtle shadow
- Incoming: white background; Outgoing: #DCF8C6 green
- Sender name: 11px/700 in #075E54 (WhatsApp green)
- Message time: 9px, #999, right-aligned
- Quick reply buttons: center-aligned, #00A5F4 blue text, 12px/600, separated by 1px top border
- Template tabs: 20px pill border-radius, 6px 12px padding, 10px/700 font
- Active tab: #25D366 (WhatsApp green) background, white text
