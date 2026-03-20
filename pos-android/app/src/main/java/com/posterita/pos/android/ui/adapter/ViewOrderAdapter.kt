package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.databinding.OrderLineDetailsBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.NumberUtils

class ViewOrderAdapter(
    private val orderLines: List<OrderDetails.OrderLineDetail>
) : RecyclerView.Adapter<ViewOrderAdapter.OrderLineViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderLineViewHolder {
        val binding = OrderLineDetailsBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return OrderLineViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderLineViewHolder, position: Int) {
        holder.bind(orderLines[position])
    }

    override fun getItemCount(): Int = orderLines.size

    class OrderLineViewHolder(
        private val binding: OrderLineDetailsBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(line: OrderDetails.OrderLineDetail) {
            binding.textViewProductName.text = line.name ?: ""
            val priceText = "${NumberUtils.formatPrice(line.priceentered)} (Qty x ${NumberUtils.formatQuantity(line.qtyentered)})"
            binding.textViewProductPriceQty.text = priceText
        }
    }
}
