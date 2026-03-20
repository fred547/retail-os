package com.posterita.pos.android.ui.adapter

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
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
            // Order number
            binding.textViewDocumentno.text = order.documentno ?: ""

            // Customer name
            binding.textViewCustomer.text = order.customer_name ?: "Walk-in"

            // Amount with currency
            binding.textViewAmount.text = "${order.currency ?: ""} ${NumberUtils.formatPrice(order.grandtotal)}"

            // Payment type
            binding.textViewPaymentType.text = order.paymenttype ?: ""

            // Status badge with color
            val status = order.status ?: ""
            binding.textViewStatus.text = when {
                status.equals("VO", ignoreCase = true) -> "VOID"
                status.equals("CO", ignoreCase = true) -> "PAID"
                status.equals("IP", ignoreCase = true) -> "OPEN"
                else -> status.uppercase()
            }

            // Style the status badge
            val statusBg = GradientDrawable()
            statusBg.cornerRadius = 12f
            when {
                status.equals("VO", ignoreCase = true) -> {
                    statusBg.setColor(Color.parseColor("#FFEBEE"))
                    binding.textViewStatus.setTextColor(Color.parseColor("#D32F2F"))
                }
                status.equals("CO", ignoreCase = true) -> {
                    statusBg.setColor(Color.parseColor("#E8F5E9"))
                    binding.textViewStatus.setTextColor(Color.parseColor("#2E7D32"))
                }
                status.equals("IP", ignoreCase = true) -> {
                    statusBg.setColor(Color.parseColor("#FFF3E0"))
                    binding.textViewStatus.setTextColor(Color.parseColor("#E65100"))
                }
                else -> {
                    statusBg.setColor(Color.parseColor("#F5F5F5"))
                    binding.textViewStatus.setTextColor(Color.parseColor("#666666"))
                }
            }
            binding.textViewStatus.background = statusBg

            // Time
            binding.textViewTime?.let { timeView ->
                if (order.dateordered > 0) {
                    timeView.text = timeFormat.format(Date(order.dateordered))
                    timeView.visibility = View.VISIBLE
                } else {
                    timeView.visibility = View.GONE
                }
            }

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

            // Sync status
            binding.iconSync?.let { syncIcon ->
                binding.textViewSyncStatus?.let { syncText ->
                    syncIcon.visibility = View.VISIBLE
                    syncText.visibility = View.VISIBLE
                    if (order.issync) {
                        syncText.text = "Synced"
                        syncIcon.setColorFilter(Color.parseColor("#4CAF50"))
                        syncText.setTextColor(Color.parseColor("#4CAF50"))
                    } else {
                        syncText.text = "Pending"
                        syncIcon.setColorFilter(Color.parseColor("#FF9800"))
                        syncText.setTextColor(Color.parseColor("#FF9800"))
                    }
                }
            }

            itemView.setOnClickListener {
                listener.onItemClick(order)
            }
        }
    }
}
