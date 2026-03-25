package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.databinding.ActivityPrintersBinding
import com.posterita.pos.android.databinding.ItemPrinterBinding
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class PrintersActivity : BaseActivity() {

    private lateinit var binding: ActivityPrintersBinding
    @Inject lateinit var db: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrintersBinding.inflate(layoutInflater)
        setContentView(binding.root)

        loadPrinters()

        binding.back.setOnClickListener {
            finish()
        }

        binding.buttonAddPrinter.setOnClickListener {
            showRoleSelectionDialog()
        }
    }

    override fun onResume() {
        super.onResume()
        loadPrinters()
    }

    private fun loadPrinters() {
        lifecycleScope.launch(Dispatchers.IO) {
            val printers = db.printerDao().getAllPrinters()
            val grouped = printers.groupBy { it.role }

            withContext(Dispatchers.Main) {
                val hasAnyPrinter = printers.isNotEmpty()
                binding.layoutTestButtons.visibility = if (hasAnyPrinter) View.VISIBLE else View.GONE

                bindRoleSection(
                    grouped[Printer.ROLE_RECEIPT],
                    binding.frameReceiptPrinter,
                    binding.textReceiptEmpty
                )
                bindRoleSection(
                    grouped[Printer.ROLE_KITCHEN],
                    binding.frameKitchenPrinter,
                    binding.textKitchenEmpty
                )
                bindRoleSection(
                    grouped[Printer.ROLE_BAR],
                    binding.frameBarPrinter,
                    binding.textBarEmpty
                )
                bindRoleSection(
                    grouped[Printer.ROLE_LABEL],
                    binding.frameLabelPrinter,
                    binding.textLabelEmpty
                )
            }
        }
    }

    private fun bindRoleSection(
        printers: List<Printer>?,
        frame: android.widget.FrameLayout,
        emptyText: android.widget.TextView
    ) {
        frame.removeAllViews()

        if (printers.isNullOrEmpty()) {
            frame.visibility = View.GONE
            emptyText.visibility = View.VISIBLE
        } else {
            frame.visibility = View.VISIBLE
            emptyText.visibility = View.GONE

            for (printer in printers) {
                val cardBinding = ItemPrinterBinding.inflate(
                    LayoutInflater.from(this), frame, false
                )
                cardBinding.printerName.text = printer.name ?: ""
                cardBinding.printerType.text = printer.printerType ?: ""

                // Show role badge
                cardBinding.roleBadge.visibility = View.VISIBLE
                val (badgeText, badgeColor, badgeBg) = getRoleBadgeInfo(printer.role)
                cardBinding.roleBadge.text = badgeText
                cardBinding.roleBadge.setTextColor(badgeColor)
                cardBinding.roleBadge.setBackgroundColor(badgeBg)

                cardBinding.buttonDeletePrinter.setOnClickListener {
                    showDeleteConfirmation(printer)
                }

                frame.addView(cardBinding.root)
            }
        }
    }

    private fun getRoleBadgeInfo(role: String): Triple<String, Int, Int> {
        return when (role) {
            Printer.ROLE_RECEIPT -> Triple(
                "RECEIPT",
                getColor(R.color.posterita_primary),
                getColor(R.color.posterita_primary_light)
            )
            Printer.ROLE_KITCHEN -> Triple(
                "KITCHEN",
                getColor(R.color.posterita_warning),
                getColor(R.color.posterita_warning_light)
            )
            Printer.ROLE_BAR -> Triple(
                "BAR",
                getColor(R.color.posterita_error),
                getColor(R.color.posterita_error_light)
            )
            Printer.ROLE_LABEL -> Triple(
                "LABEL",
                getColor(R.color.posterita_secondary),
                getColor(R.color.posterita_secondary_light)
            )
            else -> Triple(
                role.uppercase(),
                getColor(R.color.posterita_muted),
                getColor(R.color.posterita_bg)
            )
        }
    }

    private fun showRoleSelectionDialog() {
        val roles = arrayOf("Receipt Printer", "Kitchen Printer", "Bar Printer", "Label Printer")
        val roleValues = arrayOf(
            Printer.ROLE_RECEIPT, Printer.ROLE_KITCHEN,
            Printer.ROLE_BAR, Printer.ROLE_LABEL
        )

        AlertDialog.Builder(this)
            .setTitle("What type of printer?")
            .setItems(roles) { _, which ->
                val intent = Intent(this, CreatePrinterActivity::class.java)
                intent.putExtra(CreatePrinterActivity.EXTRA_PRINTER_ROLE, roleValues[which])
                startActivity(intent)
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun showDeleteConfirmation(printer: Printer) {
        AlertDialog.Builder(this)
            .setTitle("Delete Printer")
            .setMessage("Are you sure you want to delete ${printer.name}?")
            .setPositiveButton(android.R.string.ok) { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    db.printerDao().deletePrinter(printer.printerId)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@PrintersActivity, "Printer deleted", Toast.LENGTH_SHORT).show()
                        loadPrinters()
                    }
                }
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
