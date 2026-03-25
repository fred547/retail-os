package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.TillAdjustment
import com.posterita.pos.android.databinding.ActivityAdjustTillBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class AdjustTillActivity : BaseActivity() {

    private lateinit var binding: ActivityAdjustTillBinding
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase

    private var isPayIn = true
    private var openTillId = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdjustTillBinding.inflate(layoutInflater)
        setContentView(binding.root)

        isPayIn = true
        binding.txtdone.text = "Add"

        val terminalId = prefsManager.terminalId

        lifecycleScope.launch(Dispatchers.IO) {
            val openTill = db.tillDao().getOpenTillByTerminalId(terminalId)
            if (openTill != null) {
                openTillId = openTill.tillId
            } else {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@AdjustTillActivity, "No open till found", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }

        binding.add.setOnClickListener {
            isPayIn = true
            binding.add.setBackgroundColor(resources.getColor(R.color.txt_color, null))
            binding.remove.setBackgroundColor(resources.getColor(R.color.bg, null))
            binding.txtAdd.setTextColor(resources.getColor(R.color.white, null))
            binding.txtRemove.setTextColor(resources.getColor(R.color.black, null))
            binding.txtdone.text = "Add"
        }

        binding.remove.setOnClickListener {
            isPayIn = false
            binding.add.setBackgroundColor(resources.getColor(R.color.bg, null))
            binding.remove.setBackgroundColor(resources.getColor(R.color.txt_color, null))
            binding.txtAdd.setTextColor(resources.getColor(R.color.black, null))
            binding.txtRemove.setTextColor(resources.getColor(R.color.white, null))
            binding.txtdone.text = "Remove"
        }

        binding.back.setOnClickListener {
            @Suppress("DEPRECATION")
            onBackPressed()
        }

        binding.buttonDone.setOnClickListener {
            val adjustmentAmt = binding.edtPsdInput.text.toString()
            val reason = binding.edtcrdInput.text.toString()
            val userId = prefsManager.userId

            if (adjustmentAmt.isEmpty() || reason.isEmpty()) {
                Toast.makeText(this, "Fill All Fields", Toast.LENGTH_SHORT).show()
            } else {
                lifecycleScope.launch(Dispatchers.IO) {
                    val tillAdjustment = TillAdjustment(
                        till_id = openTillId,
                        date = System.currentTimeMillis(),
                        user_id = userId,
                        reason = reason,
                        amount = adjustmentAmt.toDoubleOrNull() ?: 0.0,
                        pay_type = if (isPayIn) "payin" else "payout"
                    )

                    db.tillAdjustmentDao().insertTillAdjustment(tillAdjustment)

                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@AdjustTillActivity, "Adjustment saved successfully", Toast.LENGTH_SHORT).show()
                        startActivity(Intent(this@AdjustTillActivity, CloseTillActivity::class.java))
                        finish()
                    }
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        startActivity(Intent(this, CloseTillActivity::class.java))
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
