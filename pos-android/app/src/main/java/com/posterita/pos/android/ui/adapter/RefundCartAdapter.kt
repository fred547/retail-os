package com.posterita.pos.android.ui.adapter

import android.graphics.Paint
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ItemProductCartRefundBinding
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.NumberUtils

class RefundCartAdapter(
    private val shoppingCartViewModel: ShoppingCartViewModel,
    private val listener: OnCartItemClickListener
) : RecyclerView.Adapter<RefundCartAdapter.RefundCartViewHolder>() {

    interface OnCartItemClickListener {
        fun onCartItemClick(cartItem: CartItem)
    }

    private var cartItems: List<CartItem> = emptyList()

    fun setProductList(list: List<CartItem>) {
        cartItems = list
        notifyDataSetChanged()
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

    inner class RefundCartViewHolder(
        private val binding: ItemProductCartRefundBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(cartItem: CartItem) {
            val product = cartItem.product
            val context = itemView.context

            // Product name
            binding.textViewProductName.text = product.name ?: ""

            // Product price (underlined)
            binding.textViewProductPrice.text = NumberUtils.formatPrice(cartItem.priceEntered)
            binding.textViewProductPrice.paintFlags =
                binding.textViewProductPrice.paintFlags or Paint.UNDERLINE_TEXT_FLAG

            // Quantity
            binding.textViewQty.text = NumberUtils.formatQuantity(cartItem.qty)

            // Load product image
            Glide.with(context)
                .load(product.image)
                .placeholder(R.drawable.ic_splash)
                .error(R.drawable.ic_splash)
                .into(binding.imageViewProduct)

            // Increase qty button
            binding.consAdd.setOnClickListener {
                shoppingCartViewModel.increaseQty(cartItem.lineNo)
            }

            // Decrease qty button
            binding.consRemove.setOnClickListener {
                shoppingCartViewModel.decreaseQty(cartItem.lineNo)
            }

            // Remove line button
            binding.buttonRemoveLine.setOnClickListener {
                shoppingCartViewModel.removeLine(cartItem.lineNo)
            }

            // Click on price to trigger listener
            binding.textViewProductPrice.setOnClickListener {
                listener.onCartItemClick(cartItem)
            }
        }
    }
}
