package com.posterita.pos.android.ui.adapter

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ItemOrderRecycleBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.NumberUtils
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class OrderHistoryChildRecyclerAdapter(
    private val orderList: List<OrderDetails>,
    private val listener: OnItemClickListener
) : RecyclerView.Adapter<OrderHistoryChildRecyclerAdapter.OrderViewHolder>() {

    interface OnItemClickListener {
        fun onItemClick(order: OrderDetails)
    }

    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderRecycleBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        // Bind in reverse order
        val reverseIndex = orderList.size - 1 - position
        holder.bind(orderList[reverseIndex])
    }

    override fun getItemCount(): Int = orderList.size

    inner class OrderViewHolder(
        private val binding: ItemOrderRecycleBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(order: OrderDetails) {
            val context = itemView.context

            // Order number with time inline: "#0000130 · 14:32"
            val orderNum = order.documentno ?: ""
            val timeStr = if (order.dateordered > 0) {
                " \u00B7 ${timeFormat.format(Date(order.dateordered))}"
            } else ""
            binding.textViewDocumentno.text = "$orderNum$timeStr"

            // Customer name
            binding.textViewCustomer.text = order.customer_name ?: "Walk-in"

            // Amount with currency
            binding.textViewAmount.text = "${order.currency ?: ""} ${NumberUtils.formatPrice(order.grandtotal)}"

            // Payment type
            binding.textViewPaymentType.text = order.paymenttype ?: ""

            // Status badge with design system colors
            val status = order.status ?: ""
            binding.textViewStatus.text = when {
                status.equals("VO", ignoreCase = true) -> "VOID"
                status.equals("CO", ignoreCase = true) -> "PAID"
                status.equals("IP", ignoreCase = true) -> "OPEN"
                else -> status.uppercase()
            }

            val statusBg = GradientDrawable()
            statusBg.cornerRadius = 16f
            when {
                status.equals("VO", ignoreCase = true) -> {
                    statusBg.setColor(ContextCompat.getColor(context, R.color.posterita_error_light))
                    binding.textViewStatus.setTextColor(ContextCompat.getColor(context, R.color.posterita_error))
                }
                status.equals("CO", ignoreCase = true) -> {
                    statusBg.setColor(ContextCompat.getColor(context, R.color.posterita_secondary_light))
                    binding.textViewStatus.setTextColor(ContextCompat.getColor(context, R.color.posterita_secondary))
                }
                status.equals("IP", ignoreCase = true) -> {
                    statusBg.setColor(ContextCompat.getColor(context, R.color.posterita_warning_light))
                    binding.textViewStatus.setTextColor(ContextCompat.getColor(context, R.color.posterita_warning))
                }
                else -> {
                    statusBg.setColor(ContextCompat.getColor(context, R.color.posterita_panel))
                    binding.textViewStatus.setTextColor(ContextCompat.getColor(context, R.color.posterita_muted))
                }
            }
            binding.textViewStatus.background = statusBg

            // Time view is hidden — time is now shown inline with order number
            binding.textViewTime?.visibility = View.GONE

            // Items count
            binding.textViewItemsCount?.let { itemsView ->
                val itemCount = order.lines.size
                if (itemCount > 0) {
                    itemsView.text = if (itemCount == 1) "1 item" else "$itemCount items"
                    itemsView.visibility = View.VISIBLE
                } else {
                    itemsView.visibility = View.GONE
                }
            }

            // Sync status with design system colors
            binding.iconSync?.let { syncIcon ->
                binding.textViewSyncStatus?.let { syncText ->
                    syncIcon.visibility = View.VISIBLE
                    syncText.visibility = View.VISIBLE
                    if (order.issync) {
                        syncText.text = "Synced"
                        syncIcon.setColorFilter(ContextCompat.getColor(context, R.color.posterita_secondary))
                        syncText.setTextColor(ContextCompat.getColor(context, R.color.posterita_secondary))
                    } else {
                        syncText.text = "Pending"
                        syncIcon.setColorFilter(ContextCompat.getColor(context, R.color.posterita_warning))
                        syncText.setTextColor(ContextCompat.getColor(context, R.color.posterita_warning))
                    }
                }
            }

            itemView.setOnClickListener {
                listener.onItemClick(order)
            }
        }
    }
}
