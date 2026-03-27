package com.posterita.pos.android.util

/**
 * Contextual help text for every screen.
 * Each entry: screen key → (title, bullet points).
 * Shown in a bottom sheet when user taps the ? icon.
 */
object HelpContent {

    data class HelpPage(val title: String, val points: List<String>)

    private val content = mapOf(
        // ── Home ──
        "home" to HelpPage("Home Dashboard", listOf(
            "Tap a tile to open that app (POS, Warehouse, CRM, etc.)",
            "The context bar shows your current Brand › Store › Terminal",
            "Tap the context bar to switch store or terminal",
            "The green/red dot shows your internet connection status",
            "Tap the dot to trigger a manual sync",
        )),

        // ── POS ──
        "pos" to HelpPage("Point of Sale", listOf(
            "Tap a product to add it to the cart",
            "Tap +/- on a cart item to change the quantity",
            "Swipe left on a cart item to remove it",
            "Tap the cart total to proceed to payment",
            "Use the search bar or barcode scanner to find products quickly",
        )),
        "cart" to HelpPage("Cart & Checkout", listOf(
            "Review items before completing the sale",
            "Tap a line item to edit price, quantity, or add a note",
            "Apply a discount with the % button",
            "Split payment between cash and card",
            "The grand total includes tax automatically",
        )),
        "payment" to HelpPage("Payment", listOf(
            "Enter the amount tendered by the customer",
            "Change is calculated automatically",
            "Tap a quick-amount button for common bills",
            "For card payment, select Card and tap Confirm",
            "The receipt prints automatically after payment",
        )),

        // ── Warehouse ──
        "warehouse_home" to HelpPage("Warehouse Hub", listOf(
            "Summary cards show tracked products, low stock, and out of stock counts",
            "Tap a count card to see the affected products",
            "Spot Check: quick count of a few products",
            "Full Count: count every product in the store",
            "Transfer: move stock between stores",
        )),
        "picking" to HelpPage("Picking List", listOf(
            "Shows products that need replenishment (below reorder point)",
            "Scan each product's barcode to mark it as picked",
            "The progress bar shows how many items you've picked",
            "Items are sorted by urgency — out-of-stock items first",
            "Tap Complete when all items are picked",
        )),
        "put_away" to HelpPage("Put Away", listOf(
            "Scan a product barcode to identify it",
            "Then scan the shelf barcode or type the location (e.g., 15-C)",
            "The location is saved and will appear on shelf labels",
            "After assigning, the form resets for the next product",
        )),
        "stock_view" to HelpPage("Stock View", listOf(
            "Browse all products with stock tracking enabled",
            "Use tabs to filter: All, Low Stock, Out of Stock, Expiring",
            "Colors indicate status: green = OK, orange = low, red = out",
            "Expiry dates show in orange (within 30 days) or red (expired)",
        )),
        "shelf_browser" to HelpPage("Shelf Browser", listOf(
            "Browse products grouped by shelf number",
            "Tap a shelf chip to filter products on that shelf",
            "Long-press a product to print its shelf label",
            "Products without a location don't appear here — use Put Away first",
        )),
        "stock_transfer" to HelpPage("Stock Transfer", listOf(
            "Scan a product barcode to select it",
            "Choose the destination store from the dropdown",
            "Enter the quantity to transfer",
            "The transfer deducts from this store and adds to the destination",
            "You cannot transfer more than the current stock",
        )),
        "inventory_count" to HelpPage("Inventory Count", listOf(
            "Scan product barcodes to record counted quantities",
            "Scanning the same product again increments the count",
            "The variance column shows the difference from system quantity",
            "Tap +/- to manually adjust a count",
            "Tap Done to complete — choose whether to reconcile stock levels",
        )),

        // ── CRM ──
        "crm_home" to HelpPage("Customer & Loyalty", listOf(
            "See all your customers sorted by loyalty points",
            "Summary shows total customers, loyalty members, and points outstanding",
            "Tap Search to find a customer by name or phone",
            "Loyalty config shows your earn/redeem rates",
            "Points are earned automatically when customers make purchases",
        )),

        // ── Logistics ──
        "logistics_home" to HelpPage("Delivery Tracking", listOf(
            "Monitor all delivery orders and their status",
            "Use tabs to filter: Active, Pending, In Transit, Delivered",
            "Summary cards show counts per status",
            "Tap Manage to create and update deliveries on the web console",
        )),

        // ── Settings ──
        "settings" to HelpPage("Settings & Admin", listOf(
            "Configure your store, terminals, and users",
            "Manage printers and barcode scanners",
            "Switch between brands if you have multiple",
            "Sync settings control how often data syncs to the cloud",
        )),

        // ── Synchronizer ──
        "synchronizer" to HelpPage("Synchronizer", listOf(
            "Shows the status of data sync between this device and the cloud",
            "↑ SENT: orders, tills, and customers pushed to server",
            "↓ RECEIVED: products, categories, and settings pulled from server",
            "⏳ PENDING: items waiting to be synced",
            "✗ ERRORS: items that failed to sync — tap to see details",
        )),
    )

    /** Get help for a screen. Returns null if no help exists (shouldn't happen). */
    fun get(screen: String): HelpPage? = content[screen]

    /** All available screen keys (for testing/coverage). */
    val allScreens: Set<String> = content.keys
}
