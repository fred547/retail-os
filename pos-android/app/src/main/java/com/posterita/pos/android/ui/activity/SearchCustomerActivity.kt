package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.databinding.ActivitySearchCustomerBinding
import com.posterita.pos.android.ui.adapter.CustomerAdapter
import com.posterita.pos.android.ui.viewmodel.CustomerViewModel
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SearchCustomerActivity : AppCompatActivity(), CustomerAdapter.OnCustomerClickListener {

    private lateinit var binding: ActivitySearchCustomerBinding
    private val customerViewModel: CustomerViewModel by viewModels()
    private lateinit var customerAdapter: CustomerAdapter

    @Inject
    lateinit var sessionManager: SessionManager

    private val handler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null

    // ── World countries: code, name, mobile digit length ──
    data class CountryInfo(val code: String, val name: String, val mobileLength: Int)

    private val allCountries = listOf(
        CountryInfo("+93", "Afghanistan", 9),
        CountryInfo("+355", "Albania", 9),
        CountryInfo("+213", "Algeria", 9),
        CountryInfo("+376", "Andorra", 6),
        CountryInfo("+244", "Angola", 9),
        CountryInfo("+1268", "Antigua & Barbuda", 7),
        CountryInfo("+54", "Argentina", 10),
        CountryInfo("+374", "Armenia", 8),
        CountryInfo("+61", "Australia", 9),
        CountryInfo("+43", "Austria", 10),
        CountryInfo("+994", "Azerbaijan", 9),
        CountryInfo("+1242", "Bahamas", 7),
        CountryInfo("+973", "Bahrain", 8),
        CountryInfo("+880", "Bangladesh", 10),
        CountryInfo("+1246", "Barbados", 7),
        CountryInfo("+375", "Belarus", 9),
        CountryInfo("+32", "Belgium", 9),
        CountryInfo("+501", "Belize", 7),
        CountryInfo("+229", "Benin", 8),
        CountryInfo("+975", "Bhutan", 8),
        CountryInfo("+591", "Bolivia", 8),
        CountryInfo("+387", "Bosnia & Herzegovina", 8),
        CountryInfo("+267", "Botswana", 8),
        CountryInfo("+55", "Brazil", 11),
        CountryInfo("+673", "Brunei", 7),
        CountryInfo("+359", "Bulgaria", 9),
        CountryInfo("+226", "Burkina Faso", 8),
        CountryInfo("+257", "Burundi", 8),
        CountryInfo("+855", "Cambodia", 9),
        CountryInfo("+237", "Cameroon", 9),
        CountryInfo("+1", "Canada", 10),
        CountryInfo("+238", "Cape Verde", 7),
        CountryInfo("+236", "Central African Republic", 8),
        CountryInfo("+235", "Chad", 8),
        CountryInfo("+56", "Chile", 9),
        CountryInfo("+86", "China", 11),
        CountryInfo("+57", "Colombia", 10),
        CountryInfo("+269", "Comoros", 7),
        CountryInfo("+242", "Congo", 9),
        CountryInfo("+243", "Congo (DRC)", 9),
        CountryInfo("+506", "Costa Rica", 8),
        CountryInfo("+225", "Cote d'Ivoire", 10),
        CountryInfo("+385", "Croatia", 9),
        CountryInfo("+53", "Cuba", 8),
        CountryInfo("+357", "Cyprus", 8),
        CountryInfo("+420", "Czech Republic", 9),
        CountryInfo("+45", "Denmark", 8),
        CountryInfo("+253", "Djibouti", 8),
        CountryInfo("+1767", "Dominica", 7),
        CountryInfo("+1809", "Dominican Republic", 10),
        CountryInfo("+593", "Ecuador", 9),
        CountryInfo("+20", "Egypt", 10),
        CountryInfo("+503", "El Salvador", 8),
        CountryInfo("+240", "Equatorial Guinea", 9),
        CountryInfo("+291", "Eritrea", 7),
        CountryInfo("+372", "Estonia", 8),
        CountryInfo("+268", "Eswatini", 8),
        CountryInfo("+251", "Ethiopia", 9),
        CountryInfo("+679", "Fiji", 7),
        CountryInfo("+358", "Finland", 10),
        CountryInfo("+33", "France", 9),
        CountryInfo("+241", "Gabon", 8),
        CountryInfo("+220", "Gambia", 7),
        CountryInfo("+995", "Georgia", 9),
        CountryInfo("+49", "Germany", 11),
        CountryInfo("+233", "Ghana", 9),
        CountryInfo("+30", "Greece", 10),
        CountryInfo("+1473", "Grenada", 7),
        CountryInfo("+502", "Guatemala", 8),
        CountryInfo("+224", "Guinea", 9),
        CountryInfo("+245", "Guinea-Bissau", 7),
        CountryInfo("+592", "Guyana", 7),
        CountryInfo("+509", "Haiti", 8),
        CountryInfo("+504", "Honduras", 8),
        CountryInfo("+852", "Hong Kong", 8),
        CountryInfo("+36", "Hungary", 9),
        CountryInfo("+354", "Iceland", 7),
        CountryInfo("+91", "India", 10),
        CountryInfo("+62", "Indonesia", 12),
        CountryInfo("+98", "Iran", 10),
        CountryInfo("+964", "Iraq", 10),
        CountryInfo("+353", "Ireland", 9),
        CountryInfo("+972", "Israel", 9),
        CountryInfo("+39", "Italy", 10),
        CountryInfo("+1876", "Jamaica", 7),
        CountryInfo("+81", "Japan", 10),
        CountryInfo("+962", "Jordan", 9),
        CountryInfo("+7", "Kazakhstan", 10),
        CountryInfo("+254", "Kenya", 9),
        CountryInfo("+686", "Kiribati", 8),
        CountryInfo("+965", "Kuwait", 8),
        CountryInfo("+996", "Kyrgyzstan", 9),
        CountryInfo("+856", "Laos", 10),
        CountryInfo("+371", "Latvia", 8),
        CountryInfo("+961", "Lebanon", 8),
        CountryInfo("+266", "Lesotho", 8),
        CountryInfo("+231", "Liberia", 9),
        CountryInfo("+218", "Libya", 10),
        CountryInfo("+423", "Liechtenstein", 7),
        CountryInfo("+370", "Lithuania", 8),
        CountryInfo("+352", "Luxembourg", 9),
        CountryInfo("+853", "Macau", 8),
        CountryInfo("+261", "Madagascar", 9),
        CountryInfo("+265", "Malawi", 9),
        CountryInfo("+60", "Malaysia", 10),
        CountryInfo("+960", "Maldives", 7),
        CountryInfo("+223", "Mali", 8),
        CountryInfo("+356", "Malta", 8),
        CountryInfo("+692", "Marshall Islands", 7),
        CountryInfo("+222", "Mauritania", 8),
        CountryInfo("+230", "Mauritius", 8),
        CountryInfo("+52", "Mexico", 10),
        CountryInfo("+691", "Micronesia", 7),
        CountryInfo("+373", "Moldova", 8),
        CountryInfo("+377", "Monaco", 8),
        CountryInfo("+976", "Mongolia", 8),
        CountryInfo("+382", "Montenegro", 8),
        CountryInfo("+212", "Morocco", 9),
        CountryInfo("+258", "Mozambique", 9),
        CountryInfo("+95", "Myanmar", 10),
        CountryInfo("+264", "Namibia", 9),
        CountryInfo("+674", "Nauru", 7),
        CountryInfo("+977", "Nepal", 10),
        CountryInfo("+31", "Netherlands", 9),
        CountryInfo("+64", "New Zealand", 9),
        CountryInfo("+505", "Nicaragua", 8),
        CountryInfo("+227", "Niger", 8),
        CountryInfo("+234", "Nigeria", 10),
        CountryInfo("+389", "North Macedonia", 8),
        CountryInfo("+47", "Norway", 8),
        CountryInfo("+968", "Oman", 8),
        CountryInfo("+92", "Pakistan", 10),
        CountryInfo("+680", "Palau", 7),
        CountryInfo("+970", "Palestine", 9),
        CountryInfo("+507", "Panama", 8),
        CountryInfo("+675", "Papua New Guinea", 8),
        CountryInfo("+595", "Paraguay", 9),
        CountryInfo("+51", "Peru", 9),
        CountryInfo("+63", "Philippines", 10),
        CountryInfo("+48", "Poland", 9),
        CountryInfo("+351", "Portugal", 9),
        CountryInfo("+974", "Qatar", 8),
        CountryInfo("+262", "Reunion", 9),
        CountryInfo("+40", "Romania", 9),
        CountryInfo("+7", "Russia", 10),
        CountryInfo("+250", "Rwanda", 9),
        CountryInfo("+1869", "Saint Kitts & Nevis", 7),
        CountryInfo("+1758", "Saint Lucia", 7),
        CountryInfo("+1784", "St Vincent & Grenadines", 7),
        CountryInfo("+685", "Samoa", 7),
        CountryInfo("+378", "San Marino", 8),
        CountryInfo("+239", "Sao Tome & Principe", 7),
        CountryInfo("+966", "Saudi Arabia", 9),
        CountryInfo("+221", "Senegal", 9),
        CountryInfo("+381", "Serbia", 9),
        CountryInfo("+248", "Seychelles", 7),
        CountryInfo("+232", "Sierra Leone", 8),
        CountryInfo("+65", "Singapore", 8),
        CountryInfo("+421", "Slovakia", 9),
        CountryInfo("+386", "Slovenia", 8),
        CountryInfo("+677", "Solomon Islands", 7),
        CountryInfo("+252", "Somalia", 8),
        CountryInfo("+27", "South Africa", 9),
        CountryInfo("+82", "South Korea", 10),
        CountryInfo("+211", "South Sudan", 9),
        CountryInfo("+34", "Spain", 9),
        CountryInfo("+94", "Sri Lanka", 9),
        CountryInfo("+249", "Sudan", 9),
        CountryInfo("+597", "Suriname", 7),
        CountryInfo("+46", "Sweden", 10),
        CountryInfo("+41", "Switzerland", 9),
        CountryInfo("+963", "Syria", 9),
        CountryInfo("+886", "Taiwan", 9),
        CountryInfo("+992", "Tajikistan", 9),
        CountryInfo("+255", "Tanzania", 9),
        CountryInfo("+66", "Thailand", 9),
        CountryInfo("+670", "Timor-Leste", 8),
        CountryInfo("+228", "Togo", 8),
        CountryInfo("+676", "Tonga", 7),
        CountryInfo("+1868", "Trinidad & Tobago", 7),
        CountryInfo("+216", "Tunisia", 8),
        CountryInfo("+90", "Turkey", 10),
        CountryInfo("+993", "Turkmenistan", 8),
        CountryInfo("+688", "Tuvalu", 6),
        CountryInfo("+256", "Uganda", 9),
        CountryInfo("+380", "Ukraine", 9),
        CountryInfo("+971", "United Arab Emirates", 9),
        CountryInfo("+44", "United Kingdom", 10),
        CountryInfo("+1", "United States", 10),
        CountryInfo("+598", "Uruguay", 8),
        CountryInfo("+998", "Uzbekistan", 9),
        CountryInfo("+678", "Vanuatu", 7),
        CountryInfo("+58", "Venezuela", 10),
        CountryInfo("+84", "Vietnam", 10),
        CountryInfo("+967", "Yemen", 9),
        CountryInfo("+260", "Zambia", 9),
        CountryInfo("+263", "Zimbabwe", 9)
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySearchCustomerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupSearch()
        setupButtons()
        observeViewModel()

        // Set initial empty state text
        val emptyLayout = findViewById<View>(R.id.empty_state_customers)
        emptyLayout?.findViewById<android.widget.TextView>(R.id.text_empty_title)?.text = "Search for customers"
        emptyLayout?.findViewById<android.widget.TextView>(R.id.text_empty_subtitle)?.text = "Enter a phone number to find customers"
        emptyLayout?.findViewById<android.widget.ImageView>(R.id.image_empty_icon)?.setImageResource(R.drawable.ic_user)
    }

    private fun setupRecyclerView() {
        customerAdapter = CustomerAdapter(this)
        binding.recyclerViewSearchCustomerResults.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewSearchCustomerResults.adapter = customerAdapter
    }

    private fun setupSearch() {
        binding.textfieldSearchCustomer.requestFocus()

        binding.textfieldSearchCustomer.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchRunnable?.let { handler.removeCallbacks(it) }
            }
            override fun afterTextChanged(s: Editable?) {
                searchRunnable = Runnable {
                    val query = s.toString().trim()
                    if (query.isNotEmpty()) {
                        customerViewModel.searchCustomers(query)
                    }
                }
                handler.postDelayed(searchRunnable!!, 300)
            }
        })

        binding.buttonSearchCustomer.setOnClickListener {
            val query = binding.textfieldSearchCustomer.text.toString().trim()
            if (query.isNotEmpty()) {
                customerViewModel.searchCustomers(query)
            }
        }
    }

    private fun setupButtons() {
        binding.buttonAddCustomer.setOnClickListener {
            showAddCustomerDialog()
        }
    }

    private fun updateCustomerEmptyState(customers: List<Customer>) {
        val emptyLayout = findViewById<View>(R.id.empty_state_customers)
        if (customers.isEmpty()) {
            binding.recyclerViewSearchCustomerResults.visibility = View.GONE
            emptyLayout?.visibility = View.VISIBLE
            emptyLayout?.findViewById<android.widget.TextView>(R.id.text_empty_title)?.text = "No customers found"
            emptyLayout?.findViewById<android.widget.TextView>(R.id.text_empty_subtitle)?.text = "Search by phone number or add a new customer"
            emptyLayout?.findViewById<android.widget.ImageView>(R.id.image_empty_icon)?.setImageResource(R.drawable.ic_user)
        } else {
            binding.recyclerViewSearchCustomerResults.visibility = View.VISIBLE
            emptyLayout?.visibility = View.GONE
        }
    }

    private fun observeViewModel() {
        customerViewModel.searchResults.observe(this) { customers ->
            customerAdapter.setCustomers(customers)
            updateCustomerEmptyState(customers)
        }

        customerViewModel.createResult.observe(this) { result ->
            result.fold(
                onSuccess = { customer ->
                    Toast.makeText(this, "Customer created successfully", Toast.LENGTH_SHORT).show()
                    returnCustomer(customer)
                },
                onFailure = { error ->
                    Toast.makeText(this, "Failed to create customer: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            )
        }
    }

    private fun getDefaultCountry(): CountryInfo {
        val store = sessionManager.store
        val country = store?.country?.lowercase() ?: ""
        return allCountries.firstOrNull { country.contains(it.name.lowercase()) }
            ?: allCountries.first { it.code == "+230" } // Default Mauritius
    }

    private fun showAddCustomerDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.add_customer_layout, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        // Set backspace text programmatically to avoid XML encoding issues
        dialogView.findViewById<TextView>(R.id.btn_backspace)?.text = "\u232B"

        var currentCountry = getDefaultCountry()

        val txtCountryCode = dialogView.findViewById<TextView>(R.id.txt_country_code)
        val txtPhoneNumber = dialogView.findViewById<TextView>(R.id.txt_phone_number)
        val txtDigitCount = dialogView.findViewById<TextView>(R.id.txt_digit_count)
        val txtValidation = dialogView.findViewById<TextView>(R.id.txt_validation)
        val layoutExtraDetails = dialogView.findViewById<LinearLayout>(R.id.layout_extra_details)
        val nameInput = dialogView.findViewById<EditText>(R.id.text_customer_name)
        val emailInput = dialogView.findViewById<EditText>(R.id.text_email_address)
        val addressInput = dialogView.findViewById<EditText>(R.id.text_address)

        txtCountryCode.text = currentCountry.code

        var phoneStr = ""

        // Format phone number with spacing for display
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
                    sb.append("\u2022") // bullet dot for empty slots
                }
            }
            return sb.toString()
        }

        fun updatePhoneDisplay() {
            val length = currentCountry.mobileLength
            txtPhoneNumber.text = formatPhoneDisplay()
            txtPhoneNumber.setTextColor(
                if (phoneStr.length == length) Color.BLACK
                else Color.parseColor("#333333")
            )
            txtDigitCount.text = "${phoneStr.length} / $length digits"
            txtValidation.visibility = View.GONE
        }

        // Generate initial hint based on digit count
        fun updateHint() {
            val hint = (1..currentCountry.mobileLength).joinToString(" ") { "_" }
            txtPhoneNumber.hint = hint
        }

        updateHint()
        updatePhoneDisplay()

        // Country code picker
        txtCountryCode.setOnClickListener {
            val countryNames = allCountries.map { "${it.code}  ${it.name}" }.toTypedArray()
            val currentIndex = allCountries.indexOf(currentCountry).coerceAtLeast(0)

            AlertDialog.Builder(this)
                .setTitle("Select Country")
                .setSingleChoiceItems(countryNames, currentIndex) { d, which ->
                    currentCountry = allCountries[which]
                    txtCountryCode.text = currentCountry.code

                    // Reset phone if it exceeds new length
                    if (phoneStr.length > currentCountry.mobileLength) {
                        phoneStr = phoneStr.take(currentCountry.mobileLength)
                    }

                    updateHint()
                    updatePhoneDisplay()
                    d.dismiss()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        val appendDigit = fun(digit: String) {
            if (phoneStr.length >= currentCountry.mobileLength) return
            phoneStr += digit
            updatePhoneDisplay()
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
                updatePhoneDisplay()
            }
        }

        dialogView.findViewById<View>(R.id.btn_backspace).setOnLongClickListener {
            phoneStr = ""
            updatePhoneDisplay()
            true
        }

        // Toggle extra details
        val btnDetails = dialogView.findViewById<View>(R.id.btn_details)
        btnDetails.setOnClickListener {
            if (layoutExtraDetails.visibility == View.GONE) {
                layoutExtraDetails.visibility = View.VISIBLE
            } else {
                layoutExtraDetails.visibility = View.GONE
            }
        }

        // Create by Name
        dialogView.findViewById<View>(R.id.btn_create_by_name).setOnClickListener {
            dialog.dismiss()
            showCreateByNameDialog()
        }

        // Cancel
        dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener {
            dialog.dismiss()
        }

        // Save
        dialogView.findViewById<View>(R.id.button_save).setOnClickListener {
            if (phoneStr.length != currentCountry.mobileLength) {
                txtValidation.text = "Mobile number must be ${currentCountry.mobileLength} digits"
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            // Validate Mauritius mobile: must start with 5
            if (currentCountry.code == "+230" && !phoneStr.startsWith("5")) {
                txtValidation.text = "Mauritius mobile numbers start with 5"
                txtValidation.visibility = View.VISIBLE
                return@setOnClickListener
            }

            val fullPhone = "${currentCountry.code}$phoneStr"
            val name = nameInput?.text?.toString()?.trim()
            val email = emailInput?.text?.toString()?.trim()
            val address = addressInput?.text?.toString()?.trim()

            val customerName = if (name.isNullOrEmpty()) fullPhone else name

            customerViewModel.createCustomer(customerName, email, fullPhone, address, null, null)
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun showCreateByNameDialog() {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
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
            .setNegativeButton("Cancel", null)
            .show()
        nameInput.requestFocus()
    }

    override fun onCustomerClick(customer: Customer) {
        returnCustomer(customer)
    }

    private fun returnCustomer(customer: Customer) {
        val resultIntent = Intent()
        resultIntent.putExtra("SELECTED_CUSTOMER", customer)
        setResult(Activity.RESULT_OK, resultIntent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        setResult(Activity.RESULT_CANCELED)
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
