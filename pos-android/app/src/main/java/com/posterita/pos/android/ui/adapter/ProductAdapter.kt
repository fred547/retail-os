package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.Modifier
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.databinding.ItemProductBinding
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.NumberUtils

class ProductAdapter(
    private val shoppingCartViewModel: ShoppingCartViewModel,
    private val onProductAdded: ((Product) -> Unit)? = null,
    private val onModifierCheck: ((Product, (List<Modifier>) -> Unit) -> Unit)? = null,
    private val onProductImageClick: ((Product) -> Unit)? = null,
    /** Called when a zero-price product has been given a price by the user.
     *  Parameters: product, newPrice. The activity should persist the price + review flag. */
    private val onZeroPriceSet: ((Product, Double) -> Unit)? = null
) : RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    private var productList: List<Product> = emptyList()

    fun setProductList(list: List<Product>) {
        productList = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val binding = ItemProductBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ProductViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        holder.bind(productList[position])
    }

    override fun getItemCount(): Int = productList.size

    inner class ProductViewHolder(
        private val binding: ItemProductBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(product: Product) {
            binding.textViewProductName.text = product.name ?: ""
            binding.textViewProductPrice.text = NumberUtils.formatPrice(product.sellingprice)

            // Load product image with Glide
            Glide.with(binding.imageViewProduct.context)
                .load(product.image)
                .placeholder(R.drawable.ic_product_placeholder)
                .error(R.drawable.ic_product_placeholder)
                .into(binding.imageViewProduct)

            // Stock indicator bar + qty text
            updateStockDisplay(product)

            // Update quantity badge
            updateBadge(product)

            // Image click → product detail popup
            binding.imageViewProduct.setOnClickListener {
                onProductImageClick?.invoke(product)
            }

            // Click on rest of card → add product to cart
            itemView.setOnClickListener {
                val isVariableItem = product.isvariableitem == "Y"
                val isEditable = product.iseditable == "Y"

                // Zero-price product: always ask for price first
                if (product.sellingprice <= 0.0 && !isVariableItem && !isEditable) {
                    showZeroPriceDialog(product)
                    return@setOnClickListener
                }

                if (isVariableItem) {
                    showVariableQtyDialog(product, promptPrice = isEditable)
                } else if (isEditable) {
                    showVariablePriceDialog(product)
                } else {
                    // Warn on out-of-stock (but allow override)
                    if (product.tracksStock && product.quantity_on_hand <= 0) {
                        AlertDialog.Builder(itemView.context)
                            .setTitle("Out of Stock")
                            .setMessage("${product.name} is out of stock. Add anyway?")
                            .setPositiveButton("Add") { _, _ -> addProductToCart(product) }
                            .setNegativeButton("Cancel", null)
                            .show()
                    } else {
                        addProductToCart(product)
                    }
                }
            }
        }

        private fun showVariableQtyDialog(product: Product, promptPrice: Boolean = false) {
            val context = itemView.context
            val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_qty_numpad, null)
            val dialog = AlertDialog.Builder(context)
                .setView(dialogView)
                .create()
            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

            dialogView.findViewById<TextView>(R.id.txt_product_name).text = product.name ?: ""
            val txtDisplay = dialogView.findViewById<TextView>(R.id.txt_qty_display)
            val btnAdd = dialogView.findViewById<TextView>(R.id.txt_button_add)
            if (promptPrice) btnAdd.text = "Next"

            var qtyStr = "0"

            val appendDigit = fun(digit: String) {
                if (qtyStr == "0" && digit != ".") {
                    qtyStr = digit
                } else {
                    if (digit == "." && qtyStr.contains(".")) return
                    val dotIndex = qtyStr.indexOf(".")
                    if (dotIndex >= 0 && qtyStr.length - dotIndex > 2) return
                    qtyStr += digit
                }
                txtDisplay.text = qtyStr
            }

            dialogView.findViewById<View>(R.id.btn_0).setOnClickListener { appendDigit("0") }
            dialogView.findViewById<View>(R.id.btn_1).setOnClickListener { appendDigit("1") }
            dialogView.findViewById<View>(R.id.btn_2).setOnClickListener { appendDigit("2") }
            dialogView.findViewById<View>(R.id.btn_3).setOnClickListener { appendDigit("3") }
            dialogView.findViewById<View>(R.id.btn_4).setOnClickListener { appendDigit("4") }
            dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { appendDigit("5") }
            dialogView.findViewById<View>(R.id.btn_6).setOnClickListener { appendDigit("6") }
            dialogView.findViewById<View>(R.id.btn_7).setOnClickListener { appendDigit("7") }
            dialogView.findViewById<View>(R.id.btn_8).setOnClickListener { appendDigit("8") }
            dialogView.findViewById<View>(R.id.btn_9).setOnClickListener { appendDigit("9") }
            dialogView.findViewById<View>(R.id.btn_dot).setOnClickListener { appendDigit(".") }
            dialogView.findViewById<View>(R.id.btn_clear).setOnClickListener {
                qtyStr = "0"
                txtDisplay.text = qtyStr
            }
            dialogView.findViewById<View>(R.id.btn_clear).setOnLongClickListener {
                if (qtyStr.length > 1) {
                    qtyStr = qtyStr.dropLast(1)
                } else {
                    qtyStr = "0"
                }
                txtDisplay.text = qtyStr
                true
            }

            dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener { dialog.dismiss() }
            dialogView.findViewById<View>(R.id.button_add).setOnClickListener {
                val qty = NumberUtils.parseDouble(qtyStr)
                if (qty > 0) {
                    if (promptPrice) {
                        dialog.dismiss()
                        showVariablePriceDialog(product, qty)
                    } else {
                        shoppingCartViewModel.addProductWithQty(product, qty)
                        onProductAdded?.invoke(product)
                        updateBadge(product)
                        notifyItemChanged(adapterPosition)
                        dialog.dismiss()
                    }
                } else {
                    Toast.makeText(context, "Quantity must be greater than zero", Toast.LENGTH_SHORT).show()
                }
            }

            dialog.show()
        }

        private fun showVariablePriceDialog(product: Product, qty: Double = 1.0) {
            val context = itemView.context
            val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_numpad, null)
            val dialog = AlertDialog.Builder(context)
                .setView(dialogView)
                .create()
            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

            dialogView.findViewById<TextView>(R.id.txt_product_name).text = product.name ?: ""
            val txtDisplay = dialogView.findViewById<TextView>(R.id.txt_price_display)

            // Initialize with current selling price if available
            var priceStr = if (product.sellingprice > 0) NumberUtils.formatPrice(product.sellingprice) else "0"
            txtDisplay.text = priceStr

            val appendDigit = fun(digit: String) {
                if (priceStr == "0" && digit != ".") {
                    priceStr = digit
                } else {
                    // Prevent multiple dots
                    if (digit == "." && priceStr.contains(".")) return
                    // Limit decimal places to 2
                    val dotIndex = priceStr.indexOf(".")
                    if (dotIndex >= 0 && priceStr.length - dotIndex > 2) return
                    priceStr += digit
                }
                txtDisplay.text = priceStr
            }

            dialogView.findViewById<View>(R.id.btn_0).setOnClickListener { appendDigit("0") }
            dialogView.findViewById<View>(R.id.btn_1).setOnClickListener { appendDigit("1") }
            dialogView.findViewById<View>(R.id.btn_2).setOnClickListener { appendDigit("2") }
            dialogView.findViewById<View>(R.id.btn_3).setOnClickListener { appendDigit("3") }
            dialogView.findViewById<View>(R.id.btn_4).setOnClickListener { appendDigit("4") }
            dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { appendDigit("5") }
            dialogView.findViewById<View>(R.id.btn_6).setOnClickListener { appendDigit("6") }
            dialogView.findViewById<View>(R.id.btn_7).setOnClickListener { appendDigit("7") }
            dialogView.findViewById<View>(R.id.btn_8).setOnClickListener { appendDigit("8") }
            dialogView.findViewById<View>(R.id.btn_9).setOnClickListener { appendDigit("9") }
            dialogView.findViewById<View>(R.id.btn_dot).setOnClickListener { appendDigit(".") }
            dialogView.findViewById<View>(R.id.btn_clear).setOnClickListener {
                priceStr = "0"
                txtDisplay.text = priceStr
            }

            // Long press clear to backspace
            dialogView.findViewById<View>(R.id.btn_clear).setOnLongClickListener {
                if (priceStr.length > 1) {
                    priceStr = priceStr.dropLast(1)
                } else {
                    priceStr = "0"
                }
                txtDisplay.text = priceStr
                true
            }

            dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener { dialog.dismiss() }
            dialogView.findViewById<View>(R.id.button_add).setOnClickListener {
                val price = NumberUtils.parseDouble(priceStr)
                if (price > 0) {
                    if (qty != 1.0) {
                        shoppingCartViewModel.addProductWithQtyAndPrice(product, qty, price)
                    } else {
                        shoppingCartViewModel.addProductWithPrice(product, price)
                    }
                    onProductAdded?.invoke(product)
                    updateBadge(product)
                    notifyItemChanged(adapterPosition)
                    dialog.dismiss()
                } else {
                    Toast.makeText(context, "Price must be greater than zero", Toast.LENGTH_SHORT).show()
                }
            }

            dialog.show()
        }

        /**
         * Shows price dialog for products with zero price.
         * After the user enters a price, it:
         * 1. Adds the product to cart at the entered price
         * 2. Notifies the activity to persist the new price (and flag for review if needed)
         * 3. Updates the price displayed on the product card
         */
        private fun showZeroPriceDialog(product: Product) {
            val context = itemView.context
            val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_numpad, null)
            val dialog = AlertDialog.Builder(context)
                .setView(dialogView)
                .create()
            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

            dialogView.findViewById<TextView>(R.id.txt_product_name).text =
                "${product.name ?: ""} — Set Price"
            val txtDisplay = dialogView.findViewById<TextView>(R.id.txt_price_display)

            var priceStr = "0"
            txtDisplay.text = priceStr

            val appendDigit = fun(digit: String) {
                if (priceStr == "0" && digit != ".") {
                    priceStr = digit
                } else {
                    if (digit == "." && priceStr.contains(".")) return
                    val dotIndex = priceStr.indexOf(".")
                    if (dotIndex >= 0 && priceStr.length - dotIndex > 2) return
                    priceStr += digit
                }
                txtDisplay.text = priceStr
            }

            dialogView.findViewById<View>(R.id.btn_0).setOnClickListener { appendDigit("0") }
            dialogView.findViewById<View>(R.id.btn_1).setOnClickListener { appendDigit("1") }
            dialogView.findViewById<View>(R.id.btn_2).setOnClickListener { appendDigit("2") }
            dialogView.findViewById<View>(R.id.btn_3).setOnClickListener { appendDigit("3") }
            dialogView.findViewById<View>(R.id.btn_4).setOnClickListener { appendDigit("4") }
            dialogView.findViewById<View>(R.id.btn_5).setOnClickListener { appendDigit("5") }
            dialogView.findViewById<View>(R.id.btn_6).setOnClickListener { appendDigit("6") }
            dialogView.findViewById<View>(R.id.btn_7).setOnClickListener { appendDigit("7") }
            dialogView.findViewById<View>(R.id.btn_8).setOnClickListener { appendDigit("8") }
            dialogView.findViewById<View>(R.id.btn_9).setOnClickListener { appendDigit("9") }
            dialogView.findViewById<View>(R.id.btn_dot).setOnClickListener { appendDigit(".") }
            dialogView.findViewById<View>(R.id.btn_clear).setOnClickListener {
                priceStr = "0"
                txtDisplay.text = priceStr
            }
            dialogView.findViewById<View>(R.id.btn_clear).setOnLongClickListener {
                if (priceStr.length > 1) {
                    priceStr = priceStr.dropLast(1)
                } else {
                    priceStr = "0"
                }
                txtDisplay.text = priceStr
                true
            }

            dialogView.findViewById<View>(R.id.button_cancel).setOnClickListener { dialog.dismiss() }
            dialogView.findViewById<View>(R.id.button_add).setOnClickListener {
                val price = NumberUtils.parseDouble(priceStr)
                if (price > 0) {
                    // Add to cart at the entered price
                    shoppingCartViewModel.addProductWithPrice(product, price)
                    onProductAdded?.invoke(product)

                    // Notify activity to persist the new price + flag for review
                    onZeroPriceSet?.invoke(product, price)

                    // Update display — show the new price on the card
                    binding.textViewProductPrice.text = NumberUtils.formatPrice(price)
                    updateBadge(product)
                    notifyItemChanged(adapterPosition)
                    dialog.dismiss()
                } else {
                    Toast.makeText(context, "Price must be greater than zero", Toast.LENGTH_SHORT).show()
                }
            }

            dialog.show()
        }

        private fun addProductToCart(product: Product) {
            if (onModifierCheck != null) {
                onModifierCheck.invoke(product) { modifiers ->
                    if (modifiers.isNotEmpty()) {
                        // Has modifiers — let the activity handle the walkthrough
                    } else {
                        shoppingCartViewModel.addProduct(product)
                        onProductAdded?.invoke(product)
                        updateBadge(product)
                        notifyItemChanged(adapterPosition)
                    }
                }
            } else {
                shoppingCartViewModel.addProduct(product)
                onProductAdded?.invoke(product)
                updateBadge(product)
                notifyItemChanged(adapterPosition)
            }
        }

        private fun updateStockDisplay(product: Product) {
            val stockBar = binding.stockBar ?: return
            val qtyText = binding.textViewProductNameX
            if (!product.tracksStock) {
                stockBar.setBackgroundResource(R.drawable.stock_bar_untracked)
                qtyText.text = ""
                return
            }
            val qty = product.quantity_on_hand
            when {
                qty <= 0 -> {
                    stockBar.setBackgroundResource(R.drawable.stock_bar_out)
                    qtyText.text = "Out of stock"
                    qtyText.setTextColor(itemView.context.getColor(R.color.posterita_danger))
                }
                product.isLowStock -> {
                    stockBar.setBackgroundResource(R.drawable.stock_bar_low)
                    qtyText.text = "${NumberUtils.formatQuantity(qty)} left"
                    qtyText.setTextColor(itemView.context.getColor(R.color.posterita_orange))
                }
                else -> {
                    stockBar.setBackgroundResource(R.drawable.stock_bar_in)
                    qtyText.text = "${NumberUtils.formatQuantity(qty)} in stock"
                    qtyText.setTextColor(itemView.context.getColor(R.color.posterita_muted))
                }
            }
        }

        private fun updateBadge(product: Product) {
            val qty = shoppingCartViewModel.shoppingCart.productQtyMap[product.product_id] ?: 0.0
            if (qty > 0) {
                binding.textViewProductQuantityBadge.visibility = View.VISIBLE
                binding.textViewProductQuantityBadge.text = NumberUtils.formatQuantity(qty)
            } else {
                binding.textViewProductQuantityBadge.visibility = View.GONE
            }
        }
    }
}
