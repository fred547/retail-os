package com.posterita.pos.android.data.remote.model.request

data class CreateCustomerRequest(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val identifier: String? = null,
    val note: String? = null
)
