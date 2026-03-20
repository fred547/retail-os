package com.posterita.pos.android.data.remote

import com.posterita.pos.android.data.remote.model.request.ConsentUpdateRequest
import com.posterita.pos.android.data.remote.model.request.LoyaltyAwardRequest
import com.posterita.pos.android.data.remote.model.response.LoyaltyAwardResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyBalanceResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyRedeemResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyValidateResponse
import retrofit2.Response
import retrofit2.http.*

interface LoyaltyApiService {

    @GET("balance/{phone}")
    suspend fun getBalance(
        @Path("phone") phone: String,
        @Header("X-Account-Key") accountKey: String
    ): Response<LoyaltyBalanceResponse>

    @POST("award")
    suspend fun awardPoints(
        @Header("X-Account-Key") accountKey: String,
        @Body request: LoyaltyAwardRequest
    ): Response<LoyaltyAwardResponse>

    @POST("voucher/validate")
    suspend fun validateVoucher(
        @Header("X-Account-Key") accountKey: String,
        @Query("code") voucherCode: String,
        @Query("phone") phone: String
    ): Response<LoyaltyValidateResponse>

    @POST("voucher/redeem")
    suspend fun redeemVoucher(
        @Header("X-Account-Key") accountKey: String,
        @Query("code") voucherCode: String,
        @Query("phone") phone: String,
        @Query("order_uuid") orderUuid: String
    ): Response<LoyaltyRedeemResponse>

    @POST("consent")
    suspend fun updateConsent(
        @Header("X-Account-Key") accountKey: String,
        @Body request: ConsentUpdateRequest
    ): Response<Unit>
}
