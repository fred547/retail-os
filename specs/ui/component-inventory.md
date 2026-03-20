# Component Inventory
> Source: manus-retail-os/client/src/components/ui/

## Available Components (53 total)

### Layout Components
| Component | File | Description |
|-----------|------|-------------|
| accordion | accordion.tsx | Collapsible content sections |
| aspect-ratio | aspect-ratio.tsx | Maintains aspect ratio for media containers |
| card | card.tsx | Elevated content container with border and shadow |
| carousel | carousel.tsx | Horizontal scrolling content carousel |
| collapsible | collapsible.tsx | Toggle-able content visibility |
| resizable | resizable.tsx | Drag-to-resize panel layout |
| scroll-area | scroll-area.tsx | Custom scrollbar-styled scrollable container |
| separator | separator.tsx | Horizontal or vertical divider line |
| sidebar | sidebar.tsx | Navigation sidebar for web console |
| tabs | tabs.tsx | Tabbed content switcher |

### Navigation Components
| Component | File | Description |
|-----------|------|-------------|
| breadcrumb | breadcrumb.tsx | Hierarchical path navigation |
| navigation-menu | navigation-menu.tsx | Dropdown navigation menu |
| menubar | menubar.tsx | Horizontal menu bar |
| pagination | pagination.tsx | Page number navigation for lists |

### Form Components
| Component | File | Description |
|-----------|------|-------------|
| button | button.tsx | Primary action button with variants |
| button-group | button-group.tsx | Grouped action buttons |
| calendar | calendar.tsx | Date picker calendar |
| checkbox | checkbox.tsx | Boolean toggle checkbox |
| field | field.tsx | Form field wrapper with label |
| form | form.tsx | Form container with validation |
| input | input.tsx | Text input field |
| input-group | input-group.tsx | Input with prefix/suffix addons |
| input-otp | input-otp.tsx | One-time password digit input |
| label | label.tsx | Form field label |
| radio-group | radio-group.tsx | Single-select radio button group |
| select | select.tsx | Dropdown select menu |
| slider | slider.tsx | Range slider input |
| switch | switch.tsx | Toggle on/off switch |
| textarea | textarea.tsx | Multi-line text input |
| toggle | toggle.tsx | Binary toggle button |
| toggle-group | toggle-group.tsx | Multi-option toggle group |

### Display Components
| Component | File | Description |
|-----------|------|-------------|
| alert | alert.tsx | Inline alert/notice message |
| avatar | avatar.tsx | User avatar circle with fallback initials |
| badge | badge.tsx | Small status/count indicator pill |
| chart | chart.tsx | Data visualization chart wrapper |
| empty | empty.tsx | Empty state placeholder |
| item | item.tsx | Generic list item |
| kbd | kbd.tsx | Keyboard shortcut indicator |
| progress | progress.tsx | Progress bar indicator |
| skeleton | skeleton.tsx | Loading placeholder skeleton |
| spinner | spinner.tsx | Loading spinner animation |
| table | table.tsx | Data table with header/body/rows |

### Overlay Components
| Component | File | Description |
|-----------|------|-------------|
| alert-dialog | alert-dialog.tsx | Confirmation dialog with actions |
| command | command.tsx | Command palette / search overlay |
| context-menu | context-menu.tsx | Right-click context menu |
| dialog | dialog.tsx | Modal dialog overlay |
| drawer | drawer.tsx | Side-panel drawer overlay |
| dropdown-menu | dropdown-menu.tsx | Dropdown action menu |
| hover-card | hover-card.tsx | Content shown on hover |
| popover | popover.tsx | Small floating content panel |
| sheet | sheet.tsx | Bottom/side sheet overlay |
| tooltip | tooltip.tsx | Hover hint text |

### Feedback Components
| Component | File | Description |
|-----------|------|-------------|
| sonner | sonner.tsx | Toast notification system (sonner library) |

## Missing Components (needed but not yet built)

These components appear in the prototypes but have no equivalent in the production component library:

| Component | Used In | Description |
|-----------|---------|-------------|
| **Glass** | Home summary, till, sync, metric cards | Glassmorphism card (rgba(255,255,255,0.82), backdrop-filter blur(14px)) |
| **PhoneFrame (PF)** | All mobile screens | Device simulator wrapper (430px, dark bezel, status bar, bottom nav) |
| **BottomNav** | Mobile app screens | 4-tab bottom navigation (Home, POS, Tasks, More) |
| **Pill** | Category filters, tab selectors | Chip-style filter button (38px height, active=blue fill) |
| **StatusPill** | Throughout v3.8.1 | Small colored status indicator (10px font, 99px border-radius) |
| **WhatsAppMsg** | WhatsApp templates screen | Chat bubble component mimicking WhatsApp styling |
| **WAButton** | WhatsApp templates screen | Quick-reply button in WhatsApp style |
| **CoverCell** | OTB dashboard | Stock cover value with color-coded status icon |
| **WMetric** | Web dashboard | Glassmorphism metric card (label, value, subtitle) |
| **WebShell** | All web console screens | Sidebar + content layout wrapper |
| **ListRow** | Staff ops, loyalty, various lists | Reusable list row (left icon, title, subtitle, right content) |
| **BackBtn** | All detail/sub screens | "< Back" navigation link (blue text, left chevron) |
| **Hamburger** | POS top bar | 3-line menu icon in 48px touch target |
| **ProgressBar** | Inventory, loyalty, catalogue | Simple bar indicator (6px height, rounded) |
| **TopBar** | v3.8.1 screens | Sticky header with back button, title, subtitle, right slot |
| **Icon** | v3.8.1 screens (24 icons) | SVG icon system (back, pos, inventory, loyalty, staff, chat, truck, warehouse, barcode, qr, camera, check, x, edit, dollar, whatsapp, star, printer, doc, shift, settings, cart, gift, chart, search, mail, globe, shield) |
| **NumericKeypad** | PIN entry, login | 3x4 grid of number buttons with backspace |
| **DenominationCounter** | Till open/close | Currency denomination entry rows |
