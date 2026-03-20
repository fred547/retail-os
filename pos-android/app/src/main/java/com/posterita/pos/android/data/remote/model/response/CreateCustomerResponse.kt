package com.posterita.pos.android.data.remote.model.response

data class CreateCustomerResponse(
    val customer_id: Int = 0,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val identifier: String? = null,
    val note: String? = null
) : BaseResponse()
