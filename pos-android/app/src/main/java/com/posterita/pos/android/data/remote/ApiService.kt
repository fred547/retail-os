package com.posterita.pos.android.data.remote

import com.posterita.pos.android.data.remote.model.request.CouponRequest
import com.posterita.pos.android.data.remote.model.request.CreateCustomerRequest
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
}
