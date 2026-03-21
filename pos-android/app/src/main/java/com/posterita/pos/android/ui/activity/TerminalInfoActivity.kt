package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.res.ResourcesCompat
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.databinding.ActivityTerminalInfoBinding
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class TerminalInfoActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTerminalInfoBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTerminalInfoBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.buttonBack.setOnClickListener { finish() }

        loadTerminalInfo()
        loadPosConfig()
        loadPrinters()
    }

    private fun loadTerminalInfo() {
        val terminalId = prefsManager.terminalId

        binding.textTerminalName.text = prefsManager.terminalName.ifEmpty { "Unknown" }
        binding.textStoreName.text = prefsManager.storeName.ifEmpty { "Unknown" }

        lifecycleScope.launch(Dispatchers.IO) {
            val terminal = db.terminalDao().getTerminalById(terminalId)
            withContext(Dispatchers.Main) {
                if (terminal != null) {
                    binding.textTerminalName.text = terminal.name ?: "Unknown"
                    binding.textTerminalPrefix.text = terminal.prefix?.ifEmpty { "—" } ?: "—"
                    val currency = sessionManager.account?.currency ?: ""
                    binding.textTerminalFloat.text = "$currency ${NumberUtils.formatPrice(terminal.floatamt)}"
                } else {
                    binding.textTerminalPrefix.text = "—"
                    binding.textTerminalFloat.text = "—"
                }
            }
        }

        lifecycleScope.launch(Dispatchers.IO) {
            val store = db.storeDao().getStoreById(prefsManager.storeId)
            withContext(Dispatchers.Main) {
                binding.textStoreName.text = store?.name ?: prefsManager.storeName.ifEmpty { "Unknown" }
            }
        }
    }

    private fun loadPosConfig() {
        binding.textProductColumns.text = "${prefsManager.productColumns} columns"
        binding.textShowCategories.text = if (prefsManager.showCategories) "Visible" else "Hidden"
        binding.textBusinessType.text = if (prefsManager.isRestaurant) "Restaurant" else "Retail"
        binding.textRemovalPin.text = if (prefsManager.cartRemovalRequirePin) "Required" else "Not required"
        binding.textRemovalNote.text = if (prefsManager.cartRemovalRequireNote) "Required" else "Not required"
    }

    private fun loadPrinters() {
        lifecycleScope.launch(Dispatchers.IO) {
            val printers = db.printerDao().getAllPrinters()
            withContext(Dispatchers.Main) {
                val container = binding.layoutPrintersList
                container.removeAllViews()

                if (printers.isEmpty()) {
                    binding.textNoPrinters.visibility = View.VISIBLE
                    container.visibility = View.GONE
                } else {
                    binding.textNoPrinters.visibility = View.GONE
                    container.visibility = View.VISIBLE

                    for (printer in printers) {
                        val row = LinearLayout(this@TerminalInfoActivity).apply {
                            orientation = LinearLayout.HORIZONTAL
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = (6 * resources.displayMetrics.density).toInt() }
                        }

                        val roleText = TextView(this@TerminalInfoActivity).apply {
                            layoutParams = LinearLayout.LayoutParams(
                                (100 * resources.displayMetrics.density).toInt(),
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            )
                            text = printer.role.replaceFirstChar { it.uppercase() }
                            setTextColor(getColor(R.color.posterita_muted))
                            textSize = 14f
                        }
                        row.addView(roleText)

                        val nameText = TextView(this@TerminalInfoActivity).apply {
                            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                            text = "${printer.name ?: "—"} · ${printer.printerType ?: ""}"
                            setTextColor(getColor(R.color.posterita_ink))
                            textSize = 14f
                            typeface = ResourcesCompat.getFont(this@TerminalInfoActivity, R.font.lexend_medium)
                        }
                        row.addView(nameText)

                        container.addView(row)
                    }
                }
            }
        }
    }
}
