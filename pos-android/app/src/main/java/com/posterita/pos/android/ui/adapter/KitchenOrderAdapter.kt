package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.util.NumberUtils
import java.text.SimpleDateFormat
import java.util.Locale

class KitchenOrderAdapter(
    private val listener: OnKitchenOrderActionListener,
    private val currency: String = ""
) : RecyclerView.Adapter<KitchenOrderAdapter.KitchenOrderViewHolder>() {

    interface OnKitchenOrderActionListener {
        fun onAddNote(holdOrder: HoldOrder, position: Int)
        fun onRecall(holdOrder: HoldOrder, position: Int)
        fun onPrintBill(holdOrder: HoldOrder, position: Int)
        fun onDelete(holdOrder: HoldOrder, position: Int)
        fun onComplete(holdOrder: HoldOrder, position: Int)
        fun onStatusChange(holdOrder: HoldOrder, position: Int)
        fun onSplit(holdOrder: HoldOrder, position: Int)
    }

    private val orders = mutableListOf<HoldOrder>()

    fun setOrders(newOrders: List<HoldOrder>) {
        orders.clear()
        // Sort by oldest first (longest waiting at top)
        orders.addAll(newOrders.sortedBy { it.dateHold?.time ?: Long.MAX_VALUE })
        notifyDataSetChanged()
    }

    fun removeAt(position: Int) {
        if (position in orders.indices) {
            orders.removeAt(position)
            notifyItemRemoved(position)
            notifyItemRangeChanged(position, orders.size)
        }
    }

    /** Refresh elapsed time on all visible items without full rebind. */
    fun refreshTimers() {
        notifyItemRangeChanged(0, orders.size, PAYLOAD_TIMER)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): KitchenOrderViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_kitchen_order, parent, false)
        return KitchenOrderViewHolder(view)
    }

    override fun onBindViewHolder(holder: KitchenOrderViewHolder, position: Int) {
        holder.bind(orders[position])
    }

    override fun onBindViewHolder(holder: KitchenOrderViewHolder, position: Int, payloads: MutableList<Any>) {
        if (payloads.contains(PAYLOAD_TIMER)) {
            holder.updateElapsed(orders[position])
        } else {
            super.onBindViewHolder(holder, position, payloads)
        }
    }

    override fun getItemCount(): Int = orders.size

    inner class KitchenOrderViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val txtTableName: TextView = itemView.findViewById(R.id.txt_table_name)
        private val txtStatus: TextView = itemView.findViewById(R.id.txt_status)
        private val txtElapsed: TextView = itemView.findViewById(R.id.txt_elapsed)
        private val txtTime: TextView = itemView.findViewById(R.id.txt_time)
        private val txtItemsSummary: TextView = itemView.findViewById(R.id.txt_items_summary)
        private val txtNote: TextView = itemView.findViewById(R.id.txt_note)
        private val txtTotal: TextView = itemView.findViewById(R.id.txt_total)
        private val btnAddNote: View = itemView.findViewById(R.id.btn_add_note)
        private val btnRecall: View = itemView.findViewById(R.id.btn_recall)
        private val btnPrintBill: View = itemView.findViewById(R.id.btn_print_bill)
        private val btnSplit: View = itemView.findViewById(R.id.btn_split)
        private val btnDelete: View = itemView.findViewById(R.id.btn_delete)
        private val btnComplete: View = itemView.findViewById(R.id.btn_complete)

        fun updateElapsed(holdOrder: HoldOrder) {
            val dateHold = holdOrder.dateHold
            if (dateHold != null) {
                val elapsedMs = System.currentTimeMillis() - dateHold.time
                val minutes = (elapsedMs / 60000).toInt()
                val hours = minutes / 60
                val text = when {
                    hours > 0 -> "${hours}h ${minutes % 60}m"
                    else -> "${minutes}m"
                }
                txtElapsed.text = text
                val color = when {
                    minutes < 10 -> 0xFF43A047.toInt()
                    minutes < 30 -> 0xFFFF6F00.toInt()
                    else -> 0xFFE53935.toInt()
                }
                txtElapsed.setTextColor(color)
            } else {
                txtElapsed.text = ""
            }
        }

        private fun updateStatus(json: org.json.JSONObject?) {
            val status = json?.optString("status", STATUS_NEW) ?: STATUS_NEW
            when (status) {
                STATUS_IN_PROGRESS -> {
                    txtStatus.text = "PREPARING"
                    txtStatus.setBackgroundResource(R.drawable.badge_in_progress)
                }
                STATUS_READY -> {
                    txtStatus.text = "READY"
                    txtStatus.setBackgroundResource(R.drawable.badge_ready)
                }
                else -> {
                    txtStatus.text = "NEW"
                    txtStatus.setBackgroundResource(R.drawable.badge_new)
                }
            }
        }

        fun bind(holdOrder: HoldOrder) {
            val json = holdOrder.json

            // Table name
            val tableName = json?.optString("tableName", "") ?: ""
            val orderType = json?.optString("orderType", "dine_in") ?: "dine_in"
            txtTableName.text = if (tableName.isNotBlank()) {
                tableName
            } else if (orderType == "take_away") {
                "Take Away"
            } else {
                holdOrder.description ?: "Kitchen Order"
            }

            // Status badge
            updateStatus(json)

            // Elapsed timer
            updateElapsed(holdOrder)

            // Time
            val dateFormat = SimpleDateFormat("dd MMM HH:mm", Locale.getDefault())
            txtTime.text = if (holdOrder.dateHold != null) {
                dateFormat.format(holdOrder.dateHold)
            } else ""

            // Items summary
            val items = json?.optJSONArray("items")
            if (items != null && items.length() > 0) {
                val sb = StringBuilder()
                for (i in 0 until items.length()) {
                    val item = items.optJSONObject(i) ?: continue
                    val qty = item.optDouble("qty", 1.0)
                    val name = item.optString("product_name", "")
                    val modifiers = item.optString("modifiers", "")
                    val itemNote = item.optString("note", "")
                    if (sb.isNotEmpty()) sb.append("\n")
                    sb.append("${NumberUtils.formatQuantity(qty)}x $name")
                    if (modifiers.isNotBlank()) {
                        sb.append(" ($modifiers)")
                    }
                    if (itemNote.isNotBlank()) {
                        sb.append(" \u2014 $itemNote")
                    }
                }
                txtItemsSummary.text = sb.toString()
            } else {
                txtItemsSummary.text = holdOrder.description ?: ""
            }

            // Note
            val note = json?.optString("note", "") ?: ""
            if (note.isNotBlank()) {
                txtNote.text = "\uD83D\uDCDD $note"
                txtNote.visibility = View.VISIBLE
            } else {
                txtNote.visibility = View.GONE
            }

            // Total
            val total = json?.optDouble("grandtotal", 0.0) ?: 0.0
            txtTotal.text = "Total: $currency ${NumberUtils.formatPrice(total)}"

            // Status badge click — cycle through statuses
            txtStatus.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onStatusChange(orders[pos], pos)
            }

            // Action buttons
            btnAddNote.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onAddNote(orders[pos], pos)
            }
            btnRecall.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onRecall(orders[pos], pos)
            }
            btnPrintBill.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onPrintBill(orders[pos], pos)
            }
            btnSplit.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onSplit(orders[pos], pos)
            }
            btnDelete.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onDelete(orders[pos], pos)
            }
            btnComplete.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION) listener.onComplete(orders[pos], pos)
            }
        }
    }

    companion object {
        private const val PAYLOAD_TIMER = "timer"
        const val STATUS_NEW = "new"
        const val STATUS_IN_PROGRESS = "in_progress"
        const val STATUS_READY = "ready"
    }
}
