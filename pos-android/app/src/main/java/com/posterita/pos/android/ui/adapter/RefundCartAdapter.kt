package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ItemProductCartRefundBinding
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.util.NumberUtils

class RefundCartAdapter(
    private val listener: OnRefundSelectionListener
) : RecyclerView.Adapter<RefundCartAdapter.RefundCartViewHolder>() {

    interface OnRefundSelectionListener {
        fun onSelectionChanged(selectedItems: List<CartItem>)
    }

    private var cartItems: List<CartItem> = emptyList()
    private val selectedLineNos: MutableSet<String> = mutableSetOf()

    fun setProductList(list: List<CartItem>) {
        cartItems = list
        // Select all items by default
        selectedLineNos.clear()
        selectedLineNos.addAll(list.map { it.lineNo })
        notifyDataSetChanged()
        notifySelectionChanged()
    }

    fun getSelectedItems(): List<CartItem> {
        return cartItems.filter { it.lineNo in selectedLineNos }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RefundCartViewHolder {
        val binding = ItemProductCartRefundBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return RefundCartViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RefundCartViewHolder, position: Int) {
        holder.bind(cartItems[position])
    }

    override fun getItemCount(): Int = cartItems.size

    private fun notifySelectionChanged() {
        listener.onSelectionChanged(getSelectedItems())
    }

    inner class RefundCartViewHolder(
        private val binding: ItemProductCartRefundBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(cartItem: CartItem) {
            val product = cartItem.product
            val context = itemView.context
            val isSelected = cartItem.lineNo in selectedLineNos

            // Product name
            binding.textViewProductName.text = product.name ?: ""

            // Quantity
            binding.textViewQty.text = NumberUtils.formatQuantity(cartItem.qty)

            // Unit price
            binding.textViewUnitPrice?.text = NumberUtils.formatPrice(cartItem.priceEntered)

            // Line total
            binding.textViewLineTotal?.text = NumberUtils.formatPrice(cartItem.lineNetAmt)

            // Load product image
            Glide.with(context)
                .load(product.image)
                .placeholder(R.drawable.ic_product_placeholder)
                .error(R.drawable.ic_product_placeholder)
                .into(binding.imageViewProduct)

            // Checkbox state
            binding.checkboxSelect?.isChecked = isSelected

            // Background highlight
            binding.rowRoot.setBackgroundResource(
                if (isSelected) R.drawable.bg_refund_item_selected
                else R.drawable.bg_refund_item_default
            )

            // Alpha for deselected items
            binding.rowRoot.alpha = if (isSelected) 1.0f else 0.5f

            // Toggle selection on checkbox or row click
            val toggleSelection = {
                if (cartItem.lineNo in selectedLineNos) {
                    selectedLineNos.remove(cartItem.lineNo)
                } else {
                    selectedLineNos.add(cartItem.lineNo)
                }
                notifyItemChanged(adapterPosition)
                notifySelectionChanged()
            }

            binding.checkboxSelect?.setOnClickListener { toggleSelection() }
            binding.rowRoot.setOnClickListener { toggleSelection() }
        }
    }
}
