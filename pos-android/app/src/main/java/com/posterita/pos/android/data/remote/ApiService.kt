package com.posterita.pos.android.data.remote

import com.posterita.pos.android.data.remote.model.request.CouponRequest
import com.posterita.pos.android.data.remote.model.request.CreateCustomerRequest
import com.posterita.pos.android.data.remote.model.request.SyncDocumentNoRequest
import com.posterita.pos.android.data.remote.model.response.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @FormUrlEncoded
    @POST("app/login")
    suspend fun login(
        @Field("email") email: String,
        @Field("password") password: String
    ): Response<LoginResponse>

    @GET("app/test")
    suspend fun testEndpoint(): Response<TestEndpointResponse>

    @FormUrlEncoded
    @POST("app/pull-data")
    suspend fun pullData(
        @Field("account_key") accountKey: String,
        @Field("last_updated") lastUpdated: String
    ): Response<String>

    @FormUrlEncoded
    @POST("app/sync-order")
    suspend fun syncOrder(
        @Field("account_key") accountKey: String,
        @Field("orders") orders: String
    ): Response<List<SyncOrderResponse.SyncOrderResponseItem>>

    @FormUrlEncoded
    @POST("app/sync-till")
    suspend fun syncTill(
        @Field("account_key") accountKey: String,
        @Field("tills") tills: String
    ): Response<List<SyncTillResponse.SyncTillResponseItem>>

    @FormUrlEncoded
    @POST("app/sync-document-no")
    suspend fun syncDocumentNumber(
        @Field("account_key") accountKey: String,
        @Field("info") info: SyncDocumentNoRequest
    ): Response<SyncDocumentNoResponse>

    @FormUrlEncoded
    @POST("app/save-terminal-online")
    suspend fun saveTerminalOnline(
        @Field("account_key") accountKey: String,
        @Field("terminal_id") terminalId: Int,
        @Field("isselected") isSelected: String
    ): Response<SaveSelectedTerminalOnlineResponse>

    @FormUrlEncoded
    @POST("app/update-customer")
    suspend fun createCustomer(
        @Field("account_key") accountKey: String,
        @Field("customer") customerJson: String
    ): Response<CreateCustomerResponse>

    @FormUrlEncoded
    @POST("app/get-coupon")
    suspend fun getCoupon(
        @Field("account_key") accountKey: String,
        @Field("coupon_code") couponCode: String
    ): Response<CouponResponse>

    @FormUrlEncoded
    @POST("app/update-coupon-balance")
    suspend fun updateCouponBalance(
        @Field("account_key") accountKey: String,
        @Field("applied_coupon_codes") appliedCouponCodes: Map<Int, Double>
    ): Response<CouponResponse>

    @FormUrlEncoded
    @POST("app/issue-coupon")
    suspend fun issueCoupon(
        @Field("account_key") accountKey: String,
        @Field("coupon") coupon: CouponRequest
    ): Response<CouponResponse>

    @FormUrlEncoded
    @POST("blink/get-blink-dynamic-qrcode")
    suspend fun getBlinkDynamicQRCode(
        @Field("account_key") accountKey: String,
        @Field("data") data: String
    ): Response<BlinkDynamicQRCodeResponse>

    @FormUrlEncoded
    @POST("blink/get-dynamic-qr-transaction-status")
    suspend fun getDynamicQRTransactionStatus(
        @Field("account_key") accountKey: String,
        @Field("data") data: String
    ): Response<BlinkDynamicQRCodeTransactionStatusResponse>

    @FormUrlEncoded
    @POST("blink/get-blink-till-qrcode")
    suspend fun getBlinkTillQRCode(
        @Field("account_key") accountKey: String,
        @Field("data") data: String
    ): Response<BlinkTillQRCodeResponse>

    @FormUrlEncoded
    @POST("blink/get-transaction-status")
    suspend fun getBlinkTillTransactionStatus(
        @Field("account_key") accountKey: String,
        @Field("data") data: String
    ): Response<BlinkTillQRCodeTransactionStatusResponse>

    @FormUrlEncoded
    @POST("app/push-data")
    suspend fun pushData(
        @Field("account_key") accountKey: String,
        @Field("data") data: String
    ): Response<PushDataResponse>
}
