package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.databinding.ActivityCustomerDetailsBinding
import com.posterita.pos.android.util.NumberUtils
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CustomerDetailsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCustomerDetailsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCustomerDetailsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        @Suppress("DEPRECATION")
        val customer = intent.getSerializableExtra("customer") as? Customer

        if (customer == null) {
            Toast.makeText(this, "No customer data found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        displayCustomerDetails(customer)
        setupButtons()
    }

    private fun displayCustomerDetails(customer: Customer) {
        binding.textViewCustomerIdValue.text = customer.customer_id.toString()
        binding.textViewCustomerNameValue.text = customer.name ?: ""
        binding.textViewCustomerAddressValue.text = customer.address1 ?: ""
        binding.textViewCustomerCityValue.text = customer.city ?: ""
        binding.textViewCustomerPhoneValue.text = customer.phone1 ?: ""
        binding.textViewCustomerMobileValue.text = customer.mobile ?: ""
        binding.textViewCustomerEmailValue.text = customer.email ?: ""
        binding.textViewCustomerOpenBalanceValue.text = NumberUtils.formatPrice(customer.openbalance)
        binding.textViewCustomerCreditLimitValue.text = NumberUtils.formatPrice(customer.creditlimit)
        binding.textViewCustomerNoteValue.text = customer.note ?: ""
        binding.textViewCustomerBrnValue.text = customer.regno ?: ""
        binding.textViewCustomerVatnoValue.text = customer.vatno ?: ""
    }

    private fun setupButtons() {
        binding.back.setOnClickListener {
            finish()
        }

        binding.buttonRemoveCustomer.setOnClickListener {
            setResult(RESULT_OK)
            finish()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
