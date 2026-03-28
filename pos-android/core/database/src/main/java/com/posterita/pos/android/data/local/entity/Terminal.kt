package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.fasterxml.jackson.annotation.JsonProperty
import java.io.Serializable

@Entity(tableName = "terminal")
data class Terminal(
    @PrimaryKey
    @JsonProperty("terminal_id")
    val terminalId: Int = 0,
    val store_id: Int = 0,
    val updatedby: Int = 0,
    val floatamt: Double = 0.0,
    val created: String? = null,
    val prefix: String? = null,
    val isactive: String? = null,
    val cash_up_sequence: Int = 0,
    val last_std_invoice_no: Int = 0,
    val ebscounter: String? = null,
    val areacode: String? = null,
    val tax_id: Int = 0,
    val ebs_counter: Int = 0,
    val sequence: Int = 0,
    val account_id: String = "",
    val createdby: Int = 0,
    val name: String? = null,
    val mraebs_id: String? = null,
    val updated: String? = null,
    val last_crn_invoice_no: Int = 0,
    val isselected: String? = null,
    val terminal_type: String = TYPE_POS_RETAIL,
    val zone: String? = null,
    /** Lock mode: "exploration" (auto-release on switch) or "production" (permanent) */
    val lock_mode: String = LOCK_EXPLORATION,
    val locked_device_id: String? = null
) : Serializable {
    val isProductionLocked: Boolean get() = lock_mode == LOCK_PRODUCTION && locked_device_id != null

    companion object {
        const val TYPE_POS_RETAIL = "pos_retail"
        const val TYPE_POS_RESTAURANT = "pos_restaurant"
        const val TYPE_KDS = "kds"
        const val TYPE_MOBILE_STAFF = "mobile_staff"
        const val TYPE_CUSTOMER_DISPLAY = "customer_display"
        const val TYPE_SELF_SERVICE = "self_service"

        const val LOCK_EXPLORATION = "exploration"
        const val LOCK_PRODUCTION = "production"
    }
    override fun toString(): String = name ?: ""
}
