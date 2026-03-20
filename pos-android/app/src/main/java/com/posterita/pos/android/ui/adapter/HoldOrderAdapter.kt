package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.databinding.ItemHoldOdersBinding
import com.posterita.pos.android.util.NumberUtils
import java.text.SimpleDateFormat
import java.util.Locale

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
            // Date
            val dateFormat = SimpleDateFormat("EEEE, dd MMM yyyy HH:mm", Locale.getDefault())
            binding.txtDate.text = if (holdOrder.dateHold != null) {
                dateFormat.format(holdOrder.dateHold)
            } else {
                ""
            }

            // Description
            binding.txtdes.text = holdOrder.description ?: ""

            // Amount - parse from JSON if available
            val amount = try {
                holdOrder.json?.optDouble("grandtotal", 0.0) ?: 0.0
            } catch (e: Exception) {
                0.0
            }
            binding.txtamount.text = NumberUtils.formatPrice(amount)

            // Edit button
            binding.icEdit.setOnClickListener {
                listener.onEdit(holdOrder, adapterPosition)
            }

            // Delete button — let the activity handle removal after async DB delete
            binding.icDel.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) {
                    listener.onDelete(holdOrders[pos], pos)
                }
            }
        }
    }
}
