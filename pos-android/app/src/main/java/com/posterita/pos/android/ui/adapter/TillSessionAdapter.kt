package com.posterita.pos.android.ui.adapter

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.Till
import com.posterita.pos.android.util.NumberUtils
import java.text.SimpleDateFormat
import java.util.Locale

class TillSessionAdapter(
    private val onItemClick: (Till) -> Unit
) : RecyclerView.Adapter<TillSessionAdapter.ViewHolder>() {

    data class TillDisplayItem(
        val till: Till,
        val terminalName: String,
        val openedByName: String
    )

    private var items: List<TillDisplayItem> = emptyList()

    fun setItems(newItems: List<TillDisplayItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val textTerminalName: TextView = view.findViewById(R.id.text_terminal_name)
        val textStatusBadge: TextView = view.findViewById(R.id.text_status_badge)
        val textOpenedBy: TextView = view.findViewById(R.id.text_opened_by)
        val textAmounts: TextView = view.findViewById(R.id.text_amounts)
        val textDiscrepancy: TextView = view.findViewById(R.id.text_discrepancy)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_till_session, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val till = item.till
        val context = holder.itemView.context
        val dateFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val dateFormatFull = SimpleDateFormat("dd MMM HH:mm", Locale.getDefault())

        holder.textTerminalName.text = item.terminalName.ifBlank { "Terminal ${till.terminal_id}" }

        // Status badge
        val isClosed = till.dateClosed != null
        val discrepancy = if (isClosed) till.closingAmt - (till.openingAmt + till.cashamt) else 0.0
        val hasDiscrepancy = isClosed && discrepancy != 0.0

        val badgeText: String
        val badgeBgColor: Int
        val badgeTextColor: Int

        if (!isClosed) {
            badgeText = "Open"
            badgeBgColor = ContextCompat.getColor(context, R.color.posterita_secondary_light)
            badgeTextColor = ContextCompat.getColor(context, R.color.posterita_secondary)
        } else if (hasDiscrepancy) {
            badgeText = "Discrepancy"
            badgeBgColor = ContextCompat.getColor(context, R.color.posterita_error_light)
            badgeTextColor = ContextCompat.getColor(context, R.color.posterita_error)
        } else {
            badgeText = "Closed"
            badgeBgColor = ContextCompat.getColor(context, R.color.posterita_primary_light)
            badgeTextColor = ContextCompat.getColor(context, R.color.posterita_primary)
        }

        holder.textStatusBadge.text = badgeText
        holder.textStatusBadge.setTextColor(badgeTextColor)
        val badgeBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 12f * context.resources.displayMetrics.density
            setColor(badgeBgColor)
        }
        holder.textStatusBadge.background = badgeBg

        // Opened by + time
        val openedTime = till.dateOpened?.let { dateFormatFull.format(it) } ?: ""
        val closedTime = if (isClosed) till.dateClosed?.let { dateFormat.format(it) } ?: "" else "Still open"
        holder.textOpenedBy.text = "Opened by ${item.openedByName} \u00B7 $openedTime \u2192 $closedTime"

        // Amounts
        val openingStr = NumberUtils.formatPrice(till.openingAmt)
        if (isClosed) {
            val closingStr = NumberUtils.formatPrice(till.closingAmt)
            holder.textAmounts.text = "Opening: $openingStr \u2192 Closing: $closingStr"
        } else {
            holder.textAmounts.text = "Opening: $openingStr"
        }

        // Discrepancy row (only for closed tills)
        if (isClosed) {
            holder.textDiscrepancy.visibility = View.VISIBLE
            if (discrepancy == 0.0) {
                holder.textDiscrepancy.text = "Balanced"
                holder.textDiscrepancy.setTextColor(ContextCompat.getColor(context, R.color.posterita_secondary))
            } else {
                val sign = if (discrepancy > 0) "+" else ""
                holder.textDiscrepancy.text = "Discrepancy: ${sign}${NumberUtils.formatPrice(discrepancy)}"
                holder.textDiscrepancy.setTextColor(
                    if (discrepancy < 0) ContextCompat.getColor(context, R.color.posterita_error)
                    else ContextCompat.getColor(context, R.color.posterita_secondary)
                )
            }
        } else {
            holder.textDiscrepancy.visibility = View.GONE
        }

        holder.itemView.setOnClickListener { onItemClick(till) }
    }

    override fun getItemCount() = items.size
}
