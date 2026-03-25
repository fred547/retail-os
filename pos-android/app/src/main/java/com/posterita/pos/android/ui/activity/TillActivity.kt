package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityTillScreenBinding
import com.posterita.pos.android.ui.viewmodel.TillViewModel
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.worker.CloudSyncWorker
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class TillActivity : BaseActivity() {

    private lateinit var binding: ActivityTillScreenBinding

    private val tillViewModel: TillViewModel by viewModels()

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var prefsManager: SharedPreferencesManager

    // Denomination data: label, value, isNote
    private data class Denomination(val label: String, val value: Double, val isNote: Boolean)

    // MUR denominations — largest to smallest, notes then coins
    private val denominations = listOf(
        Denomination("Rs 2,000", 2000.0, true),
        Denomination("Rs 1,000", 1000.0, true),
        Denomination("Rs 500", 500.0, true),
        Denomination("Rs 200", 200.0, true),
        Denomination("Rs 100", 100.0, true),
        Denomination("Rs 50", 50.0, true),
        Denomination("Rs 25", 25.0, true),
        Denomination("Rs 20", 20.0, false),
        Denomination("Rs 10", 10.0, false),
        Denomination("Rs 5", 5.0, false),
        Denomination("Rs 1", 1.0, false),
    )

    // Track counts per denomination
    private val counts = IntArray(denominations.size)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTillScreenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        binding.buttonBack?.setOnClickListener { finish() }

        // Connectivity dot → opens sync screen
        binding.connectivityDot?.setOnClickListener {
            startActivity(android.content.Intent(this, DatabaseSynchonizerActivity::class.java))
        }

        buildDenominationRows()
        setupOpenTillButton()
        observeViewModel()
        updateTotal()

        // Check if a till is already open for this terminal
        tillViewModel.loadOpenTill()

        // Force sync on POS entry to ensure local DB is up to date
        CloudSyncWorker.syncNow(this)
    }

    private fun buildDenominationRows() {
        val inflater = LayoutInflater.from(this)
        val notesContainer = binding.layoutNotes ?: return
        val coinsContainer = binding.layoutCoins ?: return

        denominations.forEachIndexed { index, denom ->
            val row = inflater.inflate(R.layout.item_denomination_row, null)

            val labelView = row.findViewById<TextView>(R.id.text_denom_label)
            val countView = row.findViewById<TextView>(R.id.text_count)
            val subtotalView = row.findViewById<TextView>(R.id.text_subtotal)
            val btnMinus = row.findViewById<ImageView>(R.id.btn_minus)
            val btnPlus = row.findViewById<ImageView>(R.id.btn_plus)

            labelView.text = denom.label
            countView.text = "0"
            subtotalView.text = "0"

            btnPlus.setOnClickListener {
                counts[index]++
                countView.text = counts[index].toString()
                subtotalView.text = NumberUtils.formatPrice(counts[index] * denom.value)
                updateTotal()
            }

            btnMinus.setOnClickListener {
                if (counts[index] > 0) {
                    counts[index]--
                    countView.text = counts[index].toString()
                    subtotalView.text = if (counts[index] == 0) "0" else NumberUtils.formatPrice(counts[index] * denom.value)
                    updateTotal()
                }
            }

            // Long press on plus for fast increment (+5)
            btnPlus.setOnLongClickListener {
                counts[index] += 5
                countView.text = counts[index].toString()
                subtotalView.text = NumberUtils.formatPrice(counts[index] * denom.value)
                updateTotal()
                true
            }

            if (denom.isNote) {
                notesContainer.addView(row)
            } else {
                coinsContainer.addView(row)
            }
        }
    }

    private fun updateTotal() {
        var total = 0.0
        denominations.forEachIndexed { index, denom ->
            total += counts[index] * denom.value
        }
        binding.txtAmountDisplay.text = NumberUtils.formatPrice(total)
    }

    private fun getTotal(): Double {
        var total = 0.0
        denominations.forEachIndexed { index, denom ->
            total += counts[index] * denom.value
        }
        return total
    }

    private fun setupOpenTillButton() {
        binding.buttonOpenTill.setOnClickListener {
            // Pre-check session data
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

            val openingAmount = getTotal()
            binding.buttonOpenTill.isEnabled = false
            binding.buttonOpenTill.text = "Opening..."
            tillViewModel.openTill(openingAmount)
        }
    }

    private fun observeViewModel() {
        tillViewModel.currentTill.observe(this) { till ->
            if (till != null) {
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
                    Toast.makeText(this, "Failed to open till: ${error.message}", Toast.LENGTH_LONG).show()
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
