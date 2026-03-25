package com.posterita.pos.android.data.remote

import com.posterita.pos.android.data.remote.model.response.BlinkTillQRCodeResponse
import com.posterita.pos.android.data.remote.model.response.BlinkTillQRCodeTransactionStatusResponse
import com.posterita.pos.android.data.remote.model.response.BlinkDynamicQRCodeResponse
import com.posterita.pos.android.data.remote.model.response.BlinkDynamicQRCodeTransactionStatusResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * Blink Payment API Service — calls the Vercel server (web.posterita.com)
 * which proxies requests to Emtel Blink, keeping credentials server-side.
 */
interface BlinkApiService {

    // ==================== Till Integration ====================

    @POST("api/blink/till")
    suspend fun getTillQRCode(
        @Body request: Map<String, @JvmSuppressWildcards Any?>
    ): Response<BlinkTillQRCodeResponse>

    @POST("api/blink/till")
    suspend fun getTillTransactionStatus(
        @Body request: Map<String, @JvmSuppressWildcards Any?>
    ): Response<BlinkTillQRCodeTransactionStatusResponse>

    // ==================== Dynamic QR Code ====================

    @POST("api/blink/dynamic-qr")
    suspend fun getDynamicQRCode(
        @Body request: Map<String, @JvmSuppressWildcards Any?>
    ): Response<BlinkDynamicQRCodeResponse>

    @POST("api/blink/dynamic-qr")
    suspend fun getDynamicQRTransactionStatus(
        @Body request: Map<String, @JvmSuppressWildcards Any?>
    ): Response<BlinkDynamicQRCodeTransactionStatusResponse>
}
