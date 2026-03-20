package com.posterita.pos.android.di

import android.content.Context
import com.posterita.pos.android.BuildConfig
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.data.remote.BlinkApiService
import com.posterita.pos.android.data.remote.LoyaltyApiService
import com.posterita.pos.android.data.remote.NetworkInterceptor
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class LoyaltyRetrofit

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BlinkRetrofit

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(@ApplicationContext context: Context): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        }
        val builder = OkHttpClient.Builder()
            .addInterceptor(NetworkInterceptor(context))
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        // Certificate pinning for production — prevents MITM attacks on POS transactions.
        // IMPORTANT: Uncomment and set real SHA-256 pins before production release.
        // Get pins: openssl s_client -connect my.posterita.com:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
        // Pin both the leaf and an intermediate CA for rotation safety.
        if (!BuildConfig.DEBUG) {
            android.util.Log.w("NetworkModule", "Certificate pinning NOT configured — set real SHA-256 pins before production release")
        }

        return builder.build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, prefsManager: SharedPreferencesManager): Retrofit {
        val baseUrl = prefsManager.baseUrl.let {
            if (it.endsWith("/")) it else "$it/"
        }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(ScalarsConverterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    @Provides
    @Singleton
    @LoyaltyRetrofit
    fun provideLoyaltyRetrofit(okHttpClient: OkHttpClient, prefsManager: SharedPreferencesManager): Retrofit {
        val baseUrl = prefsManager.loyaltyApiBaseUrl.let {
            if (it.endsWith("/")) it else "$it/"
        }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideLoyaltyApiService(@LoyaltyRetrofit retrofit: Retrofit): LoyaltyApiService {
        return retrofit.create(LoyaltyApiService::class.java)
    }

    @Provides
    @Singleton
    @BlinkRetrofit
    fun provideBlinkRetrofit(okHttpClient: OkHttpClient, prefsManager: SharedPreferencesManager): Retrofit {
        val baseUrl = prefsManager.cloudSyncUrl.let {
            // Use the same Vercel base URL as cloud sync (web.posterita.com)
            val url = it.substringBefore("/api/")
            if (url.endsWith("/")) url else "$url/"
        }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideBlinkApiService(@BlinkRetrofit retrofit: Retrofit): BlinkApiService {
        return retrofit.create(BlinkApiService::class.java)
    }
}
