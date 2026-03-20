package com.posterita.pos.android.ui.activity

import android.graphics.Typeface
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.TypedValue
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityHelpBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class HelpActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityHelpBinding

    data class HelpSection(
        val title: String,
        val items: List<HelpItem>
    )

    data class HelpItem(
        val question: String,
        val answer: String
    )

    private val helpSections = listOf(
        HelpSection("Getting Started", listOf(
            HelpItem(
                "How do I start using the POS?",
                "When you first open the app, tap \"Try Demo\" to explore with sample products. No account setup needed — you can start selling immediately. The demo comes with 15 sample products across 4 categories."
            ),
            HelpItem(
                "How do I create my own store?",
                "From the Welcome screen, tap \"Set Up Your Own Store\" and follow the 5-step wizard:\n\n1. Welcome — Choose demo or custom setup\n2. Business Info — Enter store name, address, PIN\n3. Business Type — Select retail or restaurant\n4. Printer — Configure receipt printer (optional)\n5. Complete — You're ready to sell!"
            ),
            HelpItem(
                "What is the demo PIN?",
                "The demo account PIN is 000000 (six zeros). You can create your own account with a custom 6-digit PIN."
            ),
            HelpItem(
                "Can I run multiple stores on one device?",
                "Yes! Tap \"Add New Account\" on the login screen to set up additional stores. The app remembers your last used account and switches between them. Admins can disable account switching in Admin Settings."
            )
        )),

        HelpSection("Selling", listOf(
            HelpItem(
                "How do I add products to the cart?",
                "Tap any product in the grid to add it. The quantity badge on the product shows how many are in the cart. Use the category tabs (All, Food, Drinks, etc.) to filter products."
            ),
            HelpItem(
                "How do I change a product's quantity?",
                "In the cart, use the + and - buttons next to each item. Some products with variable quantity (like smoothies) will prompt you for the amount when tapped."
            ),
            HelpItem(
                "How do I edit a product's price?",
                "Products marked as editable (like Salad Bowl) will show a price dialog when tapped. You can enter a custom price for that sale."
            ),
            HelpItem(
                "What are modifiers?",
                "Modifiers are add-on options for products. For example, a Burger can have Extra Cheese, Bacon, or Jalapeños. When you tap a product with modifiers, a selection dialog appears."
            ),
            HelpItem(
                "How do I apply a discount?",
                "In the cart screen, tap \"DISCOUNT\" or the \"MORE\" button and select \"Discount Total\". You can apply a percentage or fixed amount discount."
            ),
            HelpItem(
                "How do I hold an order?",
                "Tap \"HOLD\" in the cart screen. The order is saved and can be recalled later from the \"Hold Orders\" section in the menu."
            )
        )),

        HelpSection("Payments", listOf(
            HelpItem(
                "What payment methods are supported?",
                "The POS supports:\n• Cash — Enter amount tendered, change is calculated\n• Check — Record check number\n• Mixed — Split payment across multiple methods"
            ),
            HelpItem(
                "How do I process a cash payment?",
                "Tap \"PAY\" in the cart, select \"Cash\", enter the amount tendered on the number pad, then tap \"Pay\". The change due is calculated automatically."
            ),
            HelpItem(
                "How do I add tips?",
                "In the cart screen, tap \"MORE\" and select \"Add Tips\". Enter the tip amount — it will be added to the order total."
            )
        )),

        HelpSection("Opening & Closing Till", listOf(
            HelpItem(
                "What is the till?",
                "The till tracks your cash drawer. You open it at the start of your shift with a starting amount, and close it at the end to reconcile."
            ),
            HelpItem(
                "How do I open the till?",
                "The first time you tap the cart or try to make a payment, you'll be prompted to open the till. Enter your opening cash amount using the number pad and tap \"Open Till\"."
            ),
            HelpItem(
                "How do I close the till?",
                "Open the side menu (☰) and tap \"Close Till\". You'll see a summary of sales, then confirm to close. This locks the register until a new till is opened."
            )
        )),

        HelpSection("Orders & History", listOf(
            HelpItem(
                "How do I view past orders?",
                "Open the side menu (☰) and tap \"Orders\". All completed orders are listed by date. Tap an order to view its details."
            ),
            HelpItem(
                "Can I search for a specific order?",
                "Yes! On the Orders screen, use the search bar to find orders by order number, customer name, or date. Use the filter chips to narrow results."
            ),
            HelpItem(
                "Can I void an order?",
                "Yes. Open the order details and tap the void/cancel option. Only admins can void completed orders."
            )
        )),

        HelpSection("Customers", listOf(
            HelpItem(
                "How do I assign a customer to an order?",
                "Tap \"CUST\" at the bottom of the product screen or in the cart. Search for an existing customer or create a new one."
            ),
            HelpItem(
                "What is a walk-in customer?",
                "If no customer is selected, the order defaults to \"Walk-in Customer\". This is for quick sales where customer info isn't needed."
            )
        )),

        HelpSection("Management", listOf(
            HelpItem(
                "How do I manage products?",
                "Open the side menu → Admin Settings → Manage Products. You can add, edit, or remove products with name, price, category, tax, and image."
            ),
            HelpItem(
                "How do I manage categories?",
                "Admin Settings → Manage Categories. Create categories to organize your products (e.g., Food, Drinks, Desserts)."
            ),
            HelpItem(
                "How do I set up taxes?",
                "Admin Settings → Manage Tax. Create tax rates (e.g., VAT 15%) and assign them to products."
            ),
            HelpItem(
                "How do I add staff users?",
                "Admin Settings → Manage Users. Create user accounts with a 6-digit PIN. You can set admin privileges and sales rep status."
            ),
            HelpItem(
                "How do I configure store details?",
                "Admin Settings → Manage Store. Update your store name, address, phone, and other business details."
            )
        )),

        HelpSection("Settings & Customization", listOf(
            HelpItem(
                "What can I customize?",
                "Open Settings from the side menu to configure:\n• Product grid columns\n• Category display rows\n• Printer setup (receipt & kitchen)\n• Restaurant mode (tables, kitchen orders)\n• Barcode scanner"
            ),
            HelpItem(
                "What is Restaurant Mode?",
                "Enable this in Settings to unlock table management, kitchen orders, and kitchen printing. The menu will show additional options for table-based service."
            )
        )),

        HelpSection("About Posterita POS Android", listOf(
            HelpItem(
                "What is Posterita POS Android?",
                "Posterita POS Android is a standalone point-of-sale app that runs entirely on your Android device. No internet connection or server required — all data is stored locally on your device."
            ),
            HelpItem(
                "Is internet required?",
                "No. The POS works fully offline. Cloud sync is an optional feature for businesses that need multi-device data synchronization."
            ),
            HelpItem(
                "How is my data stored?",
                "All data (products, orders, customers) is stored in a local database on your device. Each business account has its own isolated database for security."
            )
        ))
    )

    override fun getDrawerHighlightId(): Int = R.id.nav_help

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_help)
        binding = ActivityHelpBinding.bind(drawerLayout.getChildAt(0))

        // Set up toolbar with hamburger menu
        binding.toolbar.setNavigationIcon(R.drawable.ic_drawer)
        binding.toolbar.setNavigationOnClickListener { openDrawer() }
        expandToolbarNavigationTouchTarget(binding.toolbar, extraPaddingDp = 20)

        setupDrawerNavigation()
        renderHelpContent(helpSections)
        setupSearch()
    }

    private fun setupSearch() {
        binding.editSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString()?.trim()?.lowercase() ?: ""
                if (query.isEmpty()) {
                    renderHelpContent(helpSections)
                } else {
                    val filtered = helpSections.mapNotNull { section ->
                        val matchingItems = section.items.filter { item ->
                            item.question.lowercase().contains(query) ||
                                    item.answer.lowercase().contains(query)
                        }
                        if (matchingItems.isNotEmpty()) {
                            section.copy(items = matchingItems)
                        } else null
                    }
                    renderHelpContent(filtered)
                }
            }
        })
    }

    private fun renderHelpContent(sections: List<HelpSection>) {
        val container = binding.helpContent
        container.removeAllViews()

        if (sections.isEmpty()) {
            val noResult = TextView(this).apply {
                text = "No help topics found"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                setTextColor(ContextCompat.getColor(context, R.color.black))
                setPadding(0, 32, 0, 32)
            }
            container.addView(noResult)
            return
        }

        for (section in sections) {
            // Section header
            val header = TextView(this).apply {
                text = section.title
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
                setTextColor(ContextCompat.getColor(context, R.color.posterita_primary))
                typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
                setPadding(0, 24, 0, 12)
            }
            container.addView(header)

            // Divider under header
            val divider = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, 2
                ).apply { bottomMargin = 16 }
                setBackgroundColor(ContextCompat.getColor(context, R.color.posterita_primary))
                alpha = 0.3f
            }
            container.addView(divider)

            for (item in section.items) {
                val questionView = TextView(this).apply {
                    text = item.question
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                    setTextColor(ContextCompat.getColor(context, R.color.black))
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(0, 12, 0, 4)
                }
                container.addView(questionView)

                val answerView = TextView(this).apply {
                    text = item.answer
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    setTextColor(0xFF555555.toInt())
                    setPadding(0, 0, 0, 16)
                    setLineSpacing(4f, 1f)
                }
                container.addView(answerView)
            }
        }
    }
}
