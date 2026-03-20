# Screen: AI Chat Assistant
> Module: modules/15-ai-agents.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Conversational AI assistant for querying store operations data: sales reports, stock levels, vendor suggestions. Available to all roles.

## Layout
- TopBar: "AI Assistant" + "Ask anything about your operations" subtitle
- Chat area (scrollable):
  - AI messages: left-aligned bubbles with "Posterita AI" label, white background, line border
  - User messages: right-aligned bubbles, blue background, white text
  - Suggested query chips at bottom of chat area
- Input area (sticky bottom):
  - Text input with "Ask anything..." placeholder (20px border-radius)
  - Send button

## Key Components Used
- TopBar
- Chat message bubbles (custom styled)
- Suggested query pill chips
- Input + Btn (send)

## Data Requirements
- Conversation history
- Pre-built queries: "What were sales yesterday?", "How many sandals in stock?", "Suggest vendors for sandals"
- AI responses with formatted data (line breaks, bullet points)

## User Actions
- Type a question and press Enter or tap Send
- Tap a suggested query chip to auto-fill
- Scroll through conversation history

## Design Notes
- AI bubbles: white background, line border, 16px border-radius, 10px 14px padding, 13px/1.5 line-height
- AI label: 10px/700 blue text
- User bubbles: blue background, no border, 16px border-radius, white text
- Suggested chips: 20px pill border-radius, 6px 12px padding, paper background, line border, 11px/600 blue text
- Input: flex layout, 10px 14px padding, 20px border-radius, line border, 14px font
- Pre-built responses use \n for line breaks and structured data formatting
