package com.posterita.pos.android.ui.adapter

import android.content.res.Configuration
import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ItemProductCartBinding
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.NumberUtils

class CartProductAdapter(
    private val shoppingCartViewModel: ShoppingCartViewModel,
    private val listener: OnCartItemClickListener,
    private val onProductImageClick: ((CartItem) -> Unit)? = null,
    private val onRemovalRequested: ((CartItem, RemovalType, () -> Unit) -> Unit)? = null
) : RecyclerView.Adapter<CartProductAdapter.CartProductViewHolder>() {

    enum class RemovalType { REMOVE_LINE, DECREASE_QTY }

    interface OnCartItemClickListener {
        fun onCartItemClick(cartItem: CartItem)
    }

    private var cartItems: List<CartItem> = emptyList()

    fun setProductList(list: List<CartItem>) {
        val oldList = cartItems
        cartItems = list
        DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = oldList.size
            override fun getNewListSize() = list.size
            override fun areItemsTheSame(oldPos: Int, newPos: Int) =
                oldList[oldPos].lineNo == list[newPos].lineNo
            override fun areContentsTheSame(oldPos: Int, newPos: Int): Boolean {
                val old = oldList[oldPos]
                val new = list[newPos]
                return old.lineNo == new.lineNo &&
                    old.qty == new.qty &&
                    old.priceEntered == new.priceEntered &&
                    old.discountAmt == new.discountAmt &&
                    old.note == new.note &&
                    old.modifiers == new.modifiers
            }
        }).dispatchUpdatesTo(this)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartProductViewHolder {
        val binding = ItemProductCartBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return CartProductViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CartProductViewHolder, position: Int) {
        holder.bind(cartItems[position], position)
    }

    override fun getItemCount(): Int = cartItems.size

    inner class CartProductViewHolder(
        private val binding: ItemProductCartBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(cartItem: CartItem, position: Int) {
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

            // Info line: Discount + Note + Modifiers + W/S
            val infoLines = mutableListOf<String>()
            if (cartItem.discountAmt > 0) {
                infoLines.add("Discount(${NumberUtils.formatQuantity(cartItem.originalDiscountPercentage)}%) Saved ${NumberUtils.formatPrice(cartItem.discountAmt)}")
            }
            if (!cartItem.note.isNullOrBlank()) {
                infoLines.add("Note: ${cartItem.note}")
            }
            if (!cartItem.modifiers.isNullOrBlank()) {
                infoLines.add("Mod: ${cartItem.modifiers}")
            }
            if (cartItem.isWholeSalePriceApplied) {
                infoLines.add("W/S Price")
            }

            if (infoLines.isNotEmpty()) {
                binding.textViewDiscountAmount.visibility = View.VISIBLE
                binding.textViewDiscountAmount.text = infoLines.joinToString("  |  ")
            } else {
                binding.textViewDiscountAmount.visibility = View.GONE
            }

            // Landscape mode: alternate row colors
            val orientation = context.resources.configuration.orientation
            if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                val bgColor = if (position % 2 == 0) {
                    ContextCompat.getColor(context, R.color.cat_white)
                } else {
                    ContextCompat.getColor(context, R.color.cat_light_grey)
                }
                itemView.setBackgroundColor(bgColor)
            }

            // Check if this is a coupon line
            val isCoupon = product.name?.startsWith("Coupon Code") == true

            // Increase qty button
            binding.consAdd.setOnClickListener {
                if (!isCoupon) {
                    shoppingCartViewModel.increaseQty(cartItem.lineNo)
                }
            }

            // Decrease qty button
            binding.consRemove.setOnClickListener {
                if (!isCoupon) {
                    if (onRemovalRequested != null) {
                        onRemovalRequested.invoke(cartItem, RemovalType.DECREASE_QTY) {
                            shoppingCartViewModel.decreaseQty(cartItem.lineNo)
                        }
                    } else {
                        shoppingCartViewModel.decreaseQty(cartItem.lineNo)
                    }
                }
            }

            // Remove line button (bin icon)
            binding.buttonRemoveLine.setOnClickListener {
                if (!isCoupon) {
                    if (onRemovalRequested != null) {
                        onRemovalRequested.invoke(cartItem, RemovalType.REMOVE_LINE) {
                            shoppingCartViewModel.removeLine(cartItem.lineNo)
                        }
                    } else {
                        shoppingCartViewModel.removeLine(cartItem.lineNo)
                    }
                }
            }

            // Click on product image to show detail popup
            binding.imageViewProduct.setOnClickListener {
                if (!isCoupon) {
                    onProductImageClick?.invoke(cartItem) ?: listener.onCartItemClick(cartItem)
                }
            }

            // Click on price to open edit dialog
            binding.textViewProductPrice.setOnClickListener {
                if (!isCoupon) {
                    listener.onCartItemClick(cartItem)
                }
            }

            // Click on whole row to open edit dialog
            itemView.setOnClickListener {
                if (!isCoupon) {
                    listener.onCartItemClick(cartItem)
                }
            }
        }
    }
}
