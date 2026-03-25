package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.service.TillService
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.databinding.ActivityCloseTillPopUpBinding
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class CloseTillPopUpActivity : BaseActivity() {

    private lateinit var binding: ActivityCloseTillPopUpBinding
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var tillService: TillService
    @Inject lateinit var printerManager: PrinterManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCloseTillPopUpBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupPlusMinusButtons()

        binding.buttonCloseTill.setOnClickListener {
            val cashInput = binding.edtPsdInput.text?.toString() ?: ""
            val cardInput = binding.edtcrdInput.text?.toString() ?: ""

            if (cashInput.isEmpty() || cardInput.isEmpty()) {
                Toast.makeText(this, "Please Fill Fields", Toast.LENGTH_SHORT).show()
            } else {
                val cash = cashInput.toDoubleOrNull() ?: 0.0
                val card = cardInput.toDoubleOrNull() ?: 0.0
                val forexCurr = binding.edtForexCurrencyInput.text?.toString()?.trim()?.uppercase()?.ifEmpty { null }
                val forexAmt = binding.edtForexAmtInput.text?.toString()?.toDoubleOrNull() ?: 0.0

                lifecycleScope.launch(Dispatchers.IO) {
                    try {
                        // Load user from DB if session is empty (can happen after idle timeout)
                        var user = sessionManager.user
                        if (user == null) {
                            val userId = prefsManager.userId
                            if (userId > 0) {
                                user = db.userDao().getUserById(userId)
                                if (user != null) sessionManager.user = user
                            }
                        }
                        if (user == null) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(this@CloseTillPopUpActivity, "User not found — please log in again", Toast.LENGTH_SHORT).show()
                            }
                            return@launch
                        }

                        val till = sessionManager.till
                        if (till == null) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(this@CloseTillPopUpActivity, "No open till found", Toast.LENGTH_SHORT).show()
                            }
                            return@launch
                        }

                        val closedTillDetails = tillService.closeTill(user, till, cash, card, forexCurr, forexAmt)

                        try {
                            printCloseReceipt(closedTillDetails)
                        } catch (e: Exception) {
                            Log.e("CloseTillPopUpActivity", "Error printing receipt", e)
                        }

                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@CloseTillPopUpActivity, "Till Closed Successfully", Toast.LENGTH_SHORT).show()
                            val intent = Intent(this@CloseTillPopUpActivity, SelectUserLoginActivity::class.java)
                            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            startActivity(intent)
                            finish()
                        }
                    } catch (e: Exception) {
                        Log.e("CloseTillPopUpActivity", "Error closing till", e)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@CloseTillPopUpActivity, "Error closing till. ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        binding.constCancel.setOnClickListener {
            startActivity(Intent(this, CloseTillActivity::class.java))
            finish()
        }

        binding.back.setOnClickListener {
            val cashInput = binding.edtPsdInput.text?.toString() ?: ""
            val cardInput = binding.edtcrdInput.text?.toString() ?: ""

            if (cashInput.isNotEmpty() || cardInput.isNotEmpty()) {
                AlertDialog.Builder(this)
                    .setTitle("Confirm Close Till")
                    .setMessage("You have not yet closed the till. Do you want to proceed?")
                    .setNegativeButton(android.R.string.ok) { _, _ ->
                        startActivity(Intent(this, CloseTillActivity::class.java))
                        finish()
                    }
                    .setPositiveButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
                    .show()
            } else {
                startActivity(Intent(this, CloseTillActivity::class.java))
                finish()
            }
        }
    }

    private fun setupPlusMinusButtons() {
        val step = 1.0

        fun adjustField(field: com.google.android.material.textfield.TextInputEditText, delta: Double) {
            val current = field.text?.toString()?.toDoubleOrNull() ?: 0.0
            val newVal = (current + delta).coerceAtLeast(0.0)
            field.setText(if (newVal == newVal.toLong().toDouble()) newVal.toLong().toString() else String.format("%.2f", newVal))
        }

        binding.btnCashMinus.setOnClickListener { adjustField(binding.edtPsdInput, -step) }
        binding.btnCashPlus.setOnClickListener { adjustField(binding.edtPsdInput, step) }
        binding.btnCardMinus.setOnClickListener { adjustField(binding.edtcrdInput, -step) }
        binding.btnCardPlus.setOnClickListener { adjustField(binding.edtcrdInput, step) }
    }

    private fun printCloseReceipt(closedTillDetails: ClosedTillDetails) {
        lifecycleScope.launch(Dispatchers.IO) {
            val printers = db.printerDao().getAllPrinters()
            for (printer in printers) {
                if (printer.printReceipt) {
                    printerManager.printCloseTillReceipt(closedTillDetails, printer, object : PrinterManager.PrintResultCallback {
                        override fun onSuccess() {
                            runOnUiThread {
                                Toast.makeText(this@CloseTillPopUpActivity, "Printing close till receipt...", Toast.LENGTH_SHORT).show()
                            }
                        }
                        override fun onError(message: String) {
                            runOnUiThread {
                                Toast.makeText(this@CloseTillPopUpActivity, "Failed to print close till receipt: $message", Toast.LENGTH_SHORT).show()
                            }
                        }
                    })
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
