package com.posterita.pos.android.data.remote.model.response

data class PushDataResponse(
    val success: Boolean = false,
    val message: String? = null,
    val account_id: String? = null,
    val account_key: String? = null,
    val stores_created: Int = 0,
    val products_created: Int = 0,
    val categories_created: Int = 0,
    val users_created: Int = 0,
    val terminals_created: Int = 0,
    val taxes_created: Int = 0,
    val customers_created: Int = 0,
    val modifiers_created: Int = 0
)
