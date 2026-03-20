package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.databinding.ActivityPrintersBinding
import com.posterita.pos.android.ui.adapter.PrintersAdapter
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class PrintersActivity : AppCompatActivity(), PrintersAdapter.OnDeleteClickListener {

    private lateinit var binding: ActivityPrintersBinding
    @Inject lateinit var db: AppDatabase

    private lateinit var printersAdapter: PrintersAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrintersBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        loadPrinters()

        binding.back.setOnClickListener {
            finish()
        }

        binding.buttonAddPrinter.setOnClickListener {
            startActivity(Intent(this, CreatePrinterActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        loadPrinters()
    }

    private fun setupRecyclerView() {
        printersAdapter = PrintersAdapter(this)
        binding.printersRecyclerView.layoutManager = LinearLayoutManager(this)
        binding.printersRecyclerView.adapter = printersAdapter
    }

    private fun loadPrinters() {
        lifecycleScope.launch(Dispatchers.IO) {
            val printers = db.printerDao().getAllPrinters()
            withContext(Dispatchers.Main) {
                val isEmpty = printers.isEmpty()
                binding.printersRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
                binding.layoutEmpty?.visibility = if (isEmpty) View.VISIBLE else View.GONE
                binding.textSectionConnected?.visibility = if (isEmpty) View.GONE else View.VISIBLE
                binding.layoutTestButtons?.visibility = if (isEmpty) View.GONE else View.VISIBLE
                if (!isEmpty) {
                    printersAdapter.setPrinters(printers)
                }
            }
        }
    }

    override fun onDeleteClick(printer: Printer) {
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
