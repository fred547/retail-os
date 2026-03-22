package com.posterita.pos.android.data.remote

import com.posterita.pos.android.data.remote.model.request.CloudSyncRequest
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Retrofit interface for the Posterita Cloud Supabase sync API.
 * Base URL: https://web.posterita.com/api/
 */
interface CloudSyncApi {

    @POST("sync")
    suspend fun sync(@Body request: CloudSyncRequest): Response<CloudSyncResponse>

    @GET("sync")
    suspend fun healthCheck(): Response<Map<String, String>>
}
