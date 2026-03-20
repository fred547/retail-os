package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user")
data class User(
    @PrimaryKey val user_id: Int = 0,
    val country: String? = null,
    val firstname: String? = null,
    val updatedby: Int = 0,
    val city: String? = null,
    val isactive: String? = null,
    val phone2: String? = null,
    val phone1: String? = null,
    val password: String? = null,
    val pin: String? = null,
    val isadmin: String? = null,
    val createdby: Int = 0,
    val permissions: String? = null,
    val state: String? = null,
    val discountlimit: Double = 0.0,
    val email: String? = null,
    val zip: String? = null,
    val address2: String? = null,
    val created: String? = null,
    val address1: String? = null,
    val issalesrep: String? = null,
    val lastname: String? = null,
    val account_id: Int = 0,
    val updated: String? = null,
    val username: String? = null,
    val role: String? = null
) {
    companion object {
        const val ROLE_OWNER = "owner"
        const val ROLE_ADMIN = "admin"
        const val ROLE_SUPERVISOR = "supervisor"
        const val ROLE_CASHIER = "cashier"
        const val ROLE_STAFF = "staff"
    }

    val isOwner: Boolean get() = role == ROLE_OWNER
    val isSupervisor: Boolean get() = role == ROLE_SUPERVISOR || role == ROLE_ADMIN || role == ROLE_OWNER || isadmin == "Y"
    val isCashier: Boolean get() = role == ROLE_CASHIER || role == ROLE_STAFF || (!isSupervisor && !isOwner)
    val isAdminOrOwner: Boolean get() = role == ROLE_OWNER || role == ROLE_ADMIN || isadmin == "Y"

    /** Supervisors and above can remove items, open cash drawer, void orders without PIN */
    val canRemoveItemsWithoutPin: Boolean get() = isSupervisor

    val displayRole: String get() = when (role) {
        ROLE_OWNER -> "Owner"
        ROLE_ADMIN -> "Admin"
        ROLE_SUPERVISOR -> "Supervisor"
        ROLE_CASHIER -> "Cashier"
        ROLE_STAFF -> "Staff"
        else -> if (isadmin == "Y") "Admin" else "Cashier"
    }

    override fun toString(): String = username ?: ""
}
