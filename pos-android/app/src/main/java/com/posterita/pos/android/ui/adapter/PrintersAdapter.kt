package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
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

            // Role badge
            binding.roleBadge.visibility = View.VISIBLE
            val context = binding.root.context
            when (printer.role) {
                Printer.ROLE_RECEIPT -> {
                    binding.roleBadge.text = "RECEIPT"
                    binding.roleBadge.setTextColor(context.getColor(R.color.posterita_primary))
                    binding.roleBadge.setBackgroundColor(context.getColor(R.color.posterita_primary_light))
                }
                Printer.ROLE_KITCHEN -> {
                    binding.roleBadge.text = "KITCHEN"
                    binding.roleBadge.setTextColor(context.getColor(R.color.posterita_warning))
                    binding.roleBadge.setBackgroundColor(context.getColor(R.color.posterita_warning_light))
                }
                Printer.ROLE_BAR -> {
                    binding.roleBadge.text = "BAR"
                    binding.roleBadge.setTextColor(context.getColor(R.color.posterita_error))
                    binding.roleBadge.setBackgroundColor(context.getColor(R.color.posterita_error_light))
                }
                Printer.ROLE_LABEL -> {
                    binding.roleBadge.text = "LABEL"
                    binding.roleBadge.setTextColor(context.getColor(R.color.posterita_secondary))
                    binding.roleBadge.setBackgroundColor(context.getColor(R.color.posterita_secondary_light))
                }
                else -> {
                    binding.roleBadge.text = printer.role.uppercase()
                    binding.roleBadge.setTextColor(context.getColor(R.color.posterita_muted))
                    binding.roleBadge.setBackgroundColor(context.getColor(R.color.posterita_bg))
                }
            }

            binding.buttonDeletePrinter.setOnClickListener {
                listener.onDeleteClick(printer)
            }
        }
    }
}
