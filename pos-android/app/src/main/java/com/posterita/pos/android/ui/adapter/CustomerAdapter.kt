package com.posterita.pos.android.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.databinding.ItemCustomerBinding

class CustomerAdapter(
    private val listener: OnCustomerClickListener
) : RecyclerView.Adapter<CustomerAdapter.CustomerViewHolder>() {

    interface OnCustomerClickListener {
        fun onCustomerClick(customer: Customer)
    }

    private var customerList: List<Customer> = emptyList()

    fun setCustomers(customers: List<Customer>) {
        customerList = customers
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CustomerViewHolder {
        val binding = ItemCustomerBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return CustomerViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CustomerViewHolder, position: Int) {
        holder.bind(customerList[position])
    }

    override fun getItemCount(): Int = customerList.size

    inner class CustomerViewHolder(
        private val binding: ItemCustomerBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(customer: Customer) {
            binding.textCustomerName.text = customer.name ?: ""

            itemView.setOnClickListener {
                listener.onCustomerClick(customer)
            }
        }
    }
}
