package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityCartBinding
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.local.entity.DiscountCode
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.data.local.entity.Modifier
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.data.remote.BlinkApiService
import com.posterita.pos.android.data.remote.model.request.BlinkTillQRCodeRequest
import com.posterita.pos.android.data.remote.model.request.LoyaltyAwardRequest
import com.posterita.pos.android.data.repository.LoyaltyRepository
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.service.OrderService
import com.posterita.pos.android.service.PaymentInfo
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.ScrollView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.textfield.MaterialAutoCompleteTextView
import com.google.android.material.textfield.TextInputEditText
import com.posterita.pos.android.ui.adapter.CartProductAdapter
import com.posterita.pos.android.ui.viewmodel.CustomerViewModel
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID
import javax.inject.Inject
import kotlin.math.ceil

@AndroidEntryPoint
class CartActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityCartBinding

    private val shoppingCartViewModel: ShoppingCartViewModel by viewModels()
    private val customerViewModel: CustomerViewModel by viewModels()

    @Inject
    lateinit var orderService: OrderService

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var printerManager: PrinterManager

    @Inject
    lateinit var db: AppDatabase

    @Inject
    lateinit var apiService: ApiService

    @Inject
    lateinit var blinkApiService: BlinkApiService

    @Inject
    lateinit var loyaltyRepository: LoyaltyRepository

    private lateinit var cartAdapter: CartProductAdapter

    private var blinkPollingJob: Job? = null
    private var isFromKitchen: Boolean = false

    private val customerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val customer = result.data?.getSerializableExtra("SELECTED_CUSTOMER") as? Customer
            if (customer != null) {
                shoppingCartViewModel.setCustomer(customer)
                if (pendingPayAfterCustomer) {
                    pendingPayAfterCustomer = false
                    proceedToPayment()
                }
            }
        } else {
            pendingPayAfterCustomer = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_cart)
        binding = ActivityCartBinding.bind(drawerLayout.getChildAt(0))
        supportActionBar?.hide()
        setupConnectivityDot()

        // Back button
        binding.buttonBack?.setOnClickListener { finish() }

        // Browse Products button in empty cart state
        binding.buttonBrowseProducts?.setOnClickListener { finish() }

        isFromKitchen = intent.getBooleanExtra("FROM_KITCHEN", false)

        setupRecyclerView()
        setupButtons()
        setupMoreMenu()
        setupCustomerBar()
        observeViewModel()

        // Tap on total to show discount dialog
        binding.textViewGrandTotal?.setOnClickListener { showDiscountOnTotalDialog() }
    }

    override fun onDestroy() {
        super.onDestroy()
        blinkPollingJob?.cancel()
    }

    private fun setupRecyclerView() {
        cartAdapter = CartProductAdapter(
            shoppingCartViewModel,
            object : CartProductAdapter.OnCartItemClickListener {
                override fun onCartItemClick(cartItem: CartItem) {
                    showEditCartItemDialog(cartItem)
                }
            },
            onProductImageClick = { cartItem ->
                showProductDetailDialog(cartItem.product)
            },
            onRemovalRequested = { cartItem, removalType, proceed ->
                handleCartRemoval(cartItem, removalType, proceed)
            }
        )
        binding.recyclerViewCartLines.apply {
            layoutManager = LinearLayoutManager(this@CartActivity)
            adapter = cartAdapter
        }
    }

    private fun setupButtons() {
        binding.buttonPayOrder.setOnClickListener {
            onPayClicked()
        }

        binding.buttonHoldOrder.setOnClickListener {
            holdOrder()
        }

        // MORE button — anchored popup menu near the button
        findViewById<View>(R.id.button_more_cart)?.setOnClickListener { anchor ->
            val options = arrayOf("Clear Cart", "Hold Order")
            val popup = android.widget.ListPopupWindow(this)
            popup.anchorView = anchor
            popup.setAdapter(android.widget.ArrayAdapter(this, android.R.layout.simple_list_item_1, options))
            popup.width = (180 * resources.displayMetrics.density).toInt()
            popup.isModal = true
            popup.setOnItemClickListener { _, _, position, _ ->
                popup.dismiss()
                when (position) {
                    0 -> {
                        if (shoppingCartViewModel.shoppingCart.isEmpty()) {
                            Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
                        } else {
                            AlertDialog.Builder(this)
                                .setTitle("Clear Cart")
                                .setMessage("Are you sure you want to clear all items?")
                                .setPositiveButton("Clear") { _, _ ->
                                    shoppingCartViewModel.clearCart()
                                    Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                                }
                                .setNegativeButton("Cancel", null)
                                .show()
                        }
                    }
                    1 -> holdOrder()
                }
            }
            popup.show()
        }

        // CLEAR button (bin icon in customer row)
        binding.buttonClearCart.setOnClickListener {
            if (shoppingCartViewModel.shoppingCart.isEmpty()) return@setOnClickListener
            AlertDialog.Builder(this)
                .setTitle("Clear Cart")
                .setMessage("Are you sure you want to clear all items?")
                .setPositiveButton("Clear") { _, _ ->
                    shoppingCartViewModel.clearCart()
                    Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // DISCOUNT button
        binding.buttonDiscount.setOnClickListener {
            showDiscountOnTotalDialog()
        }

        // MORE bottom button — shows popup with Hold, Coupon, Note, Tips
        binding.buttonMoreBottom.setOnClickListener { view ->
            val popup = PopupMenu(this, view)
            popup.menuInflater.inflate(R.menu.menu_cart_options, popup.menu)
            popup.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    R.id.menu_clear_cart -> {
                        shoppingCartViewModel.clearCart()
                        Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                        true
                    }
                    R.id.menu_add_note -> {
                        showAddNoteDialog()
                        true
                    }
                    R.id.menu_add_tips -> {
                        showTipsDialog()
                        true
                    }
                    else -> false
                }
            }
            popup.show()
        }

        // CUST button — open numpad
        binding.buttonAddCustomer.setOnClickListener {
            showCustomerNumpadDialog()
        }

        // Customer search is handled by setupCustomerBar()

        // NOTE button (visible in restaurant mode)
        if (prefsManager.isRestaurant) {
            binding.buttonNote?.visibility = View.VISIBLE
        }
        binding.buttonNote?.setOnClickListener {
            showAddNoteDialog()
        }

        // Kitchen order banner
        if (isFromKitchen) {
            binding.textViewKitchenBanner?.visibility = View.VISIBLE
        }

        // Keep hidden coupon/more_options for binding compatibility
        binding.buttonCoupon.setOnClickListener {
            showCouponDialog()
        }
    }

    private fun showMorePopup(anchorView: View) {
        val popup = PopupMenu(this, anchorView)
        popup.menuInflater.inflate(R.menu.menu_cart_options, popup.menu)
        popup.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.menu_clear_cart -> {
                    if (shoppingCartViewModel.shoppingCart.isEmpty()) {
                        Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
                    } else {
                        AlertDialog.Builder(this)
                            .setTitle("Clear Cart")
                            .setMessage("Remove all items from the cart?")
                            .setPositiveButton("Clear") { _, _ ->
                                shoppingCartViewModel.clearCart()
                                Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                            }
                            .setNegativeButton("Cancel", null)
                            .show()
                    }
                    true
                }
                R.id.menu_add_note -> {
                    showAddNoteDialog()
                    true
                }
                R.id.menu_add_tips -> {
                    showTipsDialog()
                    true
                }
                else -> false
            }
        }
        popup.show()
    }

    /**
     * Handles cart item removal/decrease with optional security checks.
     * Settings control whether a note and/or supervisor PIN is required.
     */
    private fun handleCartRemoval(
        cartItem: CartItem,
        removalType: CartProductAdapter.RemovalType,
        proceed: () -> Unit
    ) {
        // Supervisors, admins, and owners bypass removal security
        val currentUser = sessionManager.user
        if (currentUser?.canRemoveItemsWithoutPin == true) {
            proceed()
            return
        }

        val requireNote = prefsManager.cartRemovalRequireNote
        val requirePin = prefsManager.cartRemovalRequirePin

        if (!requireNote && !requirePin) {
            proceed()
            return
        }

        val actionLabel = when (removalType) {
            CartProductAdapter.RemovalType.REMOVE_LINE -> "Remove ${cartItem.product.name}"
            CartProductAdapter.RemovalType.DECREASE_QTY -> "Decrease qty of ${cartItem.product.name}"
        }

        if (requirePin) {
            showRemovalPinDialog(actionLabel, requireNote, proceed)
        } else if (requireNote) {
            showRemovalNoteDialog(actionLabel, proceed)
        }
    }

    private fun showRemovalNoteDialog(actionLabel: String, proceed: () -> Unit) {
        val editText = EditText(this).apply {
            hint = "Reason for removal"
            setPadding(48, 24, 48, 24)
            setSingleLine()
        }

        AlertDialog.Builder(this)
            .setTitle(actionLabel)
            .setMessage("Please provide a reason:")
            .setView(editText)
            .setPositiveButton("Confirm") { _, _ ->
                val reason = editText.text.toString().trim()
                if (reason.isEmpty()) {
                    Toast.makeText(this, "Reason is required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                // TODO: Log removal reason to audit trail
                proceed()
                Toast.makeText(this, "Removed — $reason", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showRemovalPinDialog(actionLabel: String, alsoRequireNote: Boolean, proceed: () -> Unit) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_numpad, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val txtTitle = dialogView.findViewById<TextView>(R.id.txt_title)
        val txtDisplay = dialogView.findViewById<TextView>(R.id.txt_price_display)
        val txtProductName = dialogView.findViewById<TextView>(R.id.txt_product_name)
        val btnCancel = dialogView.findViewById<View>(R.id.button_cancel)
        val btnDone = dialogView.findViewById<View>(R.id.button_add)

        txtTitle?.text = "Supervisor PIN"
        txtProductName?.text = actionLabel
        txtDisplay?.text = ""

        var pinStr = ""

        val updateDisplay = {
            txtDisplay?.text = "•".repeat(pinStr.length)
        }

        val appendDigit = fun(digit: String) {
            if (pinStr.length >= 6) return
            pinStr += digit
            updateDisplay()
        }

        // Numpad buttons
        dialogView.findViewById<View>(R.id.btn_1)?.setOnClickListener { appendDigit("1") }
        dialogView.findViewById<View>(R.id.btn_2)?.setOnClickListener { appendDigit("2") }
        dialogView.findViewById<View>(R.id.btn_3)?.setOnClickListener { appendDigit("3") }
        dialogView.findViewById<View>(R.id.btn_4)?.setOnClickListener { appendDigit("4") }
        dialogView.findViewById<View>(R.id.btn_5)?.setOnClickListener { appendDigit("5") }
        dialogView.findViewById<View>(R.id.btn_6)?.setOnClickListener { appendDigit("6") }
        dialogView.findViewById<View>(R.id.btn_7)?.setOnClickListener { appendDigit("7") }
        dialogView.findViewById<View>(R.id.btn_8)?.setOnClickListener { appendDigit("8") }
        dialogView.findViewById<View>(R.id.btn_9)?.setOnClickListener { appendDigit("9") }
        dialogView.findViewById<View>(R.id.btn_0)?.setOnClickListener { appendDigit("0") }

        dialogView.findViewById<View>(R.id.btn_clear)?.setOnClickListener {
            if (pinStr.isNotEmpty()) {
                pinStr = pinStr.dropLast(1)
                updateDisplay()
            }
        }

        btnCancel?.setOnClickListener { dialog.dismiss() }

        btnDone?.setOnClickListener {
            if (pinStr.isEmpty()) {
                Toast.makeText(this, "Enter supervisor PIN", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // Verify PIN against any admin/owner user
            lifecycleScope.launch(Dispatchers.IO) {
                val users = db.userDao().getAllUsers()
                val validUser = users.find { it.pin == pinStr && it.isAdminOrOwner }
                withContext(Dispatchers.Main) {
                    if (validUser != null) {
                        dialog.dismiss()
                        if (alsoRequireNote) {
                            showRemovalNoteDialog(actionLabel, proceed)
                        } else {
                            proceed()
                        }
                    } else {
                        Toast.makeText(this@CartActivity, "Invalid supervisor PIN", Toast.LENGTH_SHORT).show()
                        pinStr = ""
                        updateDisplay()
                    }
                }
            }
        }

        dialog.show()
    }

    private fun setupCustomerBar() {
        // Tapping the customer bar opens the customer numpad dialog (phone + name search)
        binding.layoutCustomerBar?.setOnClickListener {
            showCustomerNumpadDialog()
        }
        binding.imageViewSearchCustomer?.setOnClickListener {
            showCustomerNumpadDialog()
        }

        // Clear cart bin icon
        binding.buttonClearCart?.setOnClickListener {
            if (shoppingCartViewModel.shoppingCart.isEmpty()) return@setOnClickListener
            AlertDialog.Builder(this)
                .setTitle("Clear Cart")
                .setMessage("Remove all items from the cart?")
                .setPositiveButton("Clear") { _, _ ->
                    shoppingCartViewModel.clearCart()
                    Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Note chip
        binding.chipNote?.setOnClickListener { showAddNoteDialog() }

        // Tips chip
        binding.chipTips?.setOnClickListener { showTipsDialog() }
    }

    private fun setupMoreMenu() {
        // Toolbar MORE icon
        binding.buttonMore.setOnClickListener { view -> showMorePopup(view) }
        // Bottom bar MORE button
        binding.buttonMoreBar?.setOnClickListener { view -> showMorePopup(view) }
    }

    // ==================== PAYMENT DIALOG ====================

    /**
     * Entry point for payment — if restaurant mode, show order type selection first.
     */
    /** Tracks whether we're waiting to resume pay after customer selection. */
    private var pendingPayAfterCustomer = false

    private fun onPayClicked() {
        val grandTotal = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
        if (grandTotal <= 0) return

        val zeroQtyItems = shoppingCartViewModel.shoppingCart.cartItems.values.filter { it.qty <= 0 }
        if (zeroQtyItems.isNotEmpty()) {
            val names = zeroQtyItems.mapNotNull { it.product.name }.joinToString(", ")
            Toast.makeText(this, "Cannot sell items with zero quantity: $names", Toast.LENGTH_LONG).show()
            return
        }

        // Check if customer is required before checkout
        if (prefsManager.requireCustomerBeforeCheckout) {
            val currentCustomer = sessionManager.selectedCustomer
            if (currentCustomer == null || currentCustomer.customer_id == 0) {
                pendingPayAfterCustomer = true
                Toast.makeText(this, "Please select a customer before checkout", Toast.LENGTH_SHORT).show()
                showCustomerNumpadDialog()
                return
            }
        }

        proceedToPayment()
    }

    private fun proceedToPayment() {
        if (isFromKitchen) {
            // Coming from kitchen — go straight to payment (no order type dialog)
            showPaymentDialog()
        } else if (prefsManager.isRestaurant) {
            showOrderTypeDialog()
        } else {
            showPaymentDialog()
        }
    }

    private fun showOrderTypeDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_order_type, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        dialogView.findViewById<View>(R.id.btn_dine_in).setOnClickListener {
            shoppingCartViewModel.shoppingCart.orderType = "dine_in"
            dialog.dismiss()
            showTableSelectionDialog()
        }

        dialogView.findViewById<View>(R.id.btn_take_away).setOnClickListener {
            shoppingCartViewModel.shoppingCart.orderType = "take_away"
            dialog.dismiss()
            showPaymentDialog()
        }

        dialog.show()
    }

    private fun showTableSelectionDialog() {
        val storeId = prefsManager.storeId

        lifecycleScope.launch(Dispatchers.IO) {
            val tables = db.restaurantTableDao().getTablesByStore(storeId)
            withContext(Dispatchers.Main) {
                if (tables.isEmpty()) {
                    // No tables set up — ask to create some or go straight to payment
                    showCreateTablesDialog(storeId)
                } else {
                    showTablePickerDialog(tables)
                }
            }
        }
    }

    private fun showCreateTablesDialog(storeId: Int) {
        val editText = EditText(this).apply {
            hint = "Number of tables (e.g. 10)"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
        }

        AlertDialog.Builder(this)
            .setTitle("Setup Tables")
            .setMessage("No tables found. How many tables would you like to create?")
            .setView(editText)
            .setPositiveButton("Create") { _, _ ->
                val count = editText.text.toString().toIntOrNull() ?: 0
                if (count > 0) {
                    lifecycleScope.launch(Dispatchers.IO) {
                        for (i in 1..count) {
                            db.restaurantTableDao().insertTable(
                                com.posterita.pos.android.data.local.entity.RestaurantTable(
                                    table_name = "Table $i",
                                    store_id = storeId,
                                    terminal_id = prefsManager.terminalId
                                )
                            )
                        }
                        val tables = db.restaurantTableDao().getTablesByStore(storeId)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@CartActivity, "$count tables created", Toast.LENGTH_SHORT).show()
                            showTablePickerDialog(tables)
                        }
                    }
                }
            }
            .setNegativeButton("Skip") { _, _ ->
                // Continue to payment without table
                showPaymentDialog()
            }
            .show()
    }

    private fun showTablePickerDialog(tables: List<com.posterita.pos.android.data.local.entity.RestaurantTable>) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_table_selection, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val gridLayout = dialogView.findViewById<android.widget.GridLayout>(R.id.grid_tables)
        val btnSendToKitchen = dialogView.findViewById<View>(R.id.button_send_to_kitchen)
        val btnPayNow = dialogView.findViewById<View>(R.id.button_pay_now)

        var selectedTable: com.posterita.pos.android.data.local.entity.RestaurantTable? = null
        val tableViews = mutableListOf<TextView>()

        gridLayout.columnCount = 3

        tables.forEach { table ->
            val tv = TextView(this).apply {
                text = table.table_name
                textSize = 14f
                gravity = android.view.Gravity.CENTER
                setPadding(12, 20, 12, 20)
                setTextColor(if (table.is_occupied) resources.getColor(R.color.white, null) else resources.getColor(R.color.black, null))
                setBackgroundResource(if (table.is_occupied) R.drawable.btn_rounded_red else R.drawable.stroke_btn)

                val params = android.widget.GridLayout.LayoutParams().apply {
                    width = 0
                    height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                    columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1f)
                    setMargins(4, 4, 4, 4)
                }
                layoutParams = params

                setOnClickListener {
                    selectedTable = table
                    // Highlight selected — reset all to default first
                    tableViews.forEachIndexed { idx, v ->
                        if (idx < tables.size) {
                            val t = tables[idx]
                            v.setBackgroundResource(if (t.is_occupied) R.drawable.btn_rounded_red else R.drawable.stroke_btn)
                            v.setTextColor(if (t.is_occupied) resources.getColor(R.color.white, null) else resources.getColor(R.color.black, null))
                        }
                    }
                    setBackgroundResource(R.drawable.btn_rounded)
                    setTextColor(resources.getColor(R.color.white, null))

                    // If table is occupied, load its existing order
                    if (table.is_occupied && table.current_order_id != null) {
                        Toast.makeText(this@CartActivity, "${table.table_name} has an open order", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            tableViews.add(tv)
            gridLayout.addView(tv)
        }

        // Send to Kitchen = hold order on the selected table (or merge if occupied)
        btnSendToKitchen.setOnClickListener {
            val table = selectedTable
            if (table == null) {
                Toast.makeText(this, "Please select a table", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (table.is_occupied && table.current_order_id != null) {
                // Table has existing order — ask to merge
                dialog.dismiss()
                AlertDialog.Builder(this)
                    .setTitle("Add to ${table.table_name}?")
                    .setMessage("This table already has an open order. Add current items to the existing order?")
                    .setPositiveButton("Add Items") { _, _ ->
                        addItemsToExistingOrder(table)
                    }
                    .setNeutralButton("Replace") { _, _ ->
                        holdOrderOnTable(table)
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            } else {
                dialog.dismiss()
                holdOrderOnTable(table)
            }
        }

        // Pay Now = proceed to payment
        btnPayNow.setOnClickListener {
            val table = selectedTable
            if (table == null) {
                Toast.makeText(this, "Please select a table", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            dialog.dismiss()
            // Set note with table info
            val currentNote = shoppingCartViewModel.shoppingCart.note ?: ""
            val tableNote = "Table: ${table.table_name}"
            if (!currentNote.contains(tableNote)) {
                shoppingCartViewModel.setNote(if (currentNote.isNotBlank()) "$currentNote | $tableNote" else tableNote)
            }
            showPaymentDialog()
        }

        dialog.show()
    }

    private fun holdOrderOnTable(table: com.posterita.pos.android.data.local.entity.RestaurantTable) {
        val cart = shoppingCartViewModel.shoppingCart
        if (cart.isEmpty()) {
            Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
            return
        }

        val terminalId = prefsManager.terminalId
        val storeId = prefsManager.storeId
        val tillId = sessionManager.till?.tillId ?: 0

        val holdJson = cart.toJson().apply {
            put("tableId", table.table_id)
            put("tableName", table.table_name)
            put("isKitchenOrder", true)
        }

        val holdOrder = HoldOrder(
            dateHold = java.sql.Timestamp(System.currentTimeMillis()),
            json = holdJson,
            description = "${table.table_name} - Dine In",
            tillId = tillId,
            terminalId = terminalId,
            storeId = storeId
        )

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val holdId = db.holdOrderDao().insertHoldOrder(holdOrder)
                // Mark table as occupied
                db.restaurantTableDao().updateTableStatus(
                    tableId = table.table_id,
                    occupied = true,
                    orderId = holdId.toString()
                )

                // Print to kitchen printers only
                val kitchenOrderDetails = buildKitchenOrderDetails(cart, table.table_name)
                if (kitchenOrderDetails != null) {
                    printerManager.printKitchenOnly(kitchenOrderDetails)
                }

                withContext(Dispatchers.Main) {
                    shoppingCartViewModel.clearCart()
                    Toast.makeText(this@CartActivity, "Order sent to kitchen — ${table.table_name}", Toast.LENGTH_SHORT).show()
                    finish()
                }
            } catch (e: Exception) {
                // Rollback: if hold order was saved but table update failed, clean up
                try {
                    db.restaurantTableDao().updateTableStatus(table.table_id, false, null)
                } catch (_: Exception) { }
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CartActivity, "Failed to send order: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    /**
     * Add current cart items to an existing kitchen order on an occupied table.
     */
    private fun addItemsToExistingOrder(table: com.posterita.pos.android.data.local.entity.RestaurantTable) {
        val cart = shoppingCartViewModel.shoppingCart
        if (cart.isEmpty()) {
            Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
            return
        }

        val orderId = table.current_order_id?.toIntOrNull()
        if (orderId == null) {
            // Fallback: no valid order ID, create a new order
            holdOrderOnTable(table)
            return
        }

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val existingOrders = db.holdOrderDao().getHoldOrdersByTerminal(prefsManager.terminalId)
                val existingOrder = existingOrders.find { it.holdOrderId == orderId }

                if (existingOrder == null) {
                    // Order not found — create new
                    withContext(Dispatchers.Main) {
                        holdOrderOnTable(table)
                    }
                    return@launch
                }

                val existingJson = existingOrder.json ?: JSONObject()
                val existingItems = existingJson.optJSONArray("items") ?: JSONArray()

                // Append new cart items
                for (cartItem in cart.cartItems.values) {
                    existingItems.put(cartItem.toJson())
                }
                existingJson.put("items", existingItems)

                // Recalculate grandtotal
                var newGrand = 0.0
                for (i in 0 until existingItems.length()) {
                    val item = existingItems.optJSONObject(i) ?: continue
                    newGrand += item.optDouble("lineNetAmt", 0.0)
                }
                existingJson.put("grandtotal", newGrand)

                // Update the hold order in DB
                val updatedOrder = existingOrder.copy(json = existingJson)
                db.holdOrderDao().insertHoldOrder(updatedOrder)

                // Print only the NEW items to kitchen
                val kitchenOrderDetails = buildKitchenOrderDetails(cart, table.table_name)
                if (kitchenOrderDetails != null) {
                    printerManager.printKitchenOnly(kitchenOrderDetails)
                }

                withContext(Dispatchers.Main) {
                    shoppingCartViewModel.clearCart()
                    Toast.makeText(this@CartActivity, "Items added to ${table.table_name}", Toast.LENGTH_SHORT).show()
                    finish()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CartActivity, "Failed to add items: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    /**
     * Build OrderDetails from current cart for kitchen printing.
     */
    private fun buildKitchenOrderDetails(cart: com.posterita.pos.android.domain.model.ShoppingCart, tableName: String): com.posterita.pos.android.domain.model.OrderDetails? {
        val account = sessionManager.account ?: return null

        val lines = cart.cartItems.values.map { item ->
            com.posterita.pos.android.domain.model.OrderDetails.OrderLineDetail(
                product_id = item.product.product_id,
                name = item.product.name,
                qtyentered = item.qty,
                priceentered = item.priceEntered,
                priceactual = item.priceEntered,
                lineamt = item.lineAmt,
                linenetamt = item.lineNetAmt,
                taxamt = item.taxAmt,
                modifiers = item.modifiers,
                note = item.note,
                isKitchenItem = item.product.iskitchenitem
            )
        }

        val orderNote = buildString {
            append(tableName)
            val note = cart.note
            if (!note.isNullOrBlank()) append(" | $note")
        }

        return com.posterita.pos.android.domain.model.OrderDetails(
            account_id = account.account_id,
            store_id = prefsManager.storeId,
            terminal_id = prefsManager.terminalId,
            grandtotal = cart.grandTotalAmount,
            subtotal = cart.subTotalAmount,
            qtytotal = cart.totalQty,
            currency = account.currency,
            note = orderNote,
            lines = lines,
            account = com.posterita.pos.android.domain.model.OrderDetails.AccountDetail(
                businessname = account.businessname,
                currency = account.currency
            )
        )
    }

    private fun showPaymentDialog() {
        val grandTotal = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
        if (grandTotal <= 0) return

        val currency = sessionManager.account?.currency ?: ""

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_payment_method, null)
        val textAmountDue = dialogView.findViewById<TextView>(R.id.text_amount_due)
        textAmountDue.text = "$currency ${NumberUtils.formatPrice(grandTotal)}"

        // Pre-fill tips if any
        val editTips = dialogView.findViewById<EditText>(R.id.edit_tips_amount)
        val currentTips = shoppingCartViewModel.shoppingCart.tipsAmount
        if (currentTips > 0) {
            editTips.setText(NumberUtils.formatPrice(currentTips))
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("Select Payment Method")
            .setView(dialogView)
            .setNegativeButton("Cancel", null)
            .create()

        // Helper to apply tips before processing payment
        val applyTips = {
            val tipsAmt = NumberUtils.parseDouble(editTips.text.toString())
            if (tipsAmt > 0) {
                val tipsPct = if (grandTotal > 0) {
                    NumberUtils.parseDouble(NumberUtils.formatPrice(tipsAmt / grandTotal * 100.0))
                } else 0.0
                shoppingCartViewModel.setTips(tipsAmt, tipsPct)
            }
        }

        // Cash
        dialogView.findViewById<View>(R.id.btn_cash).setOnClickListener {
            applyTips()
            dialog.dismiss()
            showCashPaymentDialog(grandTotal)
        }

        // Card
        dialogView.findViewById<View>(R.id.btn_card).setOnClickListener {
            applyTips()
            dialog.dismiss()
            processDirectPayment(grandTotal, "CARD")
        }

        // On Credit
        dialogView.findViewById<View>(R.id.btn_credit).setOnClickListener {
            applyTips()
            dialog.dismiss()
            processDirectPayment(grandTotal, "ON_CREDIT")
        }

        // Check
        dialogView.findViewById<View>(R.id.btn_check).setOnClickListener {
            applyTips()
            dialog.dismiss()
            showCheckPaymentDialog(grandTotal)
        }

        // Peach
        dialogView.findViewById<View>(R.id.btn_peach).setOnClickListener {
            applyTips()
            dialog.dismiss()
            processDirectPayment(grandTotal, "PEACH")
        }

        // Juice
        dialogView.findViewById<View>(R.id.btn_juice).setOnClickListener {
            applyTips()
            dialog.dismiss()
            processDirectPayment(grandTotal, "JUICE")
        }

        // Blink
        dialogView.findViewById<View>(R.id.btn_blink).setOnClickListener {
            applyTips()
            dialog.dismiss()
            showBlinkPaymentDialog(grandTotal)
        }

        // Online
        dialogView.findViewById<View>(R.id.btn_online).setOnClickListener {
            applyTips()
            dialog.dismiss()
            processDirectPayment(grandTotal, "ONLINE")
        }

        // Split/Mix
        dialogView.findViewById<View>(R.id.btn_mixed).setOnClickListener {
            applyTips()
            dialog.dismiss()
            showMixedPaymentDialog(grandTotal)
        }

        // Forex Cash
        dialogView.findViewById<View>(R.id.btn_forex).setOnClickListener {
            applyTips()
            dialog.dismiss()
            showForexPaymentDialog(grandTotal)
        }

        dialog.show()
    }

    // ==================== CASH PAYMENT ====================

    private fun showCashPaymentDialog(grandTotal: Double) {
        val currency = sessionManager.account?.currency ?: ""
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_cash_payment, null)

        val textAmountDue = dialogView.findViewById<TextView>(R.id.text_amount_due)
        val editAmountTendered = dialogView.findViewById<EditText>(R.id.edit_amount_tendered)
        val textChange = dialogView.findViewById<TextView>(R.id.text_change)
        val layoutQuickAmounts = dialogView.findViewById<LinearLayout>(R.id.layout_quick_amounts)

        textAmountDue.text = "$currency ${NumberUtils.formatPrice(grandTotal)}"
        editAmountTendered.setText(NumberUtils.formatPrice(grandTotal))
        editAmountTendered.selectAll()

        // Build quick amount buttons
        val quickAmounts = buildQuickAmounts(grandTotal)
        for (quickAmt in quickAmounts) {
            val btn = TextView(this).apply {
                val label = if (quickAmt == grandTotal) "Exact" else "$currency ${NumberUtils.formatPrice(quickAmt)}"
                text = label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTextColor(Color.parseColor("#007AFF"))
                setBackgroundResource(R.drawable.btn_outline_rounded)
                gravity = Gravity.CENTER
                val hPad = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 16f, resources.displayMetrics).toInt()
                val vPad = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics).toInt()
                setPadding(hPad, vPad, hPad, vPad)
                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                params.marginEnd = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics).toInt()
                layoutParams = params
                setOnClickListener {
                    editAmountTendered.setText(NumberUtils.formatPrice(quickAmt))
                    editAmountTendered.setSelection(editAmountTendered.text.length)
                }
            }
            layoutQuickAmounts.addView(btn)
        }

        editAmountTendered.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val tendered = NumberUtils.parseDouble(s.toString())
                if (tendered > grandTotal) {
                    val change = tendered - grandTotal
                    textChange.text = "Change: $currency ${NumberUtils.formatPrice(change)}"
                    textChange.visibility = View.VISIBLE
                } else {
                    textChange.visibility = View.GONE
                }
            }
        })

        AlertDialog.Builder(this)
            .setTitle("Cash Payment")
            .setView(dialogView)
            .setPositiveButton("Confirm") { _, _ ->
                val tendered = NumberUtils.parseDouble(editAmountTendered.text.toString())
                if (tendered < grandTotal) {
                    Toast.makeText(this, "Insufficient amount", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val change = tendered - grandTotal
                val payments = listOf(
                    PaymentInfo(
                        tendered = tendered,
                        amount = grandTotal,
                        change = change,
                        paymentType = "CASH"
                    )
                )
                createOrder(payments)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    /**
     * Build quick amount suggestions: Exact + round-ups
     */
    private fun buildQuickAmounts(grandTotal: Double): List<Double> {
        val amounts = mutableListOf(grandTotal) // "Exact"

        // Round up to nearest 10, 50, 100, 500, 1000
        val roundUps = listOf(10.0, 50.0, 100.0, 500.0, 1000.0)
        for (r in roundUps) {
            val rounded = ceil(grandTotal / r) * r
            if (rounded > grandTotal && !amounts.contains(rounded)) {
                amounts.add(rounded)
            }
        }

        return amounts.take(6) // max 6 buttons
    }

    // ==================== CARD / DIRECT PAYMENTS ====================

    private fun processDirectPayment(grandTotal: Double, paymentType: String) {
        val payments = listOf(
            PaymentInfo(
                tendered = grandTotal,
                amount = grandTotal,
                change = 0.0,
                paymentType = paymentType
            )
        )
        createOrder(payments)
    }

    // ==================== CHECK PAYMENT ====================

    private fun showCheckPaymentDialog(grandTotal: Double) {
        val currency = sessionManager.account?.currency ?: ""
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_check_payment, null)

        val textAmountDue = dialogView.findViewById<TextView>(R.id.text_amount_due)
        val editCheckNumber = dialogView.findViewById<EditText>(R.id.edit_check_number)
        val editCheckAmount = dialogView.findViewById<EditText>(R.id.edit_check_amount)

        textAmountDue.text = "$currency ${NumberUtils.formatPrice(grandTotal)}"
        editCheckAmount.setText(NumberUtils.formatPrice(grandTotal))

        AlertDialog.Builder(this)
            .setTitle("Check Payment")
            .setView(dialogView)
            .setPositiveButton("Confirm") { _, _ ->
                val checkNo = editCheckNumber.text.toString().trim()
                if (checkNo.isEmpty()) {
                    Toast.makeText(this, "Please enter check number", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val checkAmt = NumberUtils.parseDouble(editCheckAmount.text.toString())
                if (checkAmt < grandTotal) {
                    Toast.makeText(this, "Insufficient amount", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val payments = listOf(
                    PaymentInfo(
                        tendered = checkAmt,
                        amount = grandTotal,
                        change = checkAmt - grandTotal,
                        paymentType = "CHECK",
                        checkNumber = checkNo
                    )
                )
                createOrder(payments)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== BLINK PAYMENT ====================

    private fun showBlinkPaymentDialog(grandTotal: Double) {
        val currency = sessionManager.account?.currency ?: "MUR"
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_blink_payment, null)

        val textAmountDue = dialogView.findViewById<TextView>(R.id.text_amount_due)
        val imageQrCode = dialogView.findViewById<ImageView>(R.id.image_qr_code)
        val progressLoading = dialogView.findViewById<ProgressBar>(R.id.progress_loading)
        val textStatus = dialogView.findViewById<TextView>(R.id.text_status)
        val textInstruction = dialogView.findViewById<TextView>(R.id.text_instruction)

        textAmountDue.text = "$currency ${NumberUtils.formatPrice(grandTotal)}"

        val dialog = AlertDialog.Builder(this)
            .setTitle("Blink Payment")
            .setView(dialogView)
            .setNegativeButton("Cancel") { _, _ ->
                blinkPollingJob?.cancel()
            }
            .setCancelable(false)
            .create()

        dialog.show()

        // Generate transaction ID
        val transactionId = UUID.randomUUID().toString()

        // Start Blink QR code request
        lifecycleScope.launch {
            try {
                val terminalId = prefsManager.terminalId.toString()
                val storeId = prefsManager.storeId.toString()

                // Try to get merchant_id from integration config
                val merchantId = withContext(Dispatchers.IO) {
                    val integration = db.integrationDao().getIntegrationByName("blink")
                    if (integration?.json != null) {
                        try {
                            val jsonObj = JSONObject(integration.json)
                            jsonObj.optString("merchant_id", "")
                        } catch (e: Exception) { "" }
                    } else ""
                }

                // Call Vercel Blink API (server-side proxy to Emtel)
                val blinkRequest = mapOf<String, Any?>(
                    "action" to "displayQrCode",
                    "transactionId" to transactionId,
                    "transactionAmt" to grandTotal.toString(),
                    "merchant_id" to merchantId.ifEmpty { null },
                    "store_id" to storeId,
                    "terminal_id" to terminalId
                )

                val response = withContext(Dispatchers.IO) {
                    blinkApiService.getTillQRCode(blinkRequest)
                }

                if (response.isSuccessful && response.body() != null) {
                    val blinkResponse = response.body()!!
                    val blinkTransactionId = blinkResponse.transaction_id ?: transactionId

                    // Show QR code - generate from transaction data
                    val qrContent = "blink://$blinkTransactionId"
                    val qrBitmap = generateQRCode(qrContent, 400)
                    if (qrBitmap != null) {
                        imageQrCode.setImageBitmap(qrBitmap)
                        imageQrCode.visibility = View.VISIBLE
                    }

                    progressLoading.visibility = View.GONE
                    textStatus.text = "Waiting for payment..."
                    textInstruction.visibility = View.VISIBLE

                    // Start polling for transaction status
                    blinkPollingJob = lifecycleScope.launch {
                        pollBlinkStatus(
                            transactionId = blinkTransactionId,
                            terminalId = terminalId,
                            grandTotal = grandTotal,
                            dialog = dialog,
                            textStatus = textStatus,
                            progressLoading = progressLoading
                        )
                    }
                } else {
                    progressLoading.visibility = View.GONE
                    textStatus.text = "Failed to generate QR code. Please try again."
                    textStatus.setTextColor(Color.RED)
                }
            } catch (e: Exception) {
                progressLoading.visibility = View.GONE
                textStatus.text = "Error: ${e.message}"
                textStatus.setTextColor(Color.RED)
            }
        }
    }

    private suspend fun pollBlinkStatus(
        transactionId: String,
        terminalId: String,
        grandTotal: Double,
        dialog: AlertDialog,
        textStatus: TextView,
        progressLoading: ProgressBar
    ) {
        var attempts = 0
        val maxAttempts = 60 // 3 minutes (60 * 3s)

        while (coroutineContext[Job]?.isActive == true && attempts < maxAttempts) {
            delay(3000)
            attempts++

            try {
                val statusRequest = mapOf<String, Any?>(
                    "action" to "getTransactionStatus",
                    "transactionId" to transactionId,
                    "terminal_id" to terminalId
                )
                val response = withContext(Dispatchers.IO) {
                    blinkApiService.getTillTransactionStatus(statusRequest)
                }

                if (response.isSuccessful && response.body() != null) {
                    val statusResponse = response.body()!!
                    val statusCode = statusResponse.data?.transactionStatusCode

                    when (statusCode) {
                        "00" -> {
                            // Success!
                            withContext(Dispatchers.Main) {
                                textStatus.text = "Payment successful!"
                                textStatus.setTextColor(Color.parseColor("#4CAF50"))
                                progressLoading.visibility = View.GONE
                            }

                            delay(1000) // Brief pause so user sees success

                            withContext(Dispatchers.Main) {
                                dialog.dismiss()
                                val paymentRef = statusResponse.data?.payment_ref ?: transactionId
                                val payments = listOf(
                                    PaymentInfo(
                                        tendered = grandTotal,
                                        amount = grandTotal,
                                        change = 0.0,
                                        paymentType = "BLINK",
                                        extraInfo = mapOf(
                                            "transaction_id" to transactionId,
                                            "payment_ref" to paymentRef
                                        )
                                    )
                                )
                                createOrder(payments)
                            }
                            return
                        }
                        else -> {
                            // Still pending
                            withContext(Dispatchers.Main) {
                                textStatus.text = "Waiting for payment... (${attempts * 3}s)"
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Continue polling even on errors
                withContext(Dispatchers.Main) {
                    textStatus.text = "Checking status..."
                }
            }
        }

        // Timeout
        withContext(Dispatchers.Main) {
            textStatus.text = "Payment timed out. Please try again."
            textStatus.setTextColor(Color.RED)
            progressLoading.visibility = View.GONE
        }
    }

    private fun generateQRCode(content: String, size: Int): Bitmap? {
        return try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
            for (x in 0 until size) {
                for (y in 0 until size) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            bitmap
        } catch (e: Exception) {
            null
        }
    }

    // ==================== MIXED PAYMENT ====================

    private fun showMixedPaymentDialog(grandTotal: Double) {
        val currency = sessionManager.account?.currency ?: ""
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_mixed_payment, null)

        val textAmountDue = dialogView.findViewById<TextView>(R.id.text_amount_due)
        val editCashAmount = dialogView.findViewById<EditText>(R.id.edit_cash_amount)
        val editCardAmount = dialogView.findViewById<EditText>(R.id.edit_card_amount)
        val textRemaining = dialogView.findViewById<TextView>(R.id.text_remaining)

        textAmountDue.text = "$currency ${NumberUtils.formatPrice(grandTotal)}"

        val updateRemaining = {
            val cash = NumberUtils.parseDouble(editCashAmount.text.toString())
            val card = NumberUtils.parseDouble(editCardAmount.text.toString())
            val remaining = grandTotal - cash - card
            if (remaining > 0) {
                textRemaining.text = "Remaining: $currency ${NumberUtils.formatPrice(remaining)}"
                textRemaining.setTextColor(resources.getColor(android.R.color.holo_red_light, null))
                textRemaining.visibility = View.VISIBLE
            } else if (remaining < 0) {
                textRemaining.text = "Change: $currency ${NumberUtils.formatPrice(-remaining)}"
                textRemaining.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                textRemaining.visibility = View.VISIBLE
            } else {
                textRemaining.visibility = View.GONE
            }
        }

        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) { updateRemaining() }
        }
        editCashAmount.addTextChangedListener(watcher)
        editCardAmount.addTextChangedListener(watcher)

        AlertDialog.Builder(this)
            .setTitle("Split / Mix Payment")
            .setView(dialogView)
            .setPositiveButton("Confirm") { _, _ ->
                val cashAmt = NumberUtils.parseDouble(editCashAmount.text.toString())
                val cardAmt = NumberUtils.parseDouble(editCardAmount.text.toString())
                if (cashAmt + cardAmt < grandTotal) {
                    Toast.makeText(this, "Total payment is insufficient", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val payments = mutableListOf<PaymentInfo>()
                val change = (cashAmt + cardAmt) - grandTotal
                if (cashAmt > 0) {
                    payments.add(
                        PaymentInfo(
                            tendered = cashAmt,
                            amount = cashAmt,
                            change = change,
                            paymentType = "CASH"
                        )
                    )
                }
                if (cardAmt > 0) {
                    payments.add(
                        PaymentInfo(
                            tendered = cardAmt,
                            amount = cardAmt,
                            change = 0.0,
                            paymentType = "CARD"
                        )
                    )
                }
                createOrder(payments)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== FOREX CASH PAYMENT ====================

    private fun showForexPaymentDialog(grandTotal: Double) {
        val baseCurrency = sessionManager.account?.currency ?: ""

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 0)
        }

        // Amount due in base currency
        layout.addView(TextView(this).apply {
            text = "Amount Due: $baseCurrency ${NumberUtils.formatPrice(grandTotal)}"
            textSize = 18f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        })

        // Foreign currency input
        layout.addView(TextView(this).apply { text = "Foreign Currency (e.g. USD, EUR, GBP)"; textSize = 14f })
        val etForexCurrency = EditText(this).apply {
            hint = "USD"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
            filters = arrayOf(android.text.InputFilter.LengthFilter(3))
        }
        layout.addView(etForexCurrency)

        // Exchange rate
        layout.addView(TextView(this).apply {
            text = "Exchange Rate (1 foreign = ? $baseCurrency)"
            textSize = 14f
            setPadding(0, 16, 0, 0)
        })
        val etRate = EditText(this).apply {
            hint = "e.g. 45.50"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        layout.addView(etRate)

        // Amount tendered in foreign currency
        layout.addView(TextView(this).apply {
            text = "Amount Tendered (in foreign currency)"
            textSize = 14f
            setPadding(0, 16, 0, 0)
        })
        val etForexAmount = EditText(this).apply {
            hint = "0.00"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        layout.addView(etForexAmount)

        // Equivalent in base currency (auto-calculated)
        val tvEquivalent = TextView(this).apply {
            textSize = 16f
            setPadding(0, 16, 0, 0)
            setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
        }
        layout.addView(tvEquivalent)

        // Change display
        val tvChange = TextView(this).apply {
            textSize = 16f
            setPadding(0, 8, 0, 0)
        }
        layout.addView(tvChange)

        val updateCalc = {
            val rate = NumberUtils.parseDouble(etRate.text.toString())
            val forexAmt = NumberUtils.parseDouble(etForexAmount.text.toString())
            if (rate > 0 && forexAmt > 0) {
                val equivalent = forexAmt * rate
                val fc = etForexCurrency.text.toString().trim().uppercase().ifEmpty { "FX" }
                tvEquivalent.text = "$fc ${NumberUtils.formatPrice(forexAmt)} = $baseCurrency ${NumberUtils.formatPrice(equivalent)}"
                if (equivalent >= grandTotal) {
                    val change = equivalent - grandTotal
                    tvChange.text = "Change: $baseCurrency ${NumberUtils.formatPrice(change)}"
                    tvChange.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                } else {
                    val short = grandTotal - equivalent
                    tvChange.text = "Short: $baseCurrency ${NumberUtils.formatPrice(short)}"
                    tvChange.setTextColor(resources.getColor(android.R.color.holo_red_light, null))
                }
            } else {
                tvEquivalent.text = ""
                tvChange.text = ""
            }
        }

        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) { updateCalc() }
        }
        etRate.addTextChangedListener(watcher)
        etForexAmount.addTextChangedListener(watcher)

        AlertDialog.Builder(this)
            .setTitle("Forex Cash Payment")
            .setView(layout)
            .setPositiveButton("Confirm") { _, _ ->
                val forexCurr = etForexCurrency.text.toString().trim().uppercase()
                val rate = NumberUtils.parseDouble(etRate.text.toString())
                val forexAmt = NumberUtils.parseDouble(etForexAmount.text.toString())

                if (forexCurr.isEmpty()) {
                    Toast.makeText(this, "Please enter the foreign currency code", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (rate <= 0) {
                    Toast.makeText(this, "Please enter a valid exchange rate", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (forexAmt <= 0) {
                    Toast.makeText(this, "Please enter the amount tendered", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                val equivalent = forexAmt * rate
                if (equivalent < grandTotal) {
                    Toast.makeText(this, "Insufficient amount", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                val change = equivalent - grandTotal
                val payments = listOf(
                    PaymentInfo(
                        tendered = equivalent,
                        amount = grandTotal,
                        change = change,
                        paymentType = "FOREX",
                        forexCurrency = forexCurr,
                        forexAmount = forexAmt,
                        forexRate = rate
                    )
                )
                createOrder(payments)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== ORDER CREATION ====================

    private fun createOrder(payments: List<PaymentInfo>) {
        val account = sessionManager.account
        val store = sessionManager.store
        val terminal = sessionManager.terminal
        val till = sessionManager.till
        val user = sessionManager.user
        val customer = sessionManager.getCustomerOrDefault()

        if (account == null || store == null || terminal == null || till == null || user == null) {
            Toast.makeText(this, "Session error. Please re-login.", Toast.LENGTH_LONG).show()
            return
        }

        val uuid = UUID.randomUUID().toString()

        lifecycleScope.launch {
            try {
                val order = withContext(Dispatchers.IO) {
                    orderService.createOrder(
                        uuid = uuid,
                        cart = shoppingCartViewModel.shoppingCart,
                        customer = customer,
                        user = user,
                        account = account,
                        store = store,
                        terminal = terminal,
                        till = till,
                        payments = payments
                    )
                }

                // Print receipt — if order came from kitchen, only print customer receipt
                // (kitchen already has the order, don't reprint)
                val orderJson = order.json?.toString()
                val orderDetails = orderJson?.let {
                    com.posterita.pos.android.domain.model.OrderDetails.fromJson(it)
                }
                if (orderDetails != null) {
                    withContext(Dispatchers.IO) {
                        if (isFromKitchen) {
                            printerManager.printReceiptOnly(orderDetails)
                        } else {
                            printerManager.printAllReceipts(orderDetails)
                        }
                    }
                }

                // Trigger immediate cloud sync (fire-and-forget)
                com.posterita.pos.android.worker.CloudSyncWorker.syncNow(this@CartActivity)

                // Award loyalty points (fire-and-forget, queues offline)
                if (order.orderType != "REFUND") {
                    awardLoyaltyPoints(uuid, order.grandTotal)
                }

                // Clear cart
                shoppingCartViewModel.clearCart()

                // Navigate to receipt
                val intent = Intent(this@CartActivity, ReceiptActivity::class.java)
                intent.putExtra("ORDER_UUID", uuid)
                intent.putExtra("CHANGE_DUE", payments.sumOf { it.change })
                intent.putExtra("TIPS_AMOUNT", shoppingCartViewModel.shoppingCart.tipsAmount)
                intent.putExtra(ReceiptActivity.EXTRA_FROM_CHECKOUT, true)
                startActivity(intent)
                finish()
            } catch (e: Exception) {
                Toast.makeText(
                    this@CartActivity,
                    "Failed to create order: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    // ==================== CART ITEM EDIT DIALOG (DISCOUNT PANEL) ====================

    private fun showEditCartItemDialog(cartItem: CartItem) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.edit_cart_line_dialog_layout, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        // Product name
        val txtProductName = dialogView.findViewById<TextView>(R.id.text_view_product_name)
        txtProductName.text = cartItem.product.name ?: ""

        // Views
        val tabGeneral = dialogView.findViewById<View>(R.id.tab_general)
        val tabModifier = dialogView.findViewById<View>(R.id.tab_modifier)
        val txtGeneralTab = dialogView.findViewById<TextView>(R.id.txt_add)
        val txtModifierTab = dialogView.findViewById<TextView>(R.id.txt_remove)
        val layoutGeneral = dialogView.findViewById<ScrollView>(R.id.layout_general)
        val layoutModifiers = dialogView.findViewById<View>(R.id.layout_modifiers)

        // General fields
        val editPrice = dialogView.findViewById<TextInputEditText>(R.id.edit_text_unit_product_price)
        val editDiscount = dialogView.findViewById<TextInputEditText>(R.id.edit_text_discount)
        val editQty = dialogView.findViewById<TextInputEditText>(R.id.edit_text_qty)
        val editLineTotal = dialogView.findViewById<TextInputEditText>(R.id.edit_text_line_total)
        val editNote = dialogView.findViewById<TextInputEditText>(R.id.edit_text_note)
        val spinnerDiscountCode = dialogView.findViewById<MaterialAutoCompleteTextView>(R.id.spinner_discount_code)
        val btnWsPrice = dialogView.findViewById<View>(R.id.button_ws_price)
        val btnDecrementQty = dialogView.findViewById<View>(R.id.button_decrement_qty)
        val btnIncrementQty = dialogView.findViewById<View>(R.id.button_increment_qty)
        val btnCancel = dialogView.findViewById<View>(R.id.button_cancel)
        val btnApply = dialogView.findViewById<View>(R.id.button_apply_changes)

        // Pre-fill values
        editPrice.setText(NumberUtils.formatPrice(cartItem.priceEntered))
        editDiscount.setText(NumberUtils.formatQuantity(cartItem.originalDiscountPercentage))
        editQty.setText(NumberUtils.formatQuantity(cartItem.qty))
        editLineTotal.setText(NumberUtils.formatPrice(cartItem.lineNetAmt))
        editNote.setText(cartItem.note ?: "")

        // Track selected discount code
        var selectedDiscountCodeId = cartItem.discountCodeId
        var isWholesaleApplied = cartItem.isWholeSalePriceApplied

        // Load discount codes
        lifecycleScope.launch(Dispatchers.IO) {
            val discountCodes = db.discountCodeDao().getAllDiscountCodes()
            withContext(Dispatchers.Main) {
                val names = mutableListOf("None")
                names.addAll(discountCodes.map { "${it.name ?: ""} (${NumberUtils.formatQuantity(it.percentage)}%)" })
                val adapter = ArrayAdapter(this@CartActivity, android.R.layout.simple_dropdown_item_1line, names)
                spinnerDiscountCode.setAdapter(adapter)

                // Pre-select current discount code
                val currentIndex = discountCodes.indexOfFirst { it.discountcode_id == selectedDiscountCodeId }
                if (currentIndex >= 0) {
                    spinnerDiscountCode.setText(names[currentIndex + 1], false)
                }

                spinnerDiscountCode.setOnItemClickListener { _, _, position, _ ->
                    if (position == 0) {
                        // None
                        selectedDiscountCodeId = 0
                        editDiscount.setText("0")
                    } else {
                        val code = discountCodes[position - 1]
                        selectedDiscountCodeId = code.discountcode_id
                        if (code.percentage > 0) {
                            editDiscount.setText(NumberUtils.formatQuantity(code.percentage))
                        }
                    }
                    recalculateLineTotal(editPrice, editQty, editDiscount, editLineTotal, cartItem)
                }
            }
        }

        // Recalculate line total on field change
        val recalcWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                recalculateLineTotal(editPrice, editQty, editDiscount, editLineTotal, cartItem)
            }
        }
        editPrice.addTextChangedListener(recalcWatcher)
        editQty.addTextChangedListener(recalcWatcher)
        editDiscount.addTextChangedListener(recalcWatcher)

        // Qty +/- buttons
        btnDecrementQty.setOnClickListener {
            val currentQty = NumberUtils.parseDouble(editQty.text.toString())
            if (currentQty > 1) {
                editQty.setText(NumberUtils.formatQuantity(currentQty - 1))
            }
        }
        btnIncrementQty.setOnClickListener {
            val currentQty = NumberUtils.parseDouble(editQty.text.toString())
            editQty.setText(NumberUtils.formatQuantity(currentQty + 1))
        }

        // W/S Price button
        val product = cartItem.product
        if (product.iswholesaleprice == "Y" && product.wholesaleprice > 0) {
            btnWsPrice.visibility = View.VISIBLE
            btnWsPrice.setOnClickListener {
                isWholesaleApplied = !isWholesaleApplied
                if (isWholesaleApplied) {
                    editPrice.setText(NumberUtils.formatPrice(product.wholesaleprice))
                    Toast.makeText(this, "Wholesale price applied", Toast.LENGTH_SHORT).show()
                } else {
                    editPrice.setText(NumberUtils.formatPrice(product.sellingprice))
                    Toast.makeText(this, "Regular price restored", Toast.LENGTH_SHORT).show()
                }
            }
        } else {
            btnWsPrice.visibility = View.GONE
        }

        // Cancel button
        btnCancel.setOnClickListener { dialog.dismiss() }

        // Apply button
        btnApply.setOnClickListener {
            val newPrice = NumberUtils.parseDouble(editPrice.text.toString())
            val newQty = NumberUtils.parseDouble(editQty.text.toString())
            val newDiscount = NumberUtils.parseDouble(editDiscount.text.toString())
            val newNote = editNote.text.toString().trim()

            if (newQty <= 0) {
                Toast.makeText(this, "Quantity must be greater than zero", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val updatedItem = cartItem.copy(
                priceEntered = newPrice,
                qty = newQty,
                originalDiscountPercentage = newDiscount,
                note = newNote.ifEmpty { null },
                discountCodeId = selectedDiscountCodeId,
                isWholeSalePriceApplied = isWholesaleApplied
            )
            shoppingCartViewModel.addOrUpdateLine(updatedItem)
            dialog.dismiss()
        }

        // ======= MODIFIER TAB =======
        val modifiersList = mutableListOf<Modifier>()
        val selectedModifiers = mutableSetOf<Int>()

        // Parse existing modifiers — will be matched to IDs after modifiers load
        val existingModifierNames = cartItem.modifiers?.split(", ")?.map { it.trim() } ?: emptyList()

        tabGeneral.setOnClickListener {
            layoutGeneral.visibility = View.VISIBLE
            layoutModifiers.visibility = View.GONE
            tabGeneral.setBackgroundResource(R.color.txt_color)
            txtGeneralTab.setTextColor(resources.getColor(R.color.white, null))
            tabModifier.setBackgroundColor(Color.TRANSPARENT)
            txtModifierTab.setTextColor(resources.getColor(R.color.black, null))
        }

        tabModifier.setOnClickListener {
            layoutGeneral.visibility = View.GONE
            layoutModifiers.visibility = View.VISIBLE
            tabModifier.setBackgroundResource(R.color.txt_color)
            txtModifierTab.setTextColor(resources.getColor(R.color.white, null))
            tabGeneral.setBackgroundColor(Color.TRANSPARENT)
            txtGeneralTab.setTextColor(resources.getColor(R.color.black, null))
        }

        // Load modifiers
        val recyclerModifiers = dialogView.findViewById<RecyclerView>(R.id.recycler_view_modifiers)
        val textNoModifiers = dialogView.findViewById<TextView>(R.id.text_no_modifiers)
        val btnModCancel = dialogView.findViewById<View>(R.id.button_modifier_cancel)
        val btnModApply = dialogView.findViewById<View>(R.id.button_modifier_apply)

        recyclerModifiers.layoutManager = LinearLayoutManager(this)

        lifecycleScope.launch(Dispatchers.IO) {
            // First try product-specific modifiers, then fall back to category-based
            var mods = db.modifierDao().getModifiersByProductId(product.product_id)
            if (mods.isEmpty() && product.productcategory_id > 0) {
                mods = db.modifierDao().getModifiersByCategoryId(product.productcategory_id)
            }
            withContext(Dispatchers.Main) {
                modifiersList.clear()
                modifiersList.addAll(mods)
                if (mods.isEmpty()) {
                    textNoModifiers.visibility = View.VISIBLE
                    recyclerModifiers.visibility = View.GONE
                } else {
                    textNoModifiers.visibility = View.GONE
                    recyclerModifiers.visibility = View.VISIBLE

                    // Pre-select modifiers that were previously applied
                    existingModifierNames.forEach { modName ->
                        val mod = modifiersList.find { it.name == modName }
                        if (mod != null) selectedModifiers.add(mod.modifier_id)
                    }

                    recyclerModifiers.adapter = object : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
                        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): RecyclerView.ViewHolder {
                            val v = LayoutInflater.from(parent.context).inflate(R.layout.item_modifier, parent, false)
                            return object : RecyclerView.ViewHolder(v) {}
                        }
                        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
                            val mod = modifiersList[position]
                            val cb = holder.itemView.findViewById<CheckBox>(R.id.checkbox_modifier)
                            val name = holder.itemView.findViewById<TextView>(R.id.text_modifier_name)
                            val price = holder.itemView.findViewById<TextView>(R.id.text_modifier_price)

                            name.text = mod.name ?: ""
                            price.text = if (mod.sellingprice > 0) "+${NumberUtils.formatPrice(mod.sellingprice)}" else ""
                            cb.isChecked = selectedModifiers.contains(mod.modifier_id)

                            cb.setOnCheckedChangeListener { _, isChecked ->
                                if (isChecked) selectedModifiers.add(mod.modifier_id)
                                else selectedModifiers.remove(mod.modifier_id)
                            }
                            holder.itemView.setOnClickListener { cb.isChecked = !cb.isChecked }
                        }
                        override fun getItemCount() = modifiersList.size
                    }
                }
            }
        }

        btnModCancel?.setOnClickListener { dialog.dismiss() }
        btnModApply?.setOnClickListener {
            // Build modifiers string
            val modNames = modifiersList.filter { selectedModifiers.contains(it.modifier_id) }
                .mapNotNull { it.name }
            val modString = modNames.joinToString(", ").ifEmpty { null }

            // Calculate extra price from modifiers
            val modExtraPrice = modifiersList.filter { selectedModifiers.contains(it.modifier_id) }
                .sumOf { it.sellingprice }

            val updatedItem = cartItem.copy(
                modifiers = modString,
                priceEntered = cartItem.product.sellingprice + modExtraPrice
            )
            shoppingCartViewModel.addOrUpdateLine(updatedItem)
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun recalculateLineTotal(
        editPrice: TextInputEditText,
        editQty: TextInputEditText,
        editDiscount: TextInputEditText,
        editLineTotal: TextInputEditText,
        cartItem: CartItem
    ) {
        val price = NumberUtils.parseDouble(editPrice.text.toString())
        val qty = NumberUtils.parseDouble(editQty.text.toString())
        val discount = NumberUtils.parseDouble(editDiscount.text.toString())

        var lineAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(qty * price))
        if (discount > 0) {
            val discAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt * discount / 100.0))
            lineAmt -= discAmt
        }

        // Apply tax
        val taxRate = cartItem.tax?.rate ?: 0.0
        val fixedTax = cartItem.product.taxamount
        val isTaxIncluded = cartItem.product.istaxincluded == "Y"

        val lineNetAmt = if (fixedTax > 0) {
            if (isTaxIncluded) lineAmt
            else NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt + fixedTax * qty))
        } else if (!isTaxIncluded) {
            NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt + lineAmt * taxRate / 100.0))
        } else {
            lineAmt
        }

        editLineTotal.setText(NumberUtils.formatPrice(lineNetAmt))
    }

    private fun showAddNoteDialog() {
        val editText = EditText(this).apply {
            hint = "Enter order note"
            setText(shoppingCartViewModel.shoppingCart.note ?: "")
            setSingleLine(false)
            minLines = 2
            maxLines = 5
        }

        AlertDialog.Builder(this)
            .setTitle("Order Note")
            .setView(editText)
            .setPositiveButton("OK") { _, _ ->
                val note = editText.text.toString().trim()
                shoppingCartViewModel.setNote(note.ifEmpty { null })
            }
            .setNegativeButton("Cancel", null)
            .setNeutralButton("Clear") { _, _ ->
                shoppingCartViewModel.setNote(null)
            }
            .show()
    }

    // ==================== DISCOUNT ON TOTAL ====================

    private fun showDiscountOnTotalDialog() {
        val cart = shoppingCartViewModel.shoppingCart
        val grandTotal = shoppingCartViewModel.grandTotalAmount.value ?: 0.0

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_discount, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val editPercentage = dialogView.findViewById<EditText>(R.id.edit_percentage)
        val editAmount = dialogView.findViewById<EditText>(R.id.edit_amount)

        // Pre-fill current values
        if (cart.discountOnTotalPercentage > 0) {
            editPercentage.setText(NumberUtils.formatQuantity(cart.discountOnTotalPercentage))
        }
        if (cart.discountOnTotalAmount > 0) {
            editAmount.setText(NumberUtils.formatPrice(cart.discountOnTotalAmount))
        }

        // Track which field is active for numpad input (default: percentage)
        var activeField: EditText = editPercentage
        editPercentage.showSoftInputOnFocus = false
        editAmount.showSoftInputOnFocus = false

        val highlightActive = {
            editPercentage.setBackgroundResource(
                if (activeField == editPercentage) R.drawable.chip_selected_bg else R.drawable.btn_outline_rounded
            )
            editAmount.setBackgroundResource(
                if (activeField == editAmount) R.drawable.chip_selected_bg else R.drawable.btn_outline_rounded
            )
        }
        editPercentage.setOnClickListener {
            activeField = editPercentage
            highlightActive()
        }
        editAmount.setOnClickListener {
            activeField = editAmount
            highlightActive()
        }
        highlightActive()

        // Numpad input
        val numpadAppend = fun(digit: String) {
            val text = activeField.text.toString()
            if (digit == "." && text.contains(".")) return
            val dotIndex = text.indexOf(".")
            if (dotIndex >= 0 && text.length - dotIndex > 2) return
            activeField.setText(text + digit)
            activeField.setSelection(activeField.text.length)
        }
        dialogView.findViewById<View>(R.id.num_0).setOnClickListener { numpadAppend("0") }
        dialogView.findViewById<View>(R.id.num_1).setOnClickListener { numpadAppend("1") }
        dialogView.findViewById<View>(R.id.num_2).setOnClickListener { numpadAppend("2") }
        dialogView.findViewById<View>(R.id.num_3).setOnClickListener { numpadAppend("3") }
        dialogView.findViewById<View>(R.id.num_4).setOnClickListener { numpadAppend("4") }
        dialogView.findViewById<View>(R.id.num_5).setOnClickListener { numpadAppend("5") }
        dialogView.findViewById<View>(R.id.num_6).setOnClickListener { numpadAppend("6") }
        dialogView.findViewById<View>(R.id.num_7).setOnClickListener { numpadAppend("7") }
        dialogView.findViewById<View>(R.id.num_8).setOnClickListener { numpadAppend("8") }
        dialogView.findViewById<View>(R.id.num_9).setOnClickListener { numpadAppend("9") }
        dialogView.findViewById<View>(R.id.num_dot).setOnClickListener { numpadAppend(".") }
        dialogView.findViewById<View>(R.id.num_backspace).setOnClickListener {
            val text = activeField.text.toString()
            if (text.isNotEmpty()) {
                activeField.setText(text.dropLast(1))
                activeField.setSelection(activeField.text.length)
            }
        }
        dialogView.findViewById<View>(R.id.num_backspace).setOnLongClickListener {
            activeField.setText("")
            true
        }

        // Preset button click handler
        val presetClick = { pct: Double ->
            editPercentage.setText(NumberUtils.formatQuantity(pct))
            editAmount.setText("")
            activeField = editPercentage
            highlightActive()
        }
        dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { presetClick(5.0) }
        dialogView.findViewById<View>(R.id.btn_10).setOnClickListener { presetClick(10.0) }
        dialogView.findViewById<View>(R.id.btn_15).setOnClickListener { presetClick(15.0) }
        dialogView.findViewById<View>(R.id.btn_20).setOnClickListener { presetClick(20.0) }
        dialogView.findViewById<View>(R.id.btn_25).setOnClickListener { presetClick(25.0) }
        dialogView.findViewById<View>(R.id.btn_50).setOnClickListener { presetClick(50.0) }

        dialogView.findViewById<View>(R.id.button_remove).setOnClickListener {
            shoppingCartViewModel.setDiscountOnTotal(0.0, 0.0)
            Toast.makeText(this, "Discount removed", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }
        dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener { dialog.dismiss() }
        dialogView.findViewById<View>(R.id.button_apply).setOnClickListener {
            val pct = NumberUtils.parseDouble(editPercentage.text.toString())
            val amt = NumberUtils.parseDouble(editAmount.text.toString())
            shoppingCartViewModel.setDiscountOnTotal(amt, pct)
            Toast.makeText(this, "Discount applied", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        dialog.show()
    }

    // ==================== HOLD ORDER ====================

    private fun holdOrder() {
        if (shoppingCartViewModel.shoppingCart.isEmpty()) {
            Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
            return
        }

        val editText = EditText(this).apply {
            hint = "Description (optional)"
        }

        AlertDialog.Builder(this)
            .setTitle("Hold Order")
            .setMessage("Save the current cart as a held order?")
            .setView(editText)
            .setPositiveButton("Hold") { _, _ ->
                val description = editText.text.toString().trim().ifEmpty { "Held Order" }
                saveHoldOrder(description)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveHoldOrder(description: String) {
        val cart = shoppingCartViewModel.shoppingCart
        val terminalId = prefsManager.terminalId
        val storeId = prefsManager.storeId
        val tillId = sessionManager.till?.tillId ?: 0

        val holdJson = cart.toJson()

        val holdOrder = HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = holdJson,
            description = description,
            tillId = tillId,
            terminalId = terminalId,
            storeId = storeId
        )

        lifecycleScope.launch(Dispatchers.IO) {
            db.holdOrderDao().insertHoldOrder(holdOrder)
            withContext(Dispatchers.Main) {
                shoppingCartViewModel.clearCart()
                Toast.makeText(this@CartActivity, "Order held successfully", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    // ==================== TIPS ====================

    private fun showTipsDialog() {
        val grandTotal = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
        val currency = sessionManager.account?.currency ?: ""
        val cart = shoppingCartViewModel.shoppingCart

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_tips, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val txtTipAmount = dialogView.findViewById<TextView>(R.id.txt_tip_amount)
        val editCustom = dialogView.findViewById<EditText>(R.id.edit_custom_amount)

        if (cart.tipsAmount > 0) {
            editCustom.setText(NumberUtils.formatPrice(cart.tipsAmount))
            txtTipAmount.text = "$currency ${NumberUtils.formatPrice(cart.tipsAmount)}"
        }

        var selectedPct = 0.0
        var selectedAmt = cart.tipsAmount

        val updateDisplay = { amt: Double ->
            txtTipAmount.text = "$currency ${NumberUtils.formatPrice(amt)}"
        }

        editCustom.showSoftInputOnFocus = false

        // Numpad input for custom amount
        val numpadAppend = fun(digit: String) {
            val text = editCustom.text.toString()
            if (digit == "." && text.contains(".")) return
            val dotIndex = text.indexOf(".")
            if (dotIndex >= 0 && text.length - dotIndex > 2) return
            editCustom.setText(text + digit)
            editCustom.setSelection(editCustom.text.length)
            selectedPct = 0.0
        }
        dialogView.findViewById<View>(R.id.num_0).setOnClickListener { numpadAppend("0") }
        dialogView.findViewById<View>(R.id.num_1).setOnClickListener { numpadAppend("1") }
        dialogView.findViewById<View>(R.id.num_2).setOnClickListener { numpadAppend("2") }
        dialogView.findViewById<View>(R.id.num_3).setOnClickListener { numpadAppend("3") }
        dialogView.findViewById<View>(R.id.num_4).setOnClickListener { numpadAppend("4") }
        dialogView.findViewById<View>(R.id.num_5).setOnClickListener { numpadAppend("5") }
        dialogView.findViewById<View>(R.id.num_6).setOnClickListener { numpadAppend("6") }
        dialogView.findViewById<View>(R.id.num_7).setOnClickListener { numpadAppend("7") }
        dialogView.findViewById<View>(R.id.num_8).setOnClickListener { numpadAppend("8") }
        dialogView.findViewById<View>(R.id.num_9).setOnClickListener { numpadAppend("9") }
        dialogView.findViewById<View>(R.id.num_dot).setOnClickListener { numpadAppend(".") }
        dialogView.findViewById<View>(R.id.num_backspace).setOnClickListener {
            val text = editCustom.text.toString()
            if (text.isNotEmpty()) {
                editCustom.setText(text.dropLast(1))
                editCustom.setSelection(editCustom.text.length)
            }
        }
        dialogView.findViewById<View>(R.id.num_backspace).setOnLongClickListener {
            editCustom.setText("")
            true
        }

        val presetClick = { pct: Double ->
            selectedPct = pct
            selectedAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(grandTotal * pct / 100.0))
            updateDisplay(selectedAmt)
            editCustom.setText("")
        }
        dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { presetClick(5.0) }
        dialogView.findViewById<View>(R.id.btn_10).setOnClickListener { presetClick(10.0) }
        dialogView.findViewById<View>(R.id.btn_15).setOnClickListener { presetClick(15.0) }
        dialogView.findViewById<View>(R.id.btn_20).setOnClickListener { presetClick(20.0) }

        dialogView.findViewById<View>(R.id.button_remove).setOnClickListener {
            shoppingCartViewModel.setTips(0.0, 0.0)
            Toast.makeText(this, "Tips removed", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }
        dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener { dialog.dismiss() }
        dialogView.findViewById<View>(R.id.button_apply).setOnClickListener {
            val customAmt = NumberUtils.parseDouble(editCustom.text.toString())
            val finalAmt = if (customAmt > 0) customAmt else selectedAmt
            val finalPct = if (customAmt > 0 && grandTotal > 0) {
                NumberUtils.parseDouble(NumberUtils.formatPrice(customAmt / grandTotal * 100.0))
            } else {
                selectedPct
            }
            shoppingCartViewModel.setTips(finalAmt, finalPct)
            Toast.makeText(this, "Tips: $currency ${NumberUtils.formatPrice(finalAmt)}", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        dialog.show()
    }

    // ==================== COUPON ====================

    private fun showCouponDialog() {
        val editText = EditText(this).apply {
            hint = "Enter coupon code"
        }

        AlertDialog.Builder(this)
            .setTitle("Apply Coupon")
            .setView(editText)
            .setPositiveButton("Apply") { _, _ ->
                val coupon = editText.text.toString().trim()
                if (coupon.isEmpty()) {
                    Toast.makeText(this, "Please enter a coupon code", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                Toast.makeText(this, "Coupon applied: $coupon", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== OBSERVE VIEWMODEL ====================

    private fun showProductDetailDialog(product: com.posterita.pos.android.data.local.entity.Product) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_product_detail, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val imageProduct = dialogView.findViewById<ImageView>(R.id.image_product)
        val txtName = dialogView.findViewById<TextView>(R.id.txt_product_name)
        val txtPrice = dialogView.findViewById<TextView>(R.id.txt_product_price)
        val txtDescription = dialogView.findViewById<TextView>(R.id.txt_product_description)
        val txtUpc = dialogView.findViewById<TextView>(R.id.txt_product_upc)
        val txtCategory = dialogView.findViewById<TextView>(R.id.txt_product_category)
        val btnClose = dialogView.findViewById<View>(R.id.button_close)

        com.bumptech.glide.Glide.with(this)
            .load(product.image)
            .placeholder(R.drawable.ic_splash)
            .error(R.drawable.ic_splash)
            .into(imageProduct)

        val currency = sessionManager.account?.currency ?: ""
        txtName.text = product.name ?: ""
        txtPrice.text = "$currency ${NumberUtils.formatPrice(product.sellingprice)}"

        if (!product.description.isNullOrBlank()) {
            txtDescription.text = product.description
            txtDescription.visibility = View.VISIBLE
        }

        if (!product.upc.isNullOrBlank()) {
            txtUpc.text = "UPC: ${product.upc}"
            txtUpc.visibility = View.VISIBLE
        }

        if (!product.itemcode.isNullOrBlank()) {
            txtCategory.text = "Code: ${product.itemcode}"
            txtCategory.visibility = View.VISIBLE
        }

        btnClose.setOnClickListener { dialog.dismiss() }

        dialog.show()
    }

    // ── World countries: code, name, mobile digit length ──
    data class CountryInfo(val code: String, val name: String, val mobileLength: Int)

    private val allCountries = listOf(
        CountryInfo("+93", "Afghanistan", 9), CountryInfo("+355", "Albania", 9),
        CountryInfo("+213", "Algeria", 9), CountryInfo("+376", "Andorra", 6),
        CountryInfo("+244", "Angola", 9), CountryInfo("+1268", "Antigua & Barbuda", 7),
        CountryInfo("+54", "Argentina", 10), CountryInfo("+374", "Armenia", 8),
        CountryInfo("+61", "Australia", 9), CountryInfo("+43", "Austria", 10),
        CountryInfo("+994", "Azerbaijan", 9), CountryInfo("+1242", "Bahamas", 7),
        CountryInfo("+973", "Bahrain", 8), CountryInfo("+880", "Bangladesh", 10),
        CountryInfo("+1246", "Barbados", 7), CountryInfo("+375", "Belarus", 9),
        CountryInfo("+32", "Belgium", 9), CountryInfo("+501", "Belize", 7),
        CountryInfo("+229", "Benin", 8), CountryInfo("+975", "Bhutan", 8),
        CountryInfo("+591", "Bolivia", 8), CountryInfo("+387", "Bosnia & Herzegovina", 8),
        CountryInfo("+267", "Botswana", 8), CountryInfo("+55", "Brazil", 11),
        CountryInfo("+673", "Brunei", 7), CountryInfo("+359", "Bulgaria", 9),
        CountryInfo("+226", "Burkina Faso", 8), CountryInfo("+257", "Burundi", 8),
        CountryInfo("+855", "Cambodia", 9), CountryInfo("+237", "Cameroon", 9),
        CountryInfo("+1", "Canada", 10), CountryInfo("+238", "Cape Verde", 7),
        CountryInfo("+236", "Central African Republic", 8), CountryInfo("+235", "Chad", 8),
        CountryInfo("+56", "Chile", 9), CountryInfo("+86", "China", 11),
        CountryInfo("+57", "Colombia", 10), CountryInfo("+269", "Comoros", 7),
        CountryInfo("+242", "Congo", 9), CountryInfo("+243", "Congo (DRC)", 9),
        CountryInfo("+506", "Costa Rica", 8), CountryInfo("+225", "Cote d'Ivoire", 10),
        CountryInfo("+385", "Croatia", 9), CountryInfo("+53", "Cuba", 8),
        CountryInfo("+357", "Cyprus", 8), CountryInfo("+420", "Czech Republic", 9),
        CountryInfo("+45", "Denmark", 8), CountryInfo("+253", "Djibouti", 8),
        CountryInfo("+1767", "Dominica", 7), CountryInfo("+1809", "Dominican Republic", 10),
        CountryInfo("+593", "Ecuador", 9), CountryInfo("+20", "Egypt", 10),
        CountryInfo("+503", "El Salvador", 8), CountryInfo("+240", "Equatorial Guinea", 9),
        CountryInfo("+291", "Eritrea", 7), CountryInfo("+372", "Estonia", 8),
        CountryInfo("+268", "Eswatini", 8), CountryInfo("+251", "Ethiopia", 9),
        CountryInfo("+679", "Fiji", 7), CountryInfo("+358", "Finland", 10),
        CountryInfo("+33", "France", 9), CountryInfo("+241", "Gabon", 8),
        CountryInfo("+220", "Gambia", 7), CountryInfo("+995", "Georgia", 9),
        CountryInfo("+49", "Germany", 11), CountryInfo("+233", "Ghana", 9),
        CountryInfo("+30", "Greece", 10), CountryInfo("+1473", "Grenada", 7),
        CountryInfo("+502", "Guatemala", 8), CountryInfo("+224", "Guinea", 9),
        CountryInfo("+245", "Guinea-Bissau", 7), CountryInfo("+592", "Guyana", 7),
        CountryInfo("+509", "Haiti", 8), CountryInfo("+504", "Honduras", 8),
        CountryInfo("+852", "Hong Kong", 8), CountryInfo("+36", "Hungary", 9),
        CountryInfo("+354", "Iceland", 7), CountryInfo("+91", "India", 10),
        CountryInfo("+62", "Indonesia", 12), CountryInfo("+98", "Iran", 10),
        CountryInfo("+964", "Iraq", 10), CountryInfo("+353", "Ireland", 9),
        CountryInfo("+972", "Israel", 9), CountryInfo("+39", "Italy", 10),
        CountryInfo("+1876", "Jamaica", 7), CountryInfo("+81", "Japan", 10),
        CountryInfo("+962", "Jordan", 9), CountryInfo("+7", "Kazakhstan", 10),
        CountryInfo("+254", "Kenya", 9), CountryInfo("+686", "Kiribati", 8),
        CountryInfo("+965", "Kuwait", 8), CountryInfo("+996", "Kyrgyzstan", 9),
        CountryInfo("+856", "Laos", 10), CountryInfo("+371", "Latvia", 8),
        CountryInfo("+961", "Lebanon", 8), CountryInfo("+266", "Lesotho", 8),
        CountryInfo("+231", "Liberia", 9), CountryInfo("+218", "Libya", 10),
        CountryInfo("+423", "Liechtenstein", 7), CountryInfo("+370", "Lithuania", 8),
        CountryInfo("+352", "Luxembourg", 9), CountryInfo("+853", "Macau", 8),
        CountryInfo("+261", "Madagascar", 9), CountryInfo("+265", "Malawi", 9),
        CountryInfo("+60", "Malaysia", 10), CountryInfo("+960", "Maldives", 7),
        CountryInfo("+223", "Mali", 8), CountryInfo("+356", "Malta", 8),
        CountryInfo("+692", "Marshall Islands", 7), CountryInfo("+222", "Mauritania", 8),
        CountryInfo("+230", "Mauritius", 8), CountryInfo("+52", "Mexico", 10),
        CountryInfo("+691", "Micronesia", 7), CountryInfo("+373", "Moldova", 8),
        CountryInfo("+377", "Monaco", 8), CountryInfo("+976", "Mongolia", 8),
        CountryInfo("+382", "Montenegro", 8), CountryInfo("+212", "Morocco", 9),
        CountryInfo("+258", "Mozambique", 9), CountryInfo("+95", "Myanmar", 10),
        CountryInfo("+264", "Namibia", 9), CountryInfo("+674", "Nauru", 7),
        CountryInfo("+977", "Nepal", 10), CountryInfo("+31", "Netherlands", 9),
        CountryInfo("+64", "New Zealand", 9), CountryInfo("+505", "Nicaragua", 8),
        CountryInfo("+227", "Niger", 8), CountryInfo("+234", "Nigeria", 10),
        CountryInfo("+389", "North Macedonia", 8), CountryInfo("+47", "Norway", 8),
        CountryInfo("+968", "Oman", 8), CountryInfo("+92", "Pakistan", 10),
        CountryInfo("+680", "Palau", 7), CountryInfo("+970", "Palestine", 9),
        CountryInfo("+507", "Panama", 8), CountryInfo("+675", "Papua New Guinea", 8),
        CountryInfo("+595", "Paraguay", 9), CountryInfo("+51", "Peru", 9),
        CountryInfo("+63", "Philippines", 10), CountryInfo("+48", "Poland", 9),
        CountryInfo("+351", "Portugal", 9), CountryInfo("+974", "Qatar", 8),
        CountryInfo("+262", "Reunion", 9), CountryInfo("+40", "Romania", 9),
        CountryInfo("+7", "Russia", 10), CountryInfo("+250", "Rwanda", 9),
        CountryInfo("+1869", "Saint Kitts & Nevis", 7), CountryInfo("+1758", "Saint Lucia", 7),
        CountryInfo("+1784", "St Vincent & Grenadines", 7), CountryInfo("+685", "Samoa", 7),
        CountryInfo("+378", "San Marino", 8), CountryInfo("+239", "Sao Tome & Principe", 7),
        CountryInfo("+966", "Saudi Arabia", 9), CountryInfo("+221", "Senegal", 9),
        CountryInfo("+381", "Serbia", 9), CountryInfo("+248", "Seychelles", 7),
        CountryInfo("+232", "Sierra Leone", 8), CountryInfo("+65", "Singapore", 8),
        CountryInfo("+421", "Slovakia", 9), CountryInfo("+386", "Slovenia", 8),
        CountryInfo("+677", "Solomon Islands", 7), CountryInfo("+252", "Somalia", 8),
        CountryInfo("+27", "South Africa", 9), CountryInfo("+82", "South Korea", 10),
        CountryInfo("+211", "South Sudan", 9), CountryInfo("+34", "Spain", 9),
        CountryInfo("+94", "Sri Lanka", 9), CountryInfo("+249", "Sudan", 9),
        CountryInfo("+597", "Suriname", 7), CountryInfo("+46", "Sweden", 10),
        CountryInfo("+41", "Switzerland", 9), CountryInfo("+963", "Syria", 9),
        CountryInfo("+886", "Taiwan", 9), CountryInfo("+992", "Tajikistan", 9),
        CountryInfo("+255", "Tanzania", 9), CountryInfo("+66", "Thailand", 9),
        CountryInfo("+670", "Timor-Leste", 8), CountryInfo("+228", "Togo", 8),
        CountryInfo("+676", "Tonga", 7), CountryInfo("+1868", "Trinidad & Tobago", 7),
        CountryInfo("+216", "Tunisia", 8), CountryInfo("+90", "Turkey", 10),
        CountryInfo("+993", "Turkmenistan", 8), CountryInfo("+688", "Tuvalu", 6),
        CountryInfo("+256", "Uganda", 9), CountryInfo("+380", "Ukraine", 9),
        CountryInfo("+971", "United Arab Emirates", 9), CountryInfo("+44", "United Kingdom", 10),
        CountryInfo("+1", "United States", 10), CountryInfo("+598", "Uruguay", 8),
        CountryInfo("+998", "Uzbekistan", 9), CountryInfo("+678", "Vanuatu", 7),
        CountryInfo("+58", "Venezuela", 10), CountryInfo("+84", "Vietnam", 10),
        CountryInfo("+967", "Yemen", 9), CountryInfo("+260", "Zambia", 9),
        CountryInfo("+263", "Zimbabwe", 9)
    )

    private fun getDefaultCountry(): CountryInfo {
        val store = sessionManager.store
        val country = store?.country?.lowercase() ?: ""
        return allCountries.firstOrNull { country.contains(it.name.lowercase()) }
            ?: allCountries.first { it.code == "+230" }
    }

    @Suppress("UNUSED")
    private fun getCountryCode(): String {
        val store = sessionManager.store
        val country = store?.country?.lowercase() ?: ""
        return when {
            country.contains("mauritius") -> "+230"
            country.contains("reunion") || country.contains("réunion") -> "+262"
            country.contains("madagascar") -> "+261"
            country.contains("south africa") -> "+27"
            country.contains("france") -> "+33"
            country.contains("united kingdom") || country.contains("uk") -> "+44"
            country.contains("united states") || country.contains("usa") || country.contains("us") -> "+1"
            country.contains("india") -> "+91"
            else -> "+230"
        }
    }

    private fun getMobileLengthForCode(code: String): Int {
        return when (code) {
            "+230" -> 8; "+262" -> 9; "+261" -> 9; "+27" -> 9
            "+33" -> 9; "+44" -> 10; "+1" -> 10; "+91" -> 10
            else -> 8
        }
    }

    private fun showCustomerNumpadDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.add_customer_layout, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        // Set backspace text programmatically
        dialogView.findViewById<TextView>(R.id.btn_backspace)?.text = "\u232B"

        var currentCountry = getDefaultCountry()

        val txtTitle = dialogView.findViewById<TextView>(R.id.txt_title)
        val txtCountryCode = dialogView.findViewById<TextView>(R.id.txt_country_code)
        val txtPhoneNumber = dialogView.findViewById<TextView>(R.id.txt_phone_number)
        val txtDigitCount = dialogView.findViewById<TextView>(R.id.txt_digit_count)
        val txtValidation = dialogView.findViewById<TextView>(R.id.txt_validation)
        val layoutExtraDetails = dialogView.findViewById<LinearLayout>(R.id.layout_extra_details)
        val nameInput = dialogView.findViewById<EditText>(R.id.text_customer_name)
        val emailInput = dialogView.findViewById<EditText>(R.id.text_email_address)
        val addressInput = dialogView.findViewById<EditText>(R.id.text_address)
        val btnCreateByName = dialogView.findViewById<View>(R.id.btn_create_by_name)
        val btnSkip = dialogView.findViewById<View>(R.id.button_skip)

        txtTitle.text = "Customer"
        txtCountryCode.text = currentCountry.code

        // Show Skip button when this dialog is triggered by the payment flow
        if (pendingPayAfterCustomer) {
            btnSkip.visibility = View.VISIBLE
            btnSkip.setOnClickListener {
                pendingPayAfterCustomer = false
                dialog.dismiss()
                proceedToPayment()
            }
        }

        var phoneStr = ""

        fun formatPhoneDisplay(): String {
            val length = currentCountry.mobileLength
            val sb = StringBuilder()
            for (i in 0 until length) {
                if (i > 0) sb.append(" ")
                if (i < phoneStr.length) {
                    sb.append(phoneStr[i])
                } else if (i == phoneStr.length) {
                    sb.append("_")
                } else {
                    sb.append("\u2022")
                }
            }
            return sb.toString()
        }

        val btnSave = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.button_save)

        fun updateDisplay() {
            val length = currentCountry.mobileLength
            txtPhoneNumber.text = formatPhoneDisplay()
            txtPhoneNumber.setTextColor(
                if (phoneStr.length == length) resources.getColor(R.color.posterita_ink, null) else resources.getColor(R.color.posterita_muted, null)
            )
            txtDigitCount.text = "${phoneStr.length} / $length digits"
            txtValidation.visibility = View.GONE

            // Dynamic button text: Skip when empty, Save when full
            btnSave?.text = if (phoneStr.isEmpty()) "Skip" else "Save"

            if (phoneStr.length >= 3) {
                customerViewModel.searchCustomersByPhone(phoneStr) { results ->
                    if (results.size == 1 && phoneStr.length >= length) {
                        val customer = results[0]
                        shoppingCartViewModel.setCustomer(customer)
                        Toast.makeText(this, "Customer: ${customer.name}", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                        if (pendingPayAfterCustomer) {
                            pendingPayAfterCustomer = false
                            proceedToPayment()
                        }
                    } else if (results.isNotEmpty()) {
                        txtValidation.text = "${results.size} customer(s) found"
                        txtValidation.setTextColor(resources.getColor(R.color.txt_color, null))
                        txtValidation.visibility = View.VISIBLE
                    } else {
                        txtValidation.text = "New customer"
                        txtValidation.setTextColor(resources.getColor(R.color.txt_color, null))
                        txtValidation.visibility = View.VISIBLE
                    }
                }
            }
        }

        fun updateHint() {
            txtPhoneNumber.hint = (1..currentCountry.mobileLength).joinToString(" ") { "_" }
        }

        updateHint()
        updateDisplay()

        // Country code picker with full country list
        txtCountryCode.setOnClickListener {
            val countryNames = allCountries.map { "${it.code}  ${it.name}" }.toTypedArray()
            val currentIndex = allCountries.indexOf(currentCountry).coerceAtLeast(0)

            AlertDialog.Builder(this)
                .setTitle("Select Country")
                .setSingleChoiceItems(countryNames, currentIndex) { d, which ->
                    currentCountry = allCountries[which]
                    txtCountryCode.text = currentCountry.code
                    if (phoneStr.length > currentCountry.mobileLength) {
                        phoneStr = phoneStr.take(currentCountry.mobileLength)
                    }
                    updateHint()
                    updateDisplay()
                    d.dismiss()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        val appendDigit = fun(digit: String) {
            if (phoneStr.length >= currentCountry.mobileLength) return
            phoneStr += digit
            updateDisplay()
        }

        dialogView.findViewById<View>(R.id.btn_0).setOnClickListener { appendDigit("0") }
        dialogView.findViewById<View>(R.id.btn_1).setOnClickListener { appendDigit("1") }
        dialogView.findViewById<View>(R.id.btn_2).setOnClickListener { appendDigit("2") }
        dialogView.findViewById<View>(R.id.btn_3).setOnClickListener { appendDigit("3") }
        dialogView.findViewById<View>(R.id.btn_4).setOnClickListener { appendDigit("4") }
        dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { appendDigit("5") }
        dialogView.findViewById<View>(R.id.btn_6).setOnClickListener { appendDigit("6") }
        dialogView.findViewById<View>(R.id.btn_7).setOnClickListener { appendDigit("7") }
        dialogView.findViewById<View>(R.id.btn_8).setOnClickListener { appendDigit("8") }
        dialogView.findViewById<View>(R.id.btn_9).setOnClickListener { appendDigit("9") }

        dialogView.findViewById<View>(R.id.btn_backspace).setOnClickListener {
            if (phoneStr.isNotEmpty()) {
                phoneStr = phoneStr.dropLast(1)
                updateDisplay()
            }
        }
        dialogView.findViewById<View>(R.id.btn_backspace).setOnLongClickListener {
            phoneStr = ""
            updateDisplay()
            true
        }

        val btnDetails = dialogView.findViewById<View>(R.id.btn_details)
        btnDetails.setOnClickListener {
            layoutExtraDetails.visibility = if (layoutExtraDetails.visibility == View.GONE)
                View.VISIBLE else View.GONE
        }

        // Create by Name — show name input dialog
        btnCreateByName.setOnClickListener {
            dialog.dismiss()
            showCreateByNameDialog()
        }

        dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener {
            pendingPayAfterCustomer = false
            dialog.dismiss()
        }

        btnSave?.setOnClickListener {
            // Skip — no phone entered, dismiss and proceed
            if (phoneStr.isEmpty()) {
                dialog.dismiss()
                if (pendingPayAfterCustomer) {
                    pendingPayAfterCustomer = false
                    proceedToPayment()
                }
                return@setOnClickListener
            }

            // Partial number — show error, don't proceed
            val mobileLength = currentCountry.mobileLength
            if (phoneStr.length != mobileLength) {
                txtValidation.text = "Enter all $mobileLength digits or clear to skip"
                txtValidation.setTextColor(resources.getColor(R.color.posterita_error, null))
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            if (currentCountry.code == "+230" && !phoneStr.startsWith("5")) {
                txtValidation.text = "Mauritius mobile numbers start with 5"
                txtValidation.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            val fullPhone = "${currentCountry.code}$phoneStr"

            customerViewModel.searchCustomersByPhone(phoneStr) { results ->
                if (results.isNotEmpty()) {
                    val customer = results[0]
                    shoppingCartViewModel.setCustomer(customer)
                    Toast.makeText(this, "Customer: ${customer.name}", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                    if (pendingPayAfterCustomer) {
                        pendingPayAfterCustomer = false
                        proceedToPayment()
                    }
                } else {
                    val name = nameInput?.text?.toString()?.trim()
                    val customerName = if (name.isNullOrEmpty()) fullPhone else name
                    val email = emailInput?.text?.toString()?.trim()
                    val address = addressInput?.text?.toString()?.trim()

                    customerViewModel.createCustomer(customerName, email, fullPhone, address, null, null)
                    dialog.dismiss()
                }
            }
        }

        customerViewModel.createResult.observe(this) { result ->
            result.fold(
                onSuccess = { customer ->
                    shoppingCartViewModel.setCustomer(customer)
                    Toast.makeText(this, "Customer created: ${customer.name}", Toast.LENGTH_SHORT).show()
                    if (pendingPayAfterCustomer) {
                        pendingPayAfterCustomer = false
                        proceedToPayment()
                    }
                    val phone = customer.phone1 ?: customer.mobile
                    if (!phone.isNullOrBlank() && loyaltyRepository.isEnabled) {
                        showConsentDialog(phone)
                    }
                },
                onFailure = { error ->
                    Toast.makeText(this, "Failed to create customer: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            )
        }

        dialog.show()
    }

    private fun showCreateByNameDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(60, 40, 60, 20)
        }
        val nameInput = EditText(this).apply {
            hint = "Customer name"
            inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
            textSize = 16f
        }
        layout.addView(nameInput)

        AlertDialog.Builder(this)
            .setTitle("Create Customer by Name")
            .setView(layout)
            .setPositiveButton("Create") { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isNotEmpty()) {
                    customerViewModel.createCustomer(name, null, null, null, null, null)
                } else {
                    Toast.makeText(this, "Please enter a name", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel") { _, _ ->
                pendingPayAfterCustomer = false
            }
            .show()
        nameInput.requestFocus()
    }

    private fun updateCartEmptyState(items: List<CartItem>) {
        if (items.isEmpty()) {
            binding.recyclerViewCartLines.visibility = View.GONE
            binding.layoutEmptyCart?.visibility = View.VISIBLE
        } else {
            binding.recyclerViewCartLines.visibility = View.VISIBLE
            binding.layoutEmptyCart?.visibility = View.GONE
        }
    }

    private fun observeViewModel() {
        shoppingCartViewModel.cartItems.observe(this) { items ->
            cartAdapter.setProductList(items)
            updateCartEmptyState(items)
        }

        shoppingCartViewModel.subTotalAmount.observe(this) { amount ->
            binding.textViewSubtotal?.text = NumberUtils.formatPrice(amount ?: 0.0)
        }

        shoppingCartViewModel.taxTotalAmount.observe(this) { amount ->
            binding.textViewTaxTotal?.text = NumberUtils.formatPrice(amount ?: 0.0)
        }

        shoppingCartViewModel.discountTotalAmount.observe(this) { amount ->
            val discount = amount ?: 0.0
            if (discount > 0) {
                val currency = sessionManager.account?.currency ?: ""
                binding.txtDiscountTotal?.visibility = View.VISIBLE
                binding.textViewDiscountTotal?.visibility = View.VISIBLE
                binding.textViewDiscountTotal?.text = "-$currency ${NumberUtils.formatPrice(discount)}"
            } else {
                binding.txtDiscountTotal?.visibility = View.GONE
                binding.textViewDiscountTotal?.visibility = View.GONE
            }
        }

        shoppingCartViewModel.grandTotalAmount.observe(this) { amount ->
            val currency = sessionManager.account?.currency ?: ""
            binding.textViewGrandTotal?.text = "$currency ${NumberUtils.formatPrice(amount ?: 0.0)}"

            // Disable Pay button when cart is empty
            val isEmpty = (amount ?: 0.0) == 0.0
            binding.buttonPayOrder.alpha = if (isEmpty) 0.4f else 1.0f
            binding.buttonPayOrder.isClickable = !isEmpty
        }

        shoppingCartViewModel.customer.observe(this) { customer ->
            if (customer != null) {
                val name = customer.name ?: ""
                val phone = customer.phone1 ?: customer.mobile ?: ""
                binding.textViewCustomerName?.text = when {
                    name.isEmpty() || name == phone -> phone
                    phone.isNotEmpty() -> "$name - $phone"
                    else -> name
                }
                binding.textViewCustomerName?.setTextColor(resources.getColor(R.color.posterita_ink, null))
                // Fetch and display loyalty points if customer has a phone number
                if (phone.isNotEmpty() && loyaltyRepository.isEnabled) {
                    fetchLoyaltyBalance(phone)
                } else {
                    binding.textViewLoyaltyPoints?.visibility = View.GONE
                }
            } else {
                binding.textViewCustomerName?.text = "Walk-in customer"
                binding.textViewCustomerName?.setTextColor(resources.getColor(R.color.posterita_muted, null))
                binding.textViewLoyaltyPoints?.visibility = View.GONE
            }
        }

        // Observe order note
        shoppingCartViewModel.orderNote.observe(this) { note ->
            updateNoteDisplay(note)
        }
        // Also show note on initial load
        updateNoteDisplay(shoppingCartViewModel.shoppingCart.note)

        // Click note banner to edit
        binding.textViewOrderNote?.setOnClickListener {
            showAddNoteDialog()
        }
    }

    private fun updateNoteDisplay(note: String?) {
        if (!note.isNullOrBlank()) {
            binding.textViewOrderNote?.text = "Note: $note"
            binding.textViewOrderNote?.visibility = View.VISIBLE
        } else {
            binding.textViewOrderNote?.visibility = View.GONE
        }
    }

    // ==================== LOYALTY ====================

    private fun fetchLoyaltyBalance(phone: String) {
        lifecycleScope.launch {
            val balance = withContext(Dispatchers.IO) {
                loyaltyRepository.getBalance(phone)
            }
            if (balance != null) {
                binding.textViewLoyaltyPoints?.text = "${balance.points} pts"
                binding.textViewLoyaltyPoints?.visibility = View.VISIBLE
            } else {
                binding.textViewLoyaltyPoints?.visibility = View.GONE
            }
        }
    }

    private fun awardLoyaltyPoints(uuid: String, grandTotal: Double) {
        if (!loyaltyRepository.isEnabled) return

        val customer = sessionManager.getCustomerOrDefault()
        val phone = customer.phone1 ?: customer.mobile
        if (phone.isNullOrBlank() || customer.customer_id == 0) return

        val account = sessionManager.account ?: return
        val store = sessionManager.store ?: return
        val terminal = sessionManager.terminal ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            loyaltyRepository.awardPoints(
                LoyaltyAwardRequest(
                    phone = phone,
                    orderUuid = uuid,
                    orderTotal = grandTotal,
                    currency = account.currency ?: "",
                    storeId = store.storeId,
                    terminalId = terminal.terminalId
                )
            )
        }
    }

    private fun showConsentDialog(phone: String) {
        val store = sessionManager.store
        val terminal = sessionManager.terminal
        val user = sessionManager.user

        AlertDialog.Builder(this)
            .setTitle("WhatsApp Updates")
            .setMessage("Would this customer like to receive updates and promotions via WhatsApp?")
            .setPositiveButton("Yes") { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    loyaltyRepository.updateConsent(
                        phone = phone,
                        consentGranted = true,
                        brandName = sessionManager.account?.businessname,
                        storeId = store?.storeId ?: 0,
                        terminalId = terminal?.terminalId ?: 0,
                        userId = user?.user_id ?: 0
                    )
                }
            }
            .setNegativeButton("No") { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    loyaltyRepository.updateConsent(
                        phone = phone,
                        consentGranted = false,
                        brandName = sessionManager.account?.businessname,
                        storeId = store?.storeId ?: 0,
                        terminalId = terminal?.terminalId ?: 0,
                        userId = user?.user_id ?: 0
                    )
                }
            }
            .show()
    }

    // Bluetooth HID barcode scanner support
    private val hidBuffer = StringBuilder()
    private var hidLastKeyTime = 0L
    private val HID_TIMEOUT_MS = 500L

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Only process key-down events
        if (event.action != KeyEvent.ACTION_DOWN) return super.dispatchKeyEvent(event)

        val now = System.currentTimeMillis()

        // Clear buffer if too much time passed (manual typing, not scanner)
        if (now - hidLastKeyTime > HID_TIMEOUT_MS && hidBuffer.isNotEmpty()) {
            hidBuffer.clear()
        }
        hidLastKeyTime = now

        return when {
            event.keyCode == KeyEvent.KEYCODE_ENTER -> {
                // Scanner sends Enter at end of barcode
                val barcode = hidBuffer.toString().trim()
                hidBuffer.clear()
                if (barcode.length >= 3) {
                    handleBarcodeScan(barcode)
                    true
                } else {
                    super.dispatchKeyEvent(event)
                }
            }
            event.isPrintingKey -> {
                // Accumulate printable characters
                hidBuffer.append(event.unicodeChar.toChar())
                true // consume the event so it doesn't go to EditText
            }
            else -> super.dispatchKeyEvent(event)
        }
    }

    private fun handleBarcodeScan(barcode: String) {
        lifecycleScope.launch {
            val product: Product? = withContext(Dispatchers.IO) {
                db.productDao().getProductByUpc(barcode)
            }
            if (product != null) {
                shoppingCartViewModel.addProduct(product)
                Toast.makeText(this@CartActivity, "${product.name} added to cart", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@CartActivity, "Product not found for barcode: $barcode", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
