package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivityTillScreenBinding
import com.posterita.pos.android.ui.viewmodel.TillViewModel
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class TillActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTillScreenBinding

    private val tillViewModel: TillViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    // Tracks the raw digits entered (no decimal point stored — last 2 digits are cents)
    private var amountCents: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTillScreenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        // Back button
        binding.buttonBack?.setOnClickListener { finish() }

        setupNumpad()
        setupQuickAmounts()
        setupOpenTillButton()
        observeViewModel()
        updateAmountDisplay()

        // Check if a till is already open for this terminal
        tillViewModel.loadOpenTill()
    }

    private fun setupNumpad() {
        val digitButtons = mapOf(
            binding.btn0 to 0,
            binding.btn1 to 1,
            binding.btn2 to 2,
            binding.btn3 to 3,
            binding.btn4 to 4,
            binding.btn5 to 5,
            binding.btn6 to 6,
            binding.btn7 to 7,
            binding.btn8 to 8,
            binding.btn9 to 9
        )

        for ((button, digit) in digitButtons) {
            button.setOnClickListener {
                if (amountCents < 999999999) { // max ~9,999,999.99
                    amountCents = amountCents * 10 + digit
                    updateAmountDisplay()
                }
            }
        }

        binding.btnBackspace.setOnClickListener {
            amountCents /= 10
            updateAmountDisplay()
        }

        binding.btnBackspace.setOnLongClickListener {
            amountCents = 0
            updateAmountDisplay()
            true
        }

        // Dot button appends "00" (shift to dollars)
        binding.btnDot.setOnClickListener {
            if (amountCents < 99999999) {
                amountCents *= 100
                updateAmountDisplay()
            }
        }
    }

    private fun setupQuickAmounts() {
        binding.btnQuick0?.setOnClickListener {
            amountCents = 0
            updateAmountDisplay()
        }
        binding.btnQuick50?.setOnClickListener {
            amountCents = 5000
            updateAmountDisplay()
        }
        binding.btnQuick100?.setOnClickListener {
            amountCents = 10000
            updateAmountDisplay()
        }
        binding.btnQuick200?.setOnClickListener {
            amountCents = 20000
            updateAmountDisplay()
        }
    }

    private fun updateAmountDisplay() {
        val dollars = amountCents / 100.0
        binding.txtAmountDisplay.text = NumberUtils.formatPrice(dollars)
    }

    private fun setupOpenTillButton() {
        binding.buttonOpenTill.setOnClickListener {
            val openingAmount = amountCents / 100.0

            // Pre-check: make sure session data is available
            if (prefsManager.accountId.isEmpty() || prefsManager.accountId == "null") {
                Toast.makeText(this, "No account found. Please sync your data first.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (prefsManager.storeId <= 0) {
                Toast.makeText(this, "No store selected. Please select a store from Settings.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (prefsManager.terminalId <= 0) {
                Toast.makeText(this, "No terminal selected. Please select a terminal from Settings.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            binding.buttonOpenTill.isEnabled = false
            binding.buttonOpenTill.text = "Opening..."
            tillViewModel.openTill(openingAmount)
        }
    }

    private fun observeViewModel() {
        tillViewModel.currentTill.observe(this) { till ->
            if (till != null) {
                // Till is already open, go directly to ProductActivity
                navigateToProductActivity()
            }
        }

        tillViewModel.openTillResult.observe(this) { result ->
            binding.buttonOpenTill.isEnabled = true
            binding.buttonOpenTill.text = "Open Till"
            result.fold(
                onSuccess = {
                    Toast.makeText(this, "Till opened successfully", Toast.LENGTH_SHORT).show()
                    navigateToProductActivity()
                },
                onFailure = { error ->
                    Toast.makeText(
                        this,
                        "Failed to open till: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }

    private fun navigateToProductActivity() {
        val intent = Intent(this, ProductActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
