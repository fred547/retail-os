package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "promotion")
data class Promotion(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val name: String = "",
    val description: String? = null,
    val type: String = "percentage_off",
    val discount_value: Double = 0.0,
    val buy_quantity: Int? = null,
    val get_quantity: Int? = null,
    val applies_to: String = "order",
    val product_ids: String? = null,
    val category_ids: String? = null,
    val min_order_amount: Double? = null,
    val max_discount_amount: Double? = null,
    val promo_code: String? = null,
    val max_uses: Int? = null,
    val max_uses_per_customer: Int? = null,
    val start_date: String? = null,
    val end_date: String? = null,
    val days_of_week: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val is_active: Boolean = true,
    val store_id: Int? = null,
    val priority: Int = 0,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
) {
    companion object {
        const val TYPE_PERCENTAGE_OFF = "percentage_off"
        const val TYPE_FIXED_OFF = "fixed_off"
        const val TYPE_BUY_X_GET_Y = "buy_x_get_y"
        const val TYPE_PROMO_CODE = "promo_code"

        const val APPLIES_TO_ORDER = "order"
        const val APPLIES_TO_PRODUCT = "product"
        const val APPLIES_TO_CATEGORY = "category"
    }
}
