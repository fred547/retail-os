package com.posterita.pos.android.util

import android.content.Context
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Seeds the database with demo data so new users can start using
 * the POS immediately without creating an account.
 */
@Singleton
class DemoDataSeeder @Inject constructor(
    @ApplicationContext private val context: Context,
    private val prefsManager: SharedPreferencesManager,
    private val accountRegistry: LocalAccountRegistry
) {
    companion object {
        const val DEMO_ACCOUNT_ID = "demo_account"
        const val DEMO_STORE_NAME = "Demo Store"
        const val DEMO_EMAIL = "demo@posterita.com"
        const val DEMO_PIN = "000000"
        private const val PREF_DEMO_LAST_SEEDED_AT = "demo_last_seeded_at"
        private const val DEMO_RESET_INTERVAL_MS = 24L * 60L * 60L * 1000L

        /** Check if the current account is a demo account. */
        fun isDemoAccount(accountId: String): Boolean = accountId == DEMO_ACCOUNT_ID
    }

    fun isResetDue(nowMs: Long = System.currentTimeMillis()): Boolean {
        val lastSeededAt = prefsManager.getString(PREF_DEMO_LAST_SEEDED_AT).toLongOrNull() ?: return true
        val demoDbExists = context.getDatabasePath(demoDbName()).exists()
        return !demoDbExists || nowMs - lastSeededAt >= DEMO_RESET_INTERVAL_MS
    }

    suspend fun activateDemoAccount(forceReset: Boolean = false): Boolean {
        val didReset = forceReset || isResetDue()

        // IMPORTANT: Set accountId FIRST so the correct per-account database is used.
        // The database name is based on accountId (e.g., POSTERITA_LITE_DB_demo_account).
        // Use sync writes since the process will restart after seeding.
        prefsManager.setAccountIdSync(DEMO_ACCOUNT_ID)

        if (!didReset) {
            prefsManager.setStoreIdSync(1)
            prefsManager.setStoreNameSync(DEMO_STORE_NAME)
            prefsManager.setTerminalIdSync(1)
            prefsManager.setTerminalNameSync("POS 1")
            prefsManager.setStringSync("setup_mode", "standalone")
            prefsManager.setStringSync("setup_completed", "true")
            prefsManager.setStringSync("is_demo_account", "true")
            prefsManager.setOwnerPhoneSync("")
            accountRegistry.addAccount(
                id = DEMO_ACCOUNT_ID,
                name = DEMO_STORE_NAME,
                storeName = DEMO_STORE_NAME,
                ownerEmail = "demo@posterita.com",
                ownerPhone = "",
                type = "demo",
                status = "testing"
            )
            return false
        }

        resetDemoDatabase()

        // Reset the singleton DB instance so we get a fresh one with the correct accountId
        AppDatabase.resetInstance()
        val db = AppDatabase.getInstance(context, DEMO_ACCOUNT_ID)

        // Create demo account entity (required by TillViewModel.ensureSessionLoaded)
        db.accountDao().insertAccounts(listOf(
            Account(
                account_id = DEMO_ACCOUNT_ID,
                businessname = DEMO_STORE_NAME,
                address1 = "123 Demo Street",
                isactive = "Y",
                currency = "USD"
            )
        ))

        // Create demo store
        db.storeDao().insertStore(
            Store(storeId = 1, name = DEMO_STORE_NAME, address = "123 Demo Street", isactive = "Y")
        )

        // Create demo terminal
        db.terminalDao().insertTerminal(
            Terminal(terminalId = 1, name = "POS 1", store_id = 1, prefix = "DEMO", isactive = "Y")
        )

        // Create demo owner (email: demo@posterita.com, password: 000000)
        db.userDao().insertUser(
            User(user_id = 1, firstname = "Demo", lastname = "Owner",
                username = DEMO_EMAIL, pin = DEMO_PIN, password = DEMO_PIN,
                isadmin = "Y", isactive = "Y", issalesrep = "Y",
                role = User.ROLE_OWNER, email = DEMO_EMAIL, phone1 = "+23058231102")
        )

        // Create demo tax
        db.taxDao().insertTax(Tax(tax_id = 1, name = "VAT 15%", rate = 15.0, taxcode = "VAT15", isactive = "Y"))
        db.taxDao().insertTax(Tax(tax_id = 2, name = "No Tax", rate = 0.0, taxcode = "NONE", isactive = "Y"))

        // Create demo categories
        db.productCategoryDao().insertProductCategory(
            ProductCategory(productcategory_id = 1, name = "Food", isactive = "Y", position = 1))
        db.productCategoryDao().insertProductCategory(
            ProductCategory(productcategory_id = 2, name = "Drinks", isactive = "Y", position = 2))
        db.productCategoryDao().insertProductCategory(
            ProductCategory(productcategory_id = 3, name = "Snacks", isactive = "Y", position = 3))
        db.productCategoryDao().insertProductCategory(
            ProductCategory(productcategory_id = 4, name = "Desserts", isactive = "Y", position = 4))

        // Create demo products with images and varied behaviors:
        // - Standard products (tap to add)
        // - iseditable = "Y" → cashier can edit price
        // - isvariableitem = "Y" → prompts for quantity
        // - ismodifier = "Y" → has add-on options (e.g. toppings)
        // - iskitchenitem = "Y" → prints to kitchen printer
        val products = listOf(
            // ── Food ──
            Product(product_id = 1, name = "Burger", sellingprice = 8.99, costprice = 3.50,
                productcategory_id = 1, tax_id = 1, taxamount = 1.35, isactive = "Y",
                ismodifier = "Y", iskitchenitem = "Y",
                image = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop"),
            Product(product_id = 2, name = "Pizza Slice", sellingprice = 4.50, costprice = 1.80,
                productcategory_id = 1, tax_id = 1, taxamount = 0.68, isactive = "Y",
                iskitchenitem = "Y",
                image = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop"),
            Product(product_id = 3, name = "Chicken Wrap", sellingprice = 7.50, costprice = 3.00,
                productcategory_id = 1, tax_id = 1, taxamount = 1.13, isactive = "Y",
                iskitchenitem = "Y",
                image = "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop"),
            Product(product_id = 4, name = "Salad Bowl", sellingprice = 6.99, costprice = 2.50,
                productcategory_id = 1, tax_id = 1, taxamount = 1.05, isactive = "Y",
                iseditable = "Y", iskitchenitem = "Y",
                image = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop"),
            Product(product_id = 5, name = "Sandwich", sellingprice = 5.50, costprice = 2.20,
                productcategory_id = 1, tax_id = 1, taxamount = 0.83, isactive = "Y",
                image = "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop"),

            // ── Drinks ──
            Product(product_id = 6, name = "Coffee", sellingprice = 3.50, costprice = 0.80,
                productcategory_id = 2, tax_id = 1, taxamount = 0.53, isactive = "Y",
                ismodifier = "Y",
                image = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop"),
            Product(product_id = 7, name = "Orange Juice", sellingprice = 4.00, costprice = 1.20,
                productcategory_id = 2, tax_id = 1, taxamount = 0.60, isactive = "Y",
                image = "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop"),
            Product(product_id = 8, name = "Water", sellingprice = 1.50, costprice = 0.30,
                productcategory_id = 2, tax_id = 2, taxamount = 0.0, isactive = "Y",
                image = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop"),
            Product(product_id = 9, name = "Soda", sellingprice = 2.50, costprice = 0.60,
                productcategory_id = 2, tax_id = 1, taxamount = 0.38, isactive = "Y",
                image = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop"),
            Product(product_id = 10, name = "Smoothie", sellingprice = 5.99, costprice = 2.00,
                productcategory_id = 2, tax_id = 1, taxamount = 0.90, isactive = "Y",
                isvariableitem = "Y",
                image = "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200&h=200&fit=crop"),

            // ── Snacks ──
            Product(product_id = 11, name = "Chips", sellingprice = 2.00, costprice = 0.80,
                productcategory_id = 3, tax_id = 1, taxamount = 0.30, isactive = "Y",
                image = "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop"),
            Product(product_id = 12, name = "Cookie", sellingprice = 1.50, costprice = 0.40,
                productcategory_id = 3, tax_id = 1, taxamount = 0.23, isactive = "Y",
                image = "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200&h=200&fit=crop"),
            Product(product_id = 13, name = "Energy Bar", sellingprice = 3.00, costprice = 1.20,
                productcategory_id = 3, tax_id = 1, taxamount = 0.45, isactive = "Y",
                upc = "4006381333931",
                image = "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=200&h=200&fit=crop"),

            // ── Desserts ──
            Product(product_id = 14, name = "Ice Cream", sellingprice = 4.50, costprice = 1.50,
                productcategory_id = 4, tax_id = 1, taxamount = 0.68, isactive = "Y",
                isvariableitem = "Y", iseditable = "Y",
                image = "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop"),
            Product(product_id = 15, name = "Chocolate Cake", sellingprice = 5.99, costprice = 2.50,
                productcategory_id = 4, tax_id = 1, taxamount = 0.90, isactive = "Y",
                image = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop")
        )
        db.productDao().insertProducts(products)

        // Create demo modifiers (add-on options for burger and coffee)
        val modifiers = listOf(
            Modifier(modifier_id = 1, name = "Extra Cheese", sellingprice = 1.50,
                product_id = 1, isactive = "Y"),
            Modifier(modifier_id = 2, name = "Bacon", sellingprice = 2.00,
                product_id = 1, isactive = "Y"),
            Modifier(modifier_id = 3, name = "Jalapeños", sellingprice = 0.75,
                product_id = 1, isactive = "Y"),
            Modifier(modifier_id = 4, name = "Oat Milk", sellingprice = 0.50,
                product_id = 6, isactive = "Y"),
            Modifier(modifier_id = 5, name = "Extra Shot", sellingprice = 1.00,
                product_id = 6, isactive = "Y"),
            Modifier(modifier_id = 6, name = "Vanilla Syrup", sellingprice = 0.75,
                product_id = 6, isactive = "Y")
        )
        db.modifierDao().insertModifiers(modifiers)

        // Set remaining prefs — use sync writes since process will restart
        prefsManager.setStoreIdSync(1)
        prefsManager.setStoreNameSync(DEMO_STORE_NAME)
        prefsManager.setTerminalIdSync(1)
        prefsManager.setTerminalNameSync("POS 1")
        prefsManager.setStringSync("setup_mode", "standalone")
        prefsManager.setStringSync("setup_completed", "true")
        prefsManager.setStringSync("is_demo_account", "true")
        prefsManager.setStringSync(PREF_DEMO_LAST_SEEDED_AT, System.currentTimeMillis().toString())
        prefsManager.setOwnerPhoneSync("")

        // Register in multi-account registry
        accountRegistry.addAccount(
            id = DEMO_ACCOUNT_ID,
            name = DEMO_STORE_NAME,
            storeName = DEMO_STORE_NAME,
            ownerEmail = "demo@posterita.com",
            ownerPhone = "",
            type = "demo",
            status = "testing"
        )
        return didReset
    }

    suspend fun seedDemoData() {
        activateDemoAccount(forceReset = true)
    }

    /**
     * Seeds demo products into an already-created database so the owner
     * has something to test immediately. Uses the selected category to
     * pick appropriate sample products. Called during onboarding before
     * the AI import runs in the background.
     */
    suspend fun seedDemoProducts(db: AppDatabase, category: String) {
        // Tax
        db.taxDao().insertTax(Tax(tax_id = 1, name = "VAT 15%", rate = 15.0, taxcode = "VAT15", isactive = "Y"))
        db.taxDao().insertTax(Tax(tax_id = 2, name = "No Tax", rate = 0.0, taxcode = "NONE", isactive = "Y"))

        val isFood = category.contains("Food", ignoreCase = true) ||
                category.contains("Beverage", ignoreCase = true)

        if (isFood) {
            db.productCategoryDao().insertProductCategory(
                ProductCategory(productcategory_id = 1, name = "Food", isactive = "Y", position = 1))
            db.productCategoryDao().insertProductCategory(
                ProductCategory(productcategory_id = 2, name = "Drinks", isactive = "Y", position = 2))
            db.productDao().insertProducts(listOf(
                Product(product_id = 1, name = "Burger", sellingprice = 8.99, costprice = 3.50,
                    productcategory_id = 1, tax_id = 1, taxamount = 1.35, isactive = "Y",
                    iskitchenitem = "Y"),
                Product(product_id = 2, name = "Pizza Slice", sellingprice = 4.50, costprice = 1.80,
                    productcategory_id = 1, tax_id = 1, taxamount = 0.68, isactive = "Y",
                    iskitchenitem = "Y"),
                Product(product_id = 3, name = "Salad Bowl", sellingprice = 6.99, costprice = 2.50,
                    productcategory_id = 1, tax_id = 1, taxamount = 1.05, isactive = "Y",
                    iskitchenitem = "Y"),
                Product(product_id = 4, name = "Coffee", sellingprice = 3.50, costprice = 0.80,
                    productcategory_id = 2, tax_id = 1, taxamount = 0.53, isactive = "Y"),
                Product(product_id = 5, name = "Water", sellingprice = 1.50, costprice = 0.30,
                    productcategory_id = 2, tax_id = 2, taxamount = 0.0, isactive = "Y")
            ))
        } else {
            // Generic retail demo products
            db.productCategoryDao().insertProductCategory(
                ProductCategory(productcategory_id = 1, name = "Sample Products", isactive = "Y", position = 1))
            db.productCategoryDao().insertProductCategory(
                ProductCategory(productcategory_id = 2, name = "Accessories", isactive = "Y", position = 2))
            db.productDao().insertProducts(listOf(
                Product(product_id = 1, name = "Sample Item A", sellingprice = 29.99, costprice = 15.00,
                    productcategory_id = 1, tax_id = 1, taxamount = 4.50, isactive = "Y"),
                Product(product_id = 2, name = "Sample Item B", sellingprice = 49.99, costprice = 25.00,
                    productcategory_id = 1, tax_id = 1, taxamount = 7.50, isactive = "Y"),
                Product(product_id = 3, name = "Sample Item C", sellingprice = 19.99, costprice = 10.00,
                    productcategory_id = 1, tax_id = 1, taxamount = 3.00, isactive = "Y"),
                Product(product_id = 4, name = "Accessory 1", sellingprice = 9.99, costprice = 4.00,
                    productcategory_id = 2, tax_id = 1, taxamount = 1.50, isactive = "Y"),
                Product(product_id = 5, name = "Accessory 2", sellingprice = 14.99, costprice = 6.00,
                    productcategory_id = 2, tax_id = 1, taxamount = 2.25, isactive = "Y")
            ))
        }
    }

    private fun resetDemoDatabase() {
        AppDatabase.resetInstance()
        context.deleteDatabase(demoDbName())
        val dbPath = context.getDatabasePath(demoDbName()).absolutePath
        java.io.File("${dbPath}-wal").delete()
        java.io.File("${dbPath}-shm").delete()
        accountRegistry.removeAccount(DEMO_ACCOUNT_ID)
    }

    private fun demoDbName(): String = "${Constants.DATABASE_NAME}_$DEMO_ACCOUNT_ID"
}
