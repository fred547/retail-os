package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.databinding.ItemHoldOdersBinding
import com.posterita.pos.android.util.NumberUtils
import java.util.concurrent.TimeUnit

class HoldOrderAdapter(
    private val listener: OnHoldOrderClickListener
) : RecyclerView.Adapter<HoldOrderAdapter.HoldOrderViewHolder>() {

    interface OnHoldOrderClickListener {
        fun onEdit(holdOrder: HoldOrder, position: Int)
        fun onDelete(holdOrder: HoldOrder, position: Int)
    }

    private val holdOrders: MutableList<HoldOrder> = mutableListOf()

    fun setHoldOrders(orders: List<HoldOrder>) {
        holdOrders.clear()
        holdOrders.addAll(orders)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HoldOrderViewHolder {
        val binding = ItemHoldOdersBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return HoldOrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HoldOrderViewHolder, position: Int) {
        holder.bind(holdOrders[position], position)
    }

    override fun getItemCount(): Int = holdOrders.size

    inner class HoldOrderViewHolder(
        private val binding: ItemHoldOdersBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(holdOrder: HoldOrder, position: Int) {
            // Customer name — not stored in JSON, show "Walk-in" as default
            binding.textCustomerName.text = "Walk-in"

            // Hold ID + time ago
            val timeAgo = if (holdOrder.dateHold != null) {
                formatTimeAgo(holdOrder.dateHold.time)
            } else {
                ""
            }
            binding.txtDate.text = "Hold #${holdOrder.holdOrderId} · $timeAgo"

            // Description / note
            val description = holdOrder.description
            if (!description.isNullOrBlank()) {
                binding.txtdes.text = description
                binding.txtdes.visibility = View.VISIBLE
            } else {
                binding.txtdes.visibility = View.GONE
            }

            // Amount — parse from JSON if available
            val amount = try {
                holdOrder.json?.optDouble("grandtotal", 0.0) ?: 0.0
            } catch (e: Exception) {
                0.0
            }
            binding.txtamount.text = NumberUtils.formatPrice(amount)

            // Resume button (was edit)
            binding.btnResume.setOnClickListener {
                listener.onEdit(holdOrder, adapterPosition)
            }

            // Cancel button (was delete)
            binding.btnCancel.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) {
                    listener.onDelete(holdOrders[pos], pos)
                }
            }
        }

        private fun formatTimeAgo(timestampMs: Long): String {
            val now = System.currentTimeMillis()
            val diff = now - timestampMs
            if (diff < 0) return "just now"

            val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
            val hours = TimeUnit.MILLISECONDS.toHours(diff)
            val days = TimeUnit.MILLISECONDS.toDays(diff)

            return when {
                minutes < 1 -> "just now"
                minutes < 60 -> "${minutes} min ago"
                hours < 24 -> "${hours}h ago"
                days == 1L -> "yesterday"
                else -> "${days}d ago"
            }
        }
    }
}
