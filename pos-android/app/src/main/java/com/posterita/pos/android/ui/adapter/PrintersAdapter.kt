package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.databinding.ItemPrinterBinding

class PrintersAdapter(
    private val listener: OnDeleteClickListener
) : RecyclerView.Adapter<PrintersAdapter.PrinterViewHolder>() {

    interface OnDeleteClickListener {
        fun onDeleteClick(printer: Printer)
    }

    private var printers: List<Printer> = emptyList()

    fun setPrinters(printers: List<Printer>) {
        this.printers = printers
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PrinterViewHolder {
        val binding = ItemPrinterBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return PrinterViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PrinterViewHolder, position: Int) {
        holder.bind(printers[position])
    }

    override fun getItemCount(): Int = printers.size

    inner class PrinterViewHolder(
        private val binding: ItemPrinterBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(printer: Printer) {
            binding.printerName.text = printer.name ?: ""
            binding.printerType.text = printer.printerType ?: ""

            binding.buttonDeletePrinter.setOnClickListener {
                listener.onDeleteClick(printer)
            }
        }
    }
}
