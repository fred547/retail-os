package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.EditText
import android.widget.PopupMenu
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.core.view.GravityCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
// GridLayoutManager used for both products and categories
import com.google.android.material.textfield.TextInputEditText
import com.bumptech.glide.Glide
import com.google.android.material.navigation.NavigationView
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityProductBinding
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.local.entity.Modifier
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.printing.PrinterManager
import org.json.JSONArray
import org.json.JSONObject
import java.sql.Timestamp
import com.posterita.pos.android.ui.adapter.CartProductAdapter
import com.posterita.pos.android.ui.adapter.ProductAdapter
import com.posterita.pos.android.ui.adapter.ProductCategoryAdapter
import com.posterita.pos.android.ui.viewmodel.CustomerViewModel
import com.posterita.pos.android.ui.viewmodel.ProductViewModel
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.ui.viewmodel.SyncViewModel
import com.posterita.pos.android.ui.viewmodel.TillViewModel
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import androidx.recyclerview.widget.LinearLayoutManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ProductActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityProductBinding

    private val productViewModel: ProductViewModel by viewModels()
    private val shoppingCartViewModel: ShoppingCartViewModel by viewModels()
    private val customerViewModel: CustomerViewModel by viewModels()
    private val syncViewModel: SyncViewModel by viewModels()
    private val tillViewModel: TillViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var printerManager: PrinterManager

    @Inject
    lateinit var db: AppDatabase

    private lateinit var productAdapter: ProductAdapter
    private var cartAdapter: CartProductAdapter? = null
    private var categoryAdapter: ProductCategoryAdapter? = null
    private var categoryList: List<ProductCategory> = emptyList()
    private var lastAddedProduct: Product? = null
    /** True when the layout includes an inline cart panel (tablet landscape or tablet portrait). */
    private val isLandscapeWithCart: Boolean
        get() = binding.recyclerViewCartItems != null

    // Activity result launchers
    private val barcodeLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val barcode = result.data?.getStringExtra("BARCODE_RESULT") ?: return@registerForActivityResult
            handleBarcodeScan(barcode)
        }
    }

    private val customerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val customer = result.data?.getSerializableExtra("SELECTED_CUSTOMER") as? Customer
            if (customer != null) {
                shoppingCartViewModel.setCustomer(customer)
            }
        }
    }

    // Country code helpers
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

    override fun showBackButton(): Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProductBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        // Initialize drawer from existing DrawerLayout in the XML
        initExistingDrawer(binding.myDrawerLayout)

        // Load session data (account, store, terminal, till) from DB if needed
        tillViewModel.loadOpenTill()

        setupProductGrid()
        setupCategoryChips()
        setupBottomButtons()
        setupCartButton()
        setupProductDrawerNavigation()
        setupLandscapeCart()
        setupLandscapeCartButtons()
        setupOrderType()
        applyCustomizationSettings()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        shoppingCartViewModel.refreshFromCart()
        // Re-apply customization in case settings changed
        applyCustomizationSettings()
    }

    private fun applyCustomizationSettings() {
        // Product grid columns
        val columns = if (isLandscapeWithCart) {
            // In landscape, use 4 columns or the setting, whichever is appropriate
            prefsManager.productColumns.coerceIn(1, 4)
        } else {
            prefsManager.productColumns.coerceIn(1, 4)
        }
        val gridLayoutManager = binding.recyclerViewSearchProductResult.layoutManager as? GridLayoutManager
        gridLayoutManager?.spanCount = columns

        // Category rows/columns — use landscape-specific settings when in landscape
        val catColumns = if (isLandscapeWithCart) {
            prefsManager.landscapeCategoryColumns.coerceIn(3, 8)
        } else {
            prefsManager.categoryColumns.coerceIn(2, 6)
        }
        val catRows = if (isLandscapeWithCart) {
            prefsManager.landscapeCategoryRows.coerceIn(1, 2)
        } else {
            prefsManager.categoryMaxLines.coerceIn(1, 4)
        }
        val catGridLayoutManager = binding.recyclerViewCategories.layoutManager as? GridLayoutManager
        if (catGridLayoutManager != null) {
            catGridLayoutManager.spanCount = catColumns
            categoryAdapter?.let { adapter ->
                adapter.setCategories(categoryList)
                binding.recyclerViewCategories.post {
                    measureAndSetCategoryOverflow(catRows, catColumns)
                }
            }
        }

        // Show/hide categories
        if (prefsManager.showCategories) {
            binding.recyclerViewCategories.visibility = View.VISIBLE
            binding.dividerCategories?.visibility = View.VISIBLE
        } else {
            binding.recyclerViewCategories.visibility = View.GONE
            binding.dividerCategories?.visibility = View.GONE
        }

        // Show/hide bottom buttons
        binding.buttonScan?.visibility = if (prefsManager.showScanButton) View.VISIBLE else View.GONE
        binding.buttonSearchProductBottom?.visibility = if (prefsManager.showSearchButton) View.VISIBLE else View.GONE
        binding.buttonClearCart?.visibility = if (prefsManager.showClearButton) View.VISIBLE else View.GONE
        binding.buttonAddCustomer?.visibility = if (prefsManager.showCustButton) View.VISIBLE else View.GONE
        binding.buttonMoreBottom?.visibility = if (prefsManager.showMoreButton) View.VISIBLE else View.GONE

        // Show/hide order type toggle (restaurant mode only)
        binding.layoutOrderType?.visibility = if (prefsManager.isRestaurant) View.VISIBLE else View.GONE
    }

    private fun setupProductGrid() {
        productAdapter = ProductAdapter(
            shoppingCartViewModel,
            onProductAdded = { product ->
                lastAddedProduct = product
                updateLastProductDisplay()
            },
            onModifierCheck = { product, callback ->
                // Check for modifiers asynchronously
                lifecycleScope.launch(Dispatchers.IO) {
                    var mods = db.modifierDao().getModifiersByProductId(product.product_id)
                    if (mods.isEmpty() && product.productcategory_id > 0) {
                        mods = db.modifierDao().getModifiersByCategoryId(product.productcategory_id)
                    }
                    withContext(Dispatchers.Main) {
                        if (mods.isNotEmpty()) {
                            showModifierWalkthroughDialog(product, mods)
                            callback(mods) // signal that modifiers exist (adapter won't add product)
                        } else {
                            callback(emptyList()) // no modifiers, adapter adds product directly
                        }
                    }
                }
            },
            onProductImageClick = { product ->
                showProductDetailDialog(product)
            },
            onZeroPriceSet = { product, newPrice ->
                // Persist the new price and flag for review if set by non-owner staff
                lifecycleScope.launch(Dispatchers.IO) {
                    val currentUserId = prefsManager.userId
                    val currentUser = db.userDao().getUserById(currentUserId)
                    val isOwner = currentUser?.isOwner == true

                    // Calculate tax for the new price
                    val tax = sessionManager.taxCache[product.tax_id]
                    val taxAmount = if (tax != null && tax.rate > 0) {
                        newPrice * tax.rate / (100 + tax.rate)
                    } else 0.0

                    db.productDao().updateProductPrice(
                        productId = product.product_id,
                        price = newPrice,
                        taxAmount = taxAmount,
                        needsReview = if (isOwner) null else "Y",
                        setByUserId = currentUserId
                    )
                }
            }
        )
        val columns = prefsManager.productColumns.coerceIn(1, 4)
        binding.recyclerViewSearchProductResult.apply {
            layoutManager = GridLayoutManager(this@ProductActivity, columns)
            adapter = productAdapter
        }
    }

    private fun showSearchProductDialog() {
        val editText = EditText(this).apply {
            hint = "Search product name or barcode"
            setSingleLine()
            setPadding(32, 24, 32, 24)
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("Search Product")
            .setView(editText)
            .setNegativeButton("Cancel", null)
            .create()

        editText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val term = s?.toString()?.trim() ?: ""
                if (term.isNotEmpty()) {
                    productViewModel.searchProductsByTerm(term)
                } else {
                    productViewModel.allProducts.value?.let {
                        productAdapter.setProductList(it)
                    }
                }
            }
        })

        dialog.setOnDismissListener {
            // Reset to all products when dialog closes
            productViewModel.allProducts.value?.let {
                productAdapter.setProductList(it)
            }
        }

        dialog.show()
        editText.requestFocus()
        dialog.window?.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE)
    }

    private fun setupCategoryChips() {
        categoryAdapter = ProductCategoryAdapter(
            object : ProductCategoryAdapter.OnCategoryClickListener {
                override fun onCategoryClick(category: ProductCategory?) {
                    if (category == null) {
                        // "All" selected
                        productViewModel.allProducts.value?.let {
                            productAdapter.setProductList(it)
                        }
                    } else {
                        productViewModel.getProductsByCategoryId(category.productcategory_id)
                    }
                }
            }
        )
        val catColumns = if (isLandscapeWithCart) {
            prefsManager.landscapeCategoryColumns.coerceIn(3, 8)
        } else {
            prefsManager.categoryColumns.coerceIn(2, 6)
        }
        val catRows = if (isLandscapeWithCart) {
            prefsManager.landscapeCategoryRows.coerceIn(1, 2)
        } else {
            prefsManager.categoryMaxLines.coerceIn(1, 4)
        }
        binding.recyclerViewCategories.apply {
            layoutManager = GridLayoutManager(this@ProductActivity, catColumns)
            adapter = categoryAdapter
        }

        // After layout, calculate how many items fit in rows x columns
        binding.recyclerViewCategories.post {
            measureAndSetCategoryOverflow(catRows, catColumns)
        }
    }

    private fun measureAndSetCategoryOverflow(rows: Int = 2, columns: Int = 3) {
        val adapter = categoryAdapter ?: return
        val maxSlots = rows * columns
        val totalCategories = categoryList.size + 1 // +1 for "All"
        if (totalCategories > maxSlots) {
            adapter.setMaxVisible(maxSlots)
        }
    }

    private fun setupOrderType() {
        val btnDineIn = binding.btnDineIn ?: return
        val btnTakeAway = binding.btnTakeAway ?: return

        fun highlight(type: String) {
            if (type == "dine_in") {
                btnDineIn.setBackgroundResource(R.drawable.btn_rounded)
                btnDineIn.setTextColor(resources.getColor(R.color.white, null))
                btnTakeAway.setBackgroundResource(R.drawable.stroke_btn)
                btnTakeAway.setTextColor(resources.getColor(R.color.black, null))
            } else {
                btnTakeAway.setBackgroundResource(R.drawable.btn_rounded)
                btnTakeAway.setTextColor(resources.getColor(R.color.white, null))
                btnDineIn.setBackgroundResource(R.drawable.stroke_btn)
                btnDineIn.setTextColor(resources.getColor(R.color.black, null))
            }
        }

        highlight(shoppingCartViewModel.shoppingCart.orderType)

        btnDineIn.setOnClickListener {
            shoppingCartViewModel.shoppingCart.orderType = "dine_in"
            highlight("dine_in")
        }
        btnTakeAway.setOnClickListener {
            shoppingCartViewModel.shoppingCart.orderType = "take_away"
            highlight("take_away")
        }
    }

    private fun setupCartButton() {
        binding.buttonMyCart.setOnClickListener {
            val intent = Intent(this, CartActivity::class.java)
            startActivity(intent)
        }
    }

    private fun setupBottomButtons() {
        // Search bar in top bar (phone layout) — tapping opens search dialog
        binding.layoutSearchBar?.setOnClickListener {
            showSearchProductDialog()
        }

        // SCAN button (now in top bar on phone, still bottom on tablet)
        binding.buttonScan?.setOnClickListener {
            val intent = Intent(this, ScanBarcodeActivity::class.java)
            barcodeLauncher.launch(intent)
        }

        // SEARCH button (tablet/legacy layouts)
        binding.buttonSearchProductBottom?.setOnClickListener {
            showSearchProductDialog()
        }

        // CLEAR button (hidden on phone, may exist on tablet)
        binding.buttonClearCart?.setOnClickListener {
            if (shoppingCartViewModel.shoppingCart.isEmpty()) {
                Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
            } else {
                AlertDialog.Builder(this)
                    .setTitle("Clear Cart")
                    .setMessage("Remove all items from the cart?")
                    .setPositiveButton("Clear") { _, _ ->
                        shoppingCartViewModel.clearCart()
                        lastAddedProduct = null
                        updateLastProductDisplay()
                        productAdapter.notifyDataSetChanged()
                        Toast.makeText(this, "Cart cleared", Toast.LENGTH_SHORT).show()
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }

        // ADD CUST button (hidden on phone, may exist on tablet)
        binding.buttonAddCustomer?.setOnClickListener {
            showCustomerNumpadDialog()
        }

        // MORE button — shows additional actions
        binding.buttonMoreBottom?.setOnClickListener { view ->
            val popup = PopupMenu(this, view)
            popup.menuInflater.inflate(R.menu.menu_product_options, popup.menu)
            popup.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    R.id.menu_open_cash_drawer -> {
                        lifecycleScope.launch {
                            printerManager.openCashDrawer()
                            Toast.makeText(this@ProductActivity, "Cash drawer opened", Toast.LENGTH_SHORT).show()
                        }
                        true
                    }
                    else -> false
                }
            }
            popup.show()
        }

        // UNDO button - remove last added product from cart
        binding.buttonUndo?.setOnClickListener {
            lastAddedProduct?.let { product ->
                val lineNo = shoppingCartViewModel.shoppingCart.cartItems.entries
                    .lastOrNull { it.value.product.product_id == product.product_id }?.key
                if (lineNo != null) {
                    shoppingCartViewModel.removeLine(lineNo)
                }
                lastAddedProduct = null
                updateLastProductDisplay()
                productAdapter.notifyDataSetChanged()
                Toast.makeText(this, "Removed ${product.name}", Toast.LENGTH_SHORT).show()
            }
        }

        // Click on last product image/name to show product detail popup
        binding.imageLastProduct?.setOnClickListener {
            lastAddedProduct?.let { showProductDetailDialog(it) }
        }
        binding.textLastProductName?.setOnClickListener {
            lastAddedProduct?.let { showProductDetailDialog(it) }
        }
    }

    private fun showCustomerNumpadDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.add_customer_layout, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        var currentCountryCode = getCountryCode()
        var mobileLength = getMobileLengthForCode(currentCountryCode)

        val txtTitle = dialogView.findViewById<TextView>(R.id.txt_title)
        val txtCountryCode = dialogView.findViewById<TextView>(R.id.txt_country_code)
        val txtPhoneDisplay = dialogView.findViewById<TextView>(R.id.txt_phone_display)
        val txtValidation = dialogView.findViewById<TextView>(R.id.txt_validation)
        val layoutExtraDetails = dialogView.findViewById<android.widget.LinearLayout>(R.id.layout_extra_details)
        val nameInput = dialogView.findViewById<EditText>(R.id.text_customer_name)
        val emailInput = dialogView.findViewById<EditText>(R.id.text_email_address)
        val addressInput = dialogView.findViewById<EditText>(R.id.text_address)

        txtTitle.text = "Customer"
        txtCountryCode.text = currentCountryCode

        var phoneStr = ""

        // Country code picker
        val countryCodes = arrayOf(
            "+230 Mauritius", "+262 Reunion", "+261 Madagascar", "+27 South Africa",
            "+33 France", "+44 United Kingdom", "+1 United States", "+91 India"
        )
        txtCountryCode.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Select Country Code")
                .setItems(countryCodes) { _, which ->
                    val selected = countryCodes[which]
                    currentCountryCode = selected.substringBefore(" ")
                    mobileLength = getMobileLengthForCode(currentCountryCode)
                    txtCountryCode.text = currentCountryCode
                    if (phoneStr.length > mobileLength) {
                        phoneStr = phoneStr.take(mobileLength)
                        txtPhoneDisplay.text = phoneStr
                    }
                }
                .show()
        }

        val updateDisplay = {
            txtPhoneDisplay.text = phoneStr
            txtValidation.visibility = View.GONE

            // Live search: as digits are typed, search for matching customers
            if (phoneStr.length >= 3) {
                customerViewModel.searchCustomersByPhone(phoneStr) { results ->
                    if (results.size == 1 && phoneStr.length >= mobileLength) {
                        // Exact match found — auto-select
                        val customer = results[0]
                        shoppingCartViewModel.setCustomer(customer)
                        Toast.makeText(this, "Customer: ${customer.name}", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    } else if (results.isNotEmpty()) {
                        // Show match count hint
                        txtValidation.text = "${results.size} customer(s) found"
                        txtValidation.setTextColor(resources.getColor(R.color.txt_color, null))
                        txtValidation.visibility = View.VISIBLE
                    } else {
                        txtValidation.text = "New customer"
                        txtValidation.setTextColor(resources.getColor(R.color.txt_color, null))
                        txtValidation.visibility = View.VISIBLE
                    }
                }
            } else {
                txtValidation.visibility = View.GONE
            }
        }

        val appendDigit = fun(digit: String) {
            if (phoneStr.length >= mobileLength) return
            phoneStr += digit
            updateDisplay()
        }

        // Numpad buttons
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

        // Toggle extra details
        val btnDetails = dialogView.findViewById<View>(R.id.btn_details)
        btnDetails.setOnClickListener {
            layoutExtraDetails.visibility = if (layoutExtraDetails.visibility == View.GONE)
                View.VISIBLE else View.GONE
        }

        // Cancel
        dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener {
            dialog.dismiss()
        }

        // Save — find existing or create new
        dialogView.findViewById<View>(R.id.button_save).setOnClickListener {
            if (phoneStr.length != mobileLength) {
                txtValidation.text = "Mobile number must be $mobileLength digits"
                txtValidation.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            // Validate Mauritius mobile
            if (currentCountryCode == "+230" && !phoneStr.startsWith("5")) {
                txtValidation.text = "Mauritius mobile numbers start with 5"
                txtValidation.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            val fullPhone = "$currentCountryCode$phoneStr"

            // First try to find existing customer by phone
            customerViewModel.searchCustomersByPhone(phoneStr) { results ->
                if (results.isNotEmpty()) {
                    // Found — use the first match
                    val customer = results[0]
                    shoppingCartViewModel.setCustomer(customer)
                    Toast.makeText(this, "Customer: ${customer.name}", Toast.LENGTH_SHORT).show()
                    dialog.dismiss()
                } else {
                    // Not found — create new customer with phone as name
                    val name = nameInput?.text?.toString()?.trim()
                    val customerName = if (name.isNullOrEmpty()) fullPhone else name
                    val email = emailInput?.text?.toString()?.trim()
                    val address = addressInput?.text?.toString()?.trim()

                    customerViewModel.createCustomer(customerName, email, fullPhone, address, null, null)
                    dialog.dismiss()
                }
            }
        }

        // Observe create result to auto-set customer
        customerViewModel.createResult.observe(this) { result ->
            result.fold(
                onSuccess = { customer ->
                    shoppingCartViewModel.setCustomer(customer)
                    Toast.makeText(this, "Customer created: ${customer.name}", Toast.LENGTH_SHORT).show()
                },
                onFailure = { error ->
                    Toast.makeText(this, "Failed to create customer: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            )
        }

        dialog.show()
    }

    private fun updateLastProductDisplay() {
        val product = lastAddedProduct
        if (product != null) {
            binding.layoutLastProduct?.visibility = View.VISIBLE
            binding.textLastProductName?.text = product.name ?: ""
            val currency = sessionManager.account?.currency ?: ""
            binding.textLastProductPrice?.text = "$currency ${NumberUtils.formatPrice(product.sellingprice)}"
            binding.imageLastProduct?.let { imageView ->
                Glide.with(imageView.context)
                    .load(product.image)
                    .placeholder(R.drawable.ic_splash)
                    .error(R.drawable.ic_splash)
                    .into(imageView)
            }
        } else {
            binding.layoutLastProduct?.visibility = View.INVISIBLE
        }
    }

    /**
     * Modifier walkthrough dialog — shows modifier groups one at a time.
     * Groups are determined by the `description` field on modifiers.
     * Groups with mutually exclusive options (2-3 items, e.g. Salt/No Salt) use radio buttons.
     * Groups with many options use checkboxes (multi-select).
     */
    private fun showModifierWalkthroughDialog(product: Product, modifiers: List<Modifier>) {
        // Sort modifiers by restaurant best practices:
        // 1. Cooking preferences (Salt, No Salt, Well Done, Rare, etc.)
        // 2. Sauces (keep together)
        // 3. Extras (Extra Cheese, Extra Egg, etc.)
        // 4. Everything else
        val groupOrder = listOf("cooking", "preparation", "doneness", "salt", "sauce", "dressing", "topping", "extra", "add", "side", "size", "drink")

        val groups = modifiers.groupBy { it.description?.trim()?.ifEmpty { null } ?: "Options" }
            .entries.sortedBy { (groupName, _) ->
                val lower = groupName.lowercase()
                val idx = groupOrder.indexOfFirst { lower.contains(it) }
                if (idx >= 0) idx else groupOrder.size
            }
            .toList()

        if (groups.isEmpty()) {
            shoppingCartViewModel.addProduct(product)
            lastAddedProduct = product
            updateLastProductDisplay()
            return
        }

        val allSelected = mutableMapOf<Int, Modifier>()
        var currentStep = 0

        fun showStep(step: Int) {
            if (step >= groups.size) {
                // All steps done — add product to cart with selected modifiers
                val selectedMods = allSelected.values.toList()
                val modNames = selectedMods.mapNotNull { it.name }
                val modString = modNames.joinToString(", ").ifEmpty { null }
                val modExtraPrice = selectedMods.sumOf { it.sellingprice }

                shoppingCartViewModel.addProductWithPrice(product, product.sellingprice + modExtraPrice)

                val lastItem = shoppingCartViewModel.shoppingCart.cartItems.values.lastOrNull()
                if (lastItem != null) {
                    val updatedItem = lastItem.copy(modifiers = modString)
                    shoppingCartViewModel.addOrUpdateLine(updatedItem)
                }

                lastAddedProduct = product
                updateLastProductDisplay()
                return
            }

            val (groupName, groupMods) = groups[step]

            val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_modifier_walkthrough, null)
            val dialog = AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create()
            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

            val txtProductName = dialogView.findViewById<TextView>(R.id.txt_product_name)
            val txtGroupTitle = dialogView.findViewById<TextView>(R.id.txt_group_title)
            val txtStepIndicator = dialogView.findViewById<TextView>(R.id.txt_step_indicator)
            val gridOptions = dialogView.findViewById<android.widget.GridLayout>(R.id.grid_options)
            val txtExtraTotal = dialogView.findViewById<TextView>(R.id.txt_extra_total)
            val btnSkip = dialogView.findViewById<View>(R.id.button_skip)
            val btnNext = dialogView.findViewById<View>(R.id.button_next)

            txtProductName.text = product.name ?: ""
            txtGroupTitle.text = groupName
            txtStepIndicator.text = "Step ${step + 1} of ${groups.size}"

            // Determine single-choice vs multi-select
            val hasExclusiveOptions = groupMods.size <= 3 &&
                groupMods.any { it.name?.startsWith("No ") == true || it.name?.startsWith("Without ") == true }
            val isSingleChoice = hasExclusiveOptions || groupMods.size == 2

            // Use 2 columns for grid
            gridOptions.columnCount = 2

            val stepSelections = mutableSetOf<Int>()

            // Pre-populate with any previously selected from this group
            groupMods.forEach { mod ->
                if (allSelected.containsKey(mod.modifier_id)) {
                    stepSelections.add(mod.modifier_id)
                }
            }

            val currency = sessionManager.account?.currency ?: ""

            // Track all button views for updating selection state
            val buttonViews = mutableListOf<View>()
            val checkIcons = mutableListOf<android.widget.ImageView>()
            val modIds = mutableListOf<Int>()

            val updateVisualState = {
                for (i in buttonViews.indices) {
                    val selected = stepSelections.contains(modIds[i])
                    buttonViews[i].findViewById<View>(R.id.modifier_button)
                        .setBackgroundResource(if (selected) R.drawable.modifier_button_selected_bg else R.drawable.modifier_button_bg)
                    checkIcons[i].visibility = if (selected) View.VISIBLE else View.GONE
                }

                // Update extra total
                val total = allSelected.values.sumOf { it.sellingprice } +
                    groupMods.filter { stepSelections.contains(it.modifier_id) && !allSelected.containsKey(it.modifier_id) }
                        .sumOf { it.sellingprice }
                if (total > 0) {
                    txtExtraTotal.text = "Extras: +$currency ${NumberUtils.formatPrice(total)}"
                    txtExtraTotal.visibility = View.VISIBLE
                } else {
                    txtExtraTotal.visibility = View.GONE
                }
            }

            // Build button-style grid tiles
            groupMods.forEach { mod ->
                val itemView = LayoutInflater.from(this).inflate(R.layout.item_modifier_option, gridOptions, false)
                val txtName = itemView.findViewById<TextView>(R.id.text_modifier_name)
                val txtPrice = itemView.findViewById<TextView>(R.id.text_modifier_price)
                val iconCheck = itemView.findViewById<android.widget.ImageView>(R.id.icon_check)

                txtName.text = mod.name ?: ""
                txtPrice.text = if (mod.sellingprice > 0) "+$currency ${NumberUtils.formatPrice(mod.sellingprice)}" else "FREE"
                if (mod.sellingprice == 0.0) txtPrice.setTextColor(Color.parseColor("#999999"))

                buttonViews.add(itemView)
                checkIcons.add(iconCheck)
                modIds.add(mod.modifier_id)

                // Set initial visual state
                val isSelected = stepSelections.contains(mod.modifier_id)
                itemView.findViewById<View>(R.id.modifier_button)
                    .setBackgroundResource(if (isSelected) R.drawable.modifier_button_selected_bg else R.drawable.modifier_button_bg)
                iconCheck.visibility = if (isSelected) View.VISIBLE else View.GONE

                itemView.setOnClickListener {
                    if (isSingleChoice) {
                        // Deselect all, select this one
                        stepSelections.clear()
                        stepSelections.add(mod.modifier_id)
                    } else {
                        // Toggle
                        if (stepSelections.contains(mod.modifier_id)) {
                            stepSelections.remove(mod.modifier_id)
                        } else {
                            stepSelections.add(mod.modifier_id)
                        }
                    }
                    updateVisualState()
                }

                // GridLayout params: each tile takes 1 column with equal weight
                val params = android.widget.GridLayout.LayoutParams().apply {
                    width = 0
                    height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                    columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1f)
                    setMargins(0, 0, 0, 0)
                }
                itemView.layoutParams = params

                gridOptions.addView(itemView)
            }

            // Update button text for last step
            if (step == groups.size - 1) {
                (btnNext as? TextView)?.text = "ADD TO CART"
            }

            btnSkip.setOnClickListener {
                groupMods.forEach { allSelected.remove(it.modifier_id) }
                dialog.dismiss()
                currentStep = step + 1
                showStep(currentStep)
            }

            btnNext.setOnClickListener {
                groupMods.forEach { mod ->
                    if (stepSelections.contains(mod.modifier_id)) {
                        allSelected[mod.modifier_id] = mod
                    } else {
                        allSelected.remove(mod.modifier_id)
                    }
                }
                dialog.dismiss()
                currentStep = step + 1
                showStep(currentStep)
            }

            dialog.show()
        }

        showStep(0)
    }

    /**
     * Product detail popup — shows bigger image and all product details.
     */
    private fun showProductDetailDialog(product: Product) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_product_detail, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val imageProduct = dialogView.findViewById<android.widget.ImageView>(R.id.image_product)
        val txtName = dialogView.findViewById<TextView>(R.id.txt_product_name)
        val txtPrice = dialogView.findViewById<TextView>(R.id.txt_product_price)
        val txtDescription = dialogView.findViewById<TextView>(R.id.txt_product_description)
        val txtUpc = dialogView.findViewById<TextView>(R.id.txt_product_upc)
        val txtCategory = dialogView.findViewById<TextView>(R.id.txt_product_category)
        val btnClose = dialogView.findViewById<View>(R.id.button_close)

        // Load image
        Glide.with(this)
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

    private fun updateMyCartButtonText(itemCount: Int) {
        val currency = sessionManager.account?.currency ?: ""
        val grandTotal = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
        // Cart button: show amount on the button text view
        val cartLabel = if (itemCount > 0) {
            "MY CART  $currency ${NumberUtils.formatPrice(grandTotal)}"
        } else {
            "MY CART"
        }
        // buttonMyCart may be MaterialButton (phone) or LinearLayout (tablet) across configs
        (binding.buttonMyCart as? android.widget.TextView)?.text = cartLabel
        binding.buttonMyCartText?.let { it.text = cartLabel }
        // Top bar: on phones textCartSummary is the title, on tablets it's the qty counter
        // Only update if the layout uses it as a quantity counter (tablet layouts)
        if (resources.configuration.smallestScreenWidthDp >= 600) {
            binding.textCartSummary?.text = "${itemCount}X"
        }

        // Floating badge overlay on cart button
        binding.cartBadge?.let { badge ->
            if (itemCount > 0) {
                badge.text = itemCount.toString()
                badge.visibility = View.VISIBLE
            } else {
                badge.visibility = View.GONE
            }
        }
    }

    private fun setupProductDrawerNavigation() {
        binding.drawer.setOnClickListener {
            openDrawer()
        }
        expandTouchArea(binding.drawer, extraPaddingDp = 20)

        // Use the base class setup for standard nav items
        setupDrawerNavigation()

        // Override specific items that need custom behavior in ProductActivity
        val navView = binding.nav
        navView.findViewById<View>(R.id.nav_close_till)?.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            showCloseTillConfirmation()
        }
        navView.findViewById<View>(R.id.nav_get_update)?.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            Toast.makeText(this, "Syncing data...", Toast.LENGTH_SHORT).show()
            syncViewModel.pullData()
        }
        navView.findViewById<View>(R.id.nav_logout)?.setOnClickListener {
            drawerLayout.closeDrawer(GravityCompat.START)
            performLogout()
        }
    }

    private fun handleBarcodeScan(barcode: String) {
        if (barcode.startsWith("2") && barcode.length >= 13) {
            // Price/weight-encoded barcode
            val productCode = barcode.substring(0, 7)
            val encodedValue = barcode.substring(7, 13)
            val numericValue = encodedValue.toDoubleOrNull() ?: 0.0

            productViewModel.searchProductByUpc(productCode,
                onFound = { product ->
                    if (product.barcodetype == "weight") {
                        val weight = numericValue / 1000.0
                        shoppingCartViewModel.addProductWithQty(product, weight)
                        productAdapter.notifyDataSetChanged()
                        Toast.makeText(
                            this,
                            "${product.name} added (${NumberUtils.formatQuantity(weight)} kg)",
                            Toast.LENGTH_SHORT
                        ).show()
                    } else {
                        // Price-encoded
                        val price = numericValue / 100.0
                        shoppingCartViewModel.addProductWithPrice(product, price)
                        productAdapter.notifyDataSetChanged()
                        Toast.makeText(
                            this,
                            "${product.name} added (${NumberUtils.formatPrice(price)})",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                },
                onNotFound = {
                    // Try full barcode lookup
                    lookupFullBarcode(barcode)
                }
            )
        } else {
            lookupFullBarcode(barcode)
        }
    }

    private fun lookupFullBarcode(barcode: String) {
        productViewModel.searchProductByUpc(barcode,
            onFound = { product ->
                shoppingCartViewModel.addProduct(product)
                productAdapter.notifyDataSetChanged()
                Toast.makeText(this, "${product.name} added to cart", Toast.LENGTH_SHORT).show()
            },
            onNotFound = {
                Toast.makeText(this, "Product not found for barcode: $barcode", Toast.LENGTH_SHORT)
                    .show()
            }
        )
    }

    private fun showCloseTillConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Close Till")
            .setMessage("Are you sure you want to close the till?")
            .setPositiveButton("Yes") { _, _ ->
                val intent = Intent(this, CloseTillActivity::class.java)
                startActivity(intent)
            }
            .setNegativeButton("No", null)
            .show()
    }

    private fun performLogout() {
        sessionManager.resetSession()
        val intent = Intent(this, SelectUserLoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun setupLandscapeCart() {
        val cartRecyclerView = binding.recyclerViewCartItems ?: return
        cartAdapter = CartProductAdapter(
            shoppingCartViewModel,
            object : CartProductAdapter.OnCartItemClickListener {
                override fun onCartItemClick(cartItem: CartItem) {
                    // Show edit dialog popup instead of navigating to CartActivity
                    showEditCartItemDialog(cartItem)
                }
            },
            onProductImageClick = { cartItem ->
                showProductDetailDialog(cartItem.product)
            }
        )
        cartRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@ProductActivity)
            adapter = cartAdapter
        }

        // Hide the "My Cart" button in landscape since cart is visible
        binding.buttonMyCart.visibility = View.GONE
    }

    /**
     * Shows the cart item edit dialog inline (popup) — used in landscape mode
     * so the left pane doesn't disappear.
     */
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
        val spinnerDiscountCode = dialogView.findViewById<com.google.android.material.textfield.MaterialAutoCompleteTextView>(R.id.spinner_discount_code)
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
                val adapter = ArrayAdapter(this@ProductActivity, android.R.layout.simple_dropdown_item_1line, names)
                spinnerDiscountCode.setAdapter(adapter)

                val currentIndex = discountCodes.indexOfFirst { it.discountcode_id == selectedDiscountCodeId }
                if (currentIndex >= 0) {
                    spinnerDiscountCode.setText(names[currentIndex + 1], false)
                }

                spinnerDiscountCode.setOnItemClickListener { _, _, position, _ ->
                    if (position == 0) {
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

        // Parse existing modifiers
        cartItem.modifiers?.split(", ")?.forEach { /* pre-parse names if needed */ }

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

                    // Pre-select modifiers from the cart item
                    cartItem.modifiers?.split(", ")?.forEach { modName ->
                        val mod = modifiersList.find { it.name == modName.trim() }
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


    private fun setupLandscapeCartButtons() {
        // Only set up if landscape buttons exist
        val holdOrderBtn = binding.buttonHoldOrder ?: return
        val couponBtn = binding.buttonCoupon ?: return
        val payOrderBtn = binding.buttonPayOrder ?: return
        val moreOptionsBtn = binding.buttonMoreOptions ?: return

        holdOrderBtn.setOnClickListener {
            holdOrder()
        }

        couponBtn.setOnClickListener {
            showCouponDialog()
        }

        payOrderBtn.setOnClickListener {
            // Navigate to CartActivity for the full payment flow
            val intent = Intent(this, CartActivity::class.java)
            startActivity(intent)
        }

        moreOptionsBtn.setOnClickListener { view ->
            val popup = PopupMenu(this, view)
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
                                    productAdapter.notifyDataSetChanged()
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
    }

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
                val cart = shoppingCartViewModel.shoppingCart
                val terminalId = prefsManager.terminalId
                val storeId = prefsManager.storeId
                val tillId = sessionManager.till?.tillId ?: 0

                val jsonArray = JSONArray()
                for (cartItem in cart.cartItems.values) {
                    val itemJson = JSONObject().apply {
                        put("product_id", cartItem.product.product_id)
                        put("name", cartItem.product.name)
                        put("qty", cartItem.qty)
                        put("price", cartItem.priceEntered)
                        put("sellingprice", cartItem.product.sellingprice)
                        put("note", cartItem.note ?: "")
                    }
                    jsonArray.put(itemJson)
                }

                val holdJson = JSONObject().apply {
                    put("items", jsonArray)
                    put("note", cart.note ?: "")
                    put("orderType", cart.orderType)
                    put("tipsAmount", cart.tipsAmount)
                    put("tipsPercentage", cart.tipsPercentage)
                    put("grandtotal", cart.grandTotalAmount)
                }

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
                        productAdapter.notifyDataSetChanged()
                        Toast.makeText(this@ProductActivity, "Order held: $description", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

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

    private fun showAddNoteDialog() {
        val editText = EditText(this).apply {
            hint = "Enter order note"
            setText(shoppingCartViewModel.shoppingCart.note ?: "")
        }

        AlertDialog.Builder(this)
            .setTitle("Order Note")
            .setView(editText)
            .setPositiveButton("Save") { _, _ ->
                val note = editText.text.toString().trim()
                shoppingCartViewModel.shoppingCart.note = note
                Toast.makeText(this, if (note.isNotEmpty()) "Note saved" else "Note cleared", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

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

    private fun showDiscountOnTotalDialog() {
        val cart = shoppingCartViewModel.shoppingCart

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_discount, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val editPercentage = dialogView.findViewById<EditText>(R.id.edit_percentage)
        val editAmount = dialogView.findViewById<EditText>(R.id.edit_amount)

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

    private fun updateProductEmptyState(products: List<Product>) {
        val emptyLayout = findViewById<View>(R.id.empty_state_products)
        val progressBar = binding.progressLoadingProducts
        progressBar.visibility = View.GONE
        if (products.isEmpty()) {
            binding.recyclerViewSearchProductResult.visibility = View.GONE
            emptyLayout?.visibility = View.VISIBLE
            // Customize empty state text
            emptyLayout?.findViewById<TextView>(R.id.text_empty_title)?.text = "No products found"
            emptyLayout?.findViewById<TextView>(R.id.text_empty_subtitle)?.text = "Add products from your admin portal"
        } else {
            binding.recyclerViewSearchProductResult.visibility = View.VISIBLE
            emptyLayout?.visibility = View.GONE
        }
    }

    private fun observeViewModel() {
        productViewModel.allProducts.observe(this) { products ->
            productAdapter.setProductList(products)
            updateProductEmptyState(products)
        }

        productViewModel.searchResults.observe(this) { products ->
            productAdapter.setProductList(products)
            updateProductEmptyState(products)
        }

        productViewModel.productsByCategory.observe(this) { products ->
            productAdapter.setProductList(products)
            updateProductEmptyState(products)
        }

        productViewModel.productCategories.observe(this) { categories ->
            categoryList = categories
            categoryAdapter?.setCategories(categories)
            // Re-measure category overflow after data loads
            binding.recyclerViewCategories.post {
                measureAndSetCategoryOverflow()
            }
        }

        // Cart items for landscape mode
        shoppingCartViewModel.cartItems.observe(this) { items ->
            cartAdapter?.setProductList(items)
        }

        shoppingCartViewModel.totalQty.observe(this) { qty ->
            val itemCount = qty.toInt()
            updateMyCartButtonText(itemCount)
            // Update landscape cart title and total label
            binding.textViewCartTitle?.text = "Cart ($itemCount)"
            binding.textViewTotalLabel?.text = "Total (x$itemCount)"
            // Refresh product grid so quantity badges update (e.g. after cart clear)
            productAdapter.notifyDataSetChanged()
        }

        shoppingCartViewModel.grandTotalAmount.observe(this) { _ ->
            val itemCount = shoppingCartViewModel.totalQty.value?.toInt() ?: 0
            updateMyCartButtonText(itemCount)
        }

        shoppingCartViewModel.subTotalAmount.observe(this) { amount ->
            binding.textViewSubtotal?.text = NumberUtils.formatPrice(amount ?: 0.0)
        }

        shoppingCartViewModel.taxTotalAmount.observe(this) { amount ->
            binding.textViewTaxTotal?.text = NumberUtils.formatPrice(amount ?: 0.0)
        }

        shoppingCartViewModel.grandTotalAmount.observe(this) { amount ->
            val currency = sessionManager.account?.currency ?: ""
            binding.textViewGrandTotal?.text = "$currency${NumberUtils.formatPrice(amount ?: 0.0)}"
        }

        shoppingCartViewModel.customer.observe(this) { customer ->
            if (customer != null) {
                val name = customer.name ?: ""
                val phone = customer.phone1 ?: ""
                binding.textViewCustomerName.text = when {
                    name.isEmpty() || name == phone -> phone
                    phone.isNotEmpty() -> "$name - $phone"
                    else -> name
                }
            } else {
                binding.textViewCustomerName.text = ""
            }
        }

        syncViewModel.syncResult.observe(this) { result ->
            result.fold(
                onSuccess = {
                    Toast.makeText(this, "Data sync complete", Toast.LENGTH_SHORT).show()
                },
                onFailure = { error ->
                    Toast.makeText(this, "Sync failed: ${error.message}", Toast.LENGTH_LONG).show()
                }
            )
        }
    }

}
