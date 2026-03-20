package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.widget.ImageView
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.ui.adapter.KitchenOrderAdapter
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject

@AndroidEntryPoint
class KitchenOrdersActivity : BaseDrawerActivity(), KitchenOrderAdapter.OnKitchenOrderActionListener {

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var shoppingCart: ShoppingCart
    @Inject lateinit var productDao: ProductDao
    @Inject lateinit var printerManager: PrinterManager

    private lateinit var adapter: KitchenOrderAdapter
    private lateinit var recyclerView: RecyclerView
    private lateinit var textEmpty: TextView
    private lateinit var txtOrderCount: TextView
    private lateinit var progressLoading: ProgressBar

    // Timer for refreshing elapsed times every 30s
    private var timerJob: Job? = null

    override fun getDrawerHighlightId(): Int = R.id.nav_kitchen_orders

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_kitchen_orders)
        supportActionBar?.hide()

        val contentView = drawerLayout.getChildAt(0)
        recyclerView = contentView.findViewById(R.id.recycler_kitchen_orders)
        textEmpty = contentView.findViewById(R.id.text_empty)
        txtOrderCount = contentView.findViewById(R.id.txt_order_count)
        progressLoading = contentView.findViewById(R.id.progress_loading)

        val currency = sessionManager.account?.currency ?: ""
        adapter = KitchenOrderAdapter(this, currency)

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        // Set up toolbar with hamburger menu
        val toolbar = contentView.findViewById<androidx.appcompat.widget.Toolbar>(R.id.toolbar)
        toolbar.setNavigationIcon(R.drawable.ic_drawer)
        toolbar.setNavigationOnClickListener { openDrawer() }

        setupDrawerNavigation()
        loadKitchenOrders()
    }

    override fun onResume() {
        super.onResume()
        loadKitchenOrders()
        timerJob = lifecycleScope.launch {
            while (true) {
                delay(30_000)
                adapter.refreshTimers()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        timerJob?.cancel()
        timerJob = null
    }

    private fun loadKitchenOrders() {
        val terminalId = prefsManager.terminalId
        progressLoading.visibility = View.VISIBLE

        lifecycleScope.launch(Dispatchers.IO) {
            val allHolds = db.holdOrderDao().getHoldOrdersByTerminal(terminalId)

            // Kitchen orders are hold orders explicitly flagged as kitchen orders
            val kitchenOrders = allHolds.filter { hold ->
                val json = hold.json ?: return@filter false
                json.optBoolean("isKitchenOrder", false)
            }

            withContext(Dispatchers.Main) {
                progressLoading.visibility = View.GONE
                adapter.setOrders(kitchenOrders)
                textEmpty.visibility = if (kitchenOrders.isEmpty()) View.VISIBLE else View.GONE
                recyclerView.visibility = if (kitchenOrders.isEmpty()) View.GONE else View.VISIBLE

                // Update order count badge
                if (kitchenOrders.isNotEmpty()) {
                    txtOrderCount.text = kitchenOrders.size.toString()
                    txtOrderCount.visibility = View.VISIBLE
                } else {
                    txtOrderCount.visibility = View.GONE
                }
            }
        }
    }

    // ==================== STATUS CHANGE ====================
    override fun onStatusChange(holdOrder: HoldOrder, position: Int) {
        val json = holdOrder.json ?: return
        val currentStatus = json.optString("status", KitchenOrderAdapter.STATUS_NEW)

        // Cycle: NEW -> IN_PROGRESS -> READY -> NEW
        val nextStatus = when (currentStatus) {
            KitchenOrderAdapter.STATUS_NEW -> KitchenOrderAdapter.STATUS_IN_PROGRESS
            KitchenOrderAdapter.STATUS_IN_PROGRESS -> KitchenOrderAdapter.STATUS_READY
            else -> KitchenOrderAdapter.STATUS_NEW
        }

        lifecycleScope.launch(Dispatchers.IO) {
            json.put("status", nextStatus)
            val updatedOrder = holdOrder.copy(json = json)
            db.holdOrderDao().insertHoldOrder(updatedOrder)
            withContext(Dispatchers.Main) {
                val label = when (nextStatus) {
                    KitchenOrderAdapter.STATUS_IN_PROGRESS -> "Preparing"
                    KitchenOrderAdapter.STATUS_READY -> "Ready"
                    else -> "New"
                }
                Toast.makeText(this@KitchenOrdersActivity, "Status: $label", Toast.LENGTH_SHORT).show()
                loadKitchenOrders()
            }
        }
    }

    // ==================== ADD NOTE ====================
    override fun onAddNote(holdOrder: HoldOrder, position: Int) {
        val currentNote = holdOrder.json?.optString("note", "") ?: ""

        val editText = EditText(this).apply {
            hint = "Enter note"
            setText(currentNote)
            setPadding(48, 24, 48, 24)
        }

        AlertDialog.Builder(this)
            .setTitle("Order Note")
            .setView(editText)
            .setPositiveButton("Save") { _, _ ->
                val newNote = editText.text.toString().trim()
                lifecycleScope.launch(Dispatchers.IO) {
                    val json = holdOrder.json ?: JSONObject()
                    json.put("note", newNote)
                    val updatedOrder = holdOrder.copy(json = json)
                    db.holdOrderDao().insertHoldOrder(updatedOrder)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@KitchenOrdersActivity, "Note saved", Toast.LENGTH_SHORT).show()
                        loadKitchenOrders()
                    }
                }
            }
            .setNeutralButton("Clear") { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    val json = holdOrder.json ?: JSONObject()
                    json.put("note", "")
                    val updatedOrder = holdOrder.copy(json = json)
                    db.holdOrderDao().insertHoldOrder(updatedOrder)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@KitchenOrdersActivity, "Note cleared", Toast.LENGTH_SHORT).show()
                        loadKitchenOrders()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== RECALL (edit and send back to kitchen) ====================
    override fun onRecall(holdOrder: HoldOrder, position: Int) {
        AlertDialog.Builder(this)
            .setTitle("Recall Order")
            .setMessage("Load this order back into the cart for editing?")
            .setPositiveButton("Recall") { _, _ ->
                recallOrder(holdOrder, position)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun recallOrder(holdOrder: HoldOrder, position: Int) {
        lifecycleScope.launch(Dispatchers.IO) {
            val json = holdOrder.json
            if (json != null) {
                shoppingCart.restoreFromJson(json, productDao, sessionManager.taxCache)
            } else {
                shoppingCart.clearCart()
            }

            // Free the table if this order had one
            val tableId = json?.optInt("tableId", 0) ?: 0
            if (tableId > 0) {
                db.restaurantTableDao().updateTableStatus(tableId, false, null)
            }

            // Delete the hold order
            db.holdOrderDao().deleteHoldOrderById(holdOrder.holdOrderId)

            withContext(Dispatchers.Main) {
                adapter.removeAt(position)
                if (adapter.itemCount == 0) {
                    textEmpty.visibility = View.VISIBLE
                    recyclerView.visibility = View.GONE
                }
                Toast.makeText(this@KitchenOrdersActivity, "Order recalled to cart", Toast.LENGTH_SHORT).show()
                startActivity(Intent(this@KitchenOrdersActivity, CartActivity::class.java))
            }
        }
    }

    // ==================== SPLIT BILL ====================
    override fun onSplit(holdOrder: HoldOrder, position: Int) {
        val json = holdOrder.json ?: return
        val items = json.optJSONArray("items")
        if (items == null || items.length() < 2) {
            Toast.makeText(this, "Need at least 2 items to split", Toast.LENGTH_SHORT).show()
            return
        }

        // Build item list for selection
        val itemNames = mutableListOf<String>()
        val itemChecked = BooleanArray(items.length())
        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            val qty = item.optDouble("qty", 1.0)
            val name = item.optString("product_name", "Unknown")
            val price = item.optDouble("lineNetAmt", 0.0)
            val currency = sessionManager.account?.currency ?: ""
            itemNames.add("${NumberUtils.formatQuantity(qty)}x $name  ($currency ${NumberUtils.formatPrice(price)})")
        }

        AlertDialog.Builder(this)
            .setTitle("Split Bill - Select items to pay now")
            .setMultiChoiceItems(itemNames.toTypedArray(), itemChecked) { _, which, isChecked ->
                itemChecked[which] = isChecked
            }
            .setPositiveButton("Pay Selected") { _, _ ->
                val selectedIndices = itemChecked.indices.filter { itemChecked[it] }
                if (selectedIndices.isEmpty()) {
                    Toast.makeText(this, "No items selected", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (selectedIndices.size == items.length()) {
                    // All items selected — just do normal complete
                    onComplete(holdOrder, position)
                    return@setPositiveButton
                }
                splitAndPay(holdOrder, position, selectedIndices)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun splitAndPay(holdOrder: HoldOrder, position: Int, selectedIndices: List<Int>) {
        lifecycleScope.launch(Dispatchers.IO) {
            val json = holdOrder.json ?: return@launch
            val items = json.optJSONArray("items") ?: return@launch

            // Split items into "pay now" and "remain on table"
            val payItems = org.json.JSONArray()
            val remainItems = org.json.JSONArray()

            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                if (i in selectedIndices) {
                    payItems.put(item)
                } else {
                    remainItems.put(item)
                }
            }

            // Load "pay now" items into the cart
            shoppingCart.clearCart()
            for (i in 0 until payItems.length()) {
                val itemJson = payItems.optJSONObject(i) ?: continue
                val productId = itemJson.optInt("product_id", 0)
                if (productId == 0) continue
                val product = productDao.getProductByIdSync(productId) ?: continue
                val tax = sessionManager.taxCache[product.tax_id]
                val cartItem = com.posterita.pos.android.domain.model.CartItem(
                    product = product,
                    lineNo = itemJson.optString("lineNo", ""),
                    qty = itemJson.optDouble("qty", 1.0),
                    priceEntered = itemJson.optDouble("price", 0.0),
                    tax = tax
                )
                cartItem.modifiers = itemJson.optString("modifiers", null)
                cartItem.note = itemJson.optString("note", null)
                cartItem.updateTotals()
                shoppingCart.addOrUpdateLine(cartItem)
            }
            shoppingCart.recalculateTotals()

            // Update the existing hold order with remaining items
            val updatedJson = JSONObject(json.toString())
            updatedJson.put("items", remainItems)
            // Recalculate remaining total
            var remainTotal = 0.0
            for (i in 0 until remainItems.length()) {
                val item = remainItems.optJSONObject(i) ?: continue
                remainTotal += item.optDouble("lineNetAmt", 0.0)
            }
            updatedJson.put("grandtotal", remainTotal)

            val updatedOrder = holdOrder.copy(json = updatedJson)
            db.holdOrderDao().insertHoldOrder(updatedOrder)

            withContext(Dispatchers.Main) {
                loadKitchenOrders() // Refresh the list
                Toast.makeText(this@KitchenOrdersActivity, "Split: ${selectedIndices.size} items to pay", Toast.LENGTH_SHORT).show()
                // Navigate to cart with "from kitchen" flag
                val intent = Intent(this@KitchenOrdersActivity, CartActivity::class.java)
                intent.putExtra("FROM_KITCHEN", true)
                startActivity(intent)
            }
        }
    }

    // ==================== PRINT BILL (print receipt without paying) ====================
    override fun onPrintBill(holdOrder: HoldOrder, position: Int) {
        val json = holdOrder.json ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            val orderDetails = buildOrderDetailsFromHold(holdOrder)
            if (orderDetails != null) {
                printerManager.printReceiptOnly(orderDetails)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@KitchenOrdersActivity, "Bill printed", Toast.LENGTH_SHORT).show()
                }
            } else {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@KitchenOrdersActivity, "Could not generate bill", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // ==================== DELETE ====================
    override fun onDelete(holdOrder: HoldOrder, position: Int) {
        val tableName = holdOrder.json?.optString("tableName", "") ?: ""
        val title = if (tableName.isNotBlank()) "Delete order for $tableName?" else "Delete kitchen order?"

        AlertDialog.Builder(this)
            .setTitle("Delete Order")
            .setMessage(title)
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    // Free the table
                    val tableId = holdOrder.json?.optInt("tableId", 0) ?: 0
                    if (tableId > 0) {
                        db.restaurantTableDao().updateTableStatus(tableId, false, null)
                    }

                    db.holdOrderDao().deleteHoldOrderById(holdOrder.holdOrderId)

                    withContext(Dispatchers.Main) {
                        adapter.removeAt(position)
                        if (adapter.itemCount == 0) {
                            textEmpty.visibility = View.VISIBLE
                            recyclerView.visibility = View.GONE
                        }
                        txtOrderCount.text = adapter.itemCount.toString()
                        if (adapter.itemCount == 0) txtOrderCount.visibility = View.GONE
                        Toast.makeText(this@KitchenOrdersActivity, "Order deleted", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== COMPLETE (pay — no kitchen reprint) ====================
    override fun onComplete(holdOrder: HoldOrder, position: Int) {
        // Recall to cart with a flag that it came from kitchen (no reprint)
        lifecycleScope.launch(Dispatchers.IO) {
            val json = holdOrder.json
            if (json != null) {
                shoppingCart.restoreFromJson(json, productDao, sessionManager.taxCache)
            } else {
                shoppingCart.clearCart()
            }

            // Free the table
            val tableId = json?.optInt("tableId", 0) ?: 0
            if (tableId > 0) {
                db.restaurantTableDao().updateTableStatus(tableId, false, null)
            }

            // Delete the hold order
            db.holdOrderDao().deleteHoldOrderById(holdOrder.holdOrderId)

            withContext(Dispatchers.Main) {
                adapter.removeAt(position)
                // Navigate to CartActivity with "from kitchen" flag
                // so it skips kitchen reprint on order completion
                val intent = Intent(this@KitchenOrdersActivity, CartActivity::class.java)
                intent.putExtra("FROM_KITCHEN", true)
                startActivity(intent)
            }
        }
    }

    // ==================== HELPERS ====================

    /**
     * Build a simplified OrderDetails from a hold order JSON
     * for bill printing purposes (no payment info needed).
     */
    private suspend fun buildOrderDetailsFromHold(holdOrder: HoldOrder): OrderDetails? {
        val json = holdOrder.json ?: return null
        val items = json.optJSONArray("items") ?: return null

        val account = sessionManager.account ?: return null
        val store = sessionManager.store

        val lines = mutableListOf<OrderDetails.OrderLineDetail>()
        for (i in 0 until items.length()) {
            val itemJson = items.optJSONObject(i) ?: continue
            val productId = itemJson.optInt("product_id", 0)
            if (productId == 0) continue
            val product = productDao.getProductByIdSync(productId)

            lines.add(
                OrderDetails.OrderLineDetail(
                    product_id = productId,
                    name = itemJson.optString("product_name", product?.name ?: ""),
                    qtyentered = itemJson.optDouble("qty", 1.0),
                    priceentered = itemJson.optDouble("price", 0.0),
                    priceactual = itemJson.optDouble("price", 0.0),
                    lineamt = itemJson.optDouble("lineAmt", 0.0),
                    linenetamt = itemJson.optDouble("lineNetAmt", 0.0),
                    taxamt = itemJson.optDouble("taxAmt", 0.0),
                    discountamt = itemJson.optDouble("discountAmt", 0.0),
                    modifiers = itemJson.optString("modifiers", null),
                    note = itemJson.optString("note", null),
                    isKitchenItem = product?.iskitchenitem,
                    tax_id = product?.tax_id ?: 0
                )
            )
        }

        val tableName = json.optString("tableName", "")
        val note = json.optString("note", "")
        val orderNote = buildString {
            if (tableName.isNotBlank()) append(tableName)
            if (note.isNotBlank()) {
                if (isNotBlank()) append(" | ")
                append(note)
            }
        }

        return OrderDetails(
            account_id = account.account_id,
            store_id = store?.storeId ?: 0,
            terminal_id = prefsManager.terminalId,
            customer_name = "Walk-in",
            grandtotal = json.optDouble("grandtotal", 0.0),
            subtotal = json.optDouble("grandtotal", 0.0),
            qtytotal = lines.sumOf { it.qtyentered },
            tipsamt = json.optDouble("tipsAmount", 0.0),
            ispaid = false,
            status = "BILL",
            currency = account.currency,
            note = orderNote.ifBlank { null },
            lines = lines,
            account = OrderDetails.AccountDetail(
                businessname = account.businessname,
                address1 = account.address1,
                phone1 = account.phone1,
                receiptmessage = account.receiptmessage,
                currency = account.currency
            ),
            store = OrderDetails.StoreDetail(
                name = store?.name,
                address = store?.address,
                city = store?.city
            )
        )
    }
}
