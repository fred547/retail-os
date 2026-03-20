package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.databinding.DaterecycleitemBinding
import com.posterita.pos.android.domain.model.OrderDetails
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class OrderHistoryRecyclerAdapter(
    private val listener: OnItemClickListener
) : RecyclerView.Adapter<OrderHistoryRecyclerAdapter.DateGroupViewHolder>() {

    interface OnItemClickListener {
        fun onItemClick(order: OrderDetails)
    }

    private val dateGroupMap: LinkedHashMap<String, List<OrderDetails>> = linkedMapOf()
    private var dateKeys: List<String> = emptyList()

    fun setOrderList(orders: List<OrderDetails>) {
        dateGroupMap.clear()

        // Sort orders descending by dateordered
        val sortedOrders = orders.sortedByDescending { it.dateordered }

        // Group by formatted date string
        val dateFormat = SimpleDateFormat("EEEE, dd MMM yyyy", Locale.getDefault())
        val grouped = linkedMapOf<String, MutableList<OrderDetails>>()

        for (order in sortedOrders) {
            val dateStr = if (order.dateordered > 0) {
                dateFormat.format(Date(order.dateordered))
            } else {
                "Unknown Date"
            }
            grouped.getOrPut(dateStr) { mutableListOf() }.add(order)
        }

        dateGroupMap.putAll(grouped)
        dateKeys = dateGroupMap.keys.toList()
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DateGroupViewHolder {
        val binding = DaterecycleitemBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return DateGroupViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DateGroupViewHolder, position: Int) {
        val dateKey = dateKeys[position]
        val orders = dateGroupMap[dateKey] ?: emptyList()
        holder.bind(dateKey, orders)
    }

    override fun getItemCount(): Int = dateKeys.size

    inner class DateGroupViewHolder(
        private val binding: DaterecycleitemBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(dateKey: String, orders: List<OrderDetails>) {
            binding.textViewDate.text = dateKey

            val childAdapter = OrderHistoryChildRecyclerAdapter(orders, object : OrderHistoryChildRecyclerAdapter.OnItemClickListener {
                override fun onItemClick(order: OrderDetails) {
                    listener.onItemClick(order)
                }
            })

            binding.recyclerViewDate.apply {
                layoutManager = LinearLayoutManager(itemView.context)
                adapter = childAdapter
            }
        }
    }
}
