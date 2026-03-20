package com.posterita.pos.android.data.repository

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.posterita.pos.android.data.local.dao.LoyaltyCacheDao
import com.posterita.pos.android.data.local.dao.PendingConsentUpdateDao
import com.posterita.pos.android.data.local.dao.PendingLoyaltyAwardDao
import com.posterita.pos.android.data.local.entity.LoyaltyCache
import com.posterita.pos.android.data.local.entity.PendingConsentUpdate
import com.posterita.pos.android.data.local.entity.PendingLoyaltyAward
import com.posterita.pos.android.data.remote.LoyaltyApiService
import com.posterita.pos.android.data.remote.model.request.ConsentUpdateRequest
import com.posterita.pos.android.data.remote.model.request.LoyaltyAwardRequest
import com.posterita.pos.android.data.remote.model.response.LoyaltyAwardResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyBalanceResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyRedeemResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyValidateResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyVoucher
import com.posterita.pos.android.util.SharedPreferencesManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LoyaltyRepository @Inject constructor(
    private val loyaltyApi: LoyaltyApiService,
    private val loyaltyCacheDao: LoyaltyCacheDao,
    private val pendingAwardDao: PendingLoyaltyAwardDao,
    private val pendingConsentDao: PendingConsentUpdateDao,
    private val prefsManager: SharedPreferencesManager
) {
    companion object {
        private const val TAG = "LoyaltyRepository"
    }

    val isEnabled: Boolean get() = prefsManager.loyaltyEnabled
    private val accountKey: String get() = prefsManager.loyaltyAccountKey

    private val gson = Gson()

    /**
     * Normalize phone number: strip spaces, dashes, and ensure consistent format.
     */
    fun normalizePhone(phone: String): String {
        return phone.replace(Regex("[\\s\\-()]+"), "").trim()
    }

    /**
     * Fetch balance from API, cache locally, return cached on failure.
     */
    suspend fun getBalance(phone: String): LoyaltyBalanceResponse? {
        val normalized = normalizePhone(phone)
        if (normalized.isEmpty()) return null

        return try {
            val response = loyaltyApi.getBalance(normalized, accountKey)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    // Cache the result
                    loyaltyCacheDao.upsert(
                        LoyaltyCache(
                            phone = normalized,
                            points = body.points,
                            tier = body.tier,
                            vouchersJson = gson.toJson(body.activeVouchers),
                            lastUpdated = System.currentTimeMillis()
                        )
                    )
                }
                body
            } else {
                // Fallback to cache
                getCachedBalance(normalized)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch loyalty balance, using cache", e)
            getCachedBalance(normalized)
        }
    }

    private suspend fun getCachedBalance(phone: String): LoyaltyBalanceResponse? {
        val cached = loyaltyCacheDao.getByPhone(phone) ?: return null
        val vouchers: List<LoyaltyVoucher> = try {
            if (cached.vouchersJson != null) {
                gson.fromJson(cached.vouchersJson, object : TypeToken<List<LoyaltyVoucher>>() {}.type)
            } else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
        return LoyaltyBalanceResponse(
            phone = cached.phone,
            points = cached.points,
            tier = cached.tier,
            activeVouchers = vouchers
        )
    }

    /**
     * Award points for an order. Queues to PendingLoyaltyAward on failure for offline retry.
     * Idempotent on orderUuid — the API should deduplicate.
     */
    suspend fun awardPoints(request: LoyaltyAwardRequest): Result<LoyaltyAwardResponse> {
        return try {
            val response = loyaltyApi.awardPoints(accountKey, request)
            if (response.isSuccessful && response.body() != null) {
                // Update cached balance
                val body = response.body()!!
                val cached = loyaltyCacheDao.getByPhone(normalizePhone(request.phone))
                if (cached != null) {
                    loyaltyCacheDao.upsert(cached.copy(points = body.newBalance, lastUpdated = System.currentTimeMillis()))
                }
                Result.success(body)
            } else {
                // Queue for retry
                queuePendingAward(request)
                Result.failure(Exception("API error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to award points, queuing for retry", e)
            queuePendingAward(request)
            Result.failure(e)
        }
    }

    private suspend fun queuePendingAward(request: LoyaltyAwardRequest) {
        pendingAwardDao.insert(
            PendingLoyaltyAward(
                phone = normalizePhone(request.phone),
                orderUuid = request.orderUuid,
                orderTotal = request.orderTotal,
                currency = request.currency,
                storeId = request.storeId,
                terminalId = request.terminalId
            )
        )
    }

    /**
     * Validate a voucher code for a customer phone number.
     */
    suspend fun validateVoucher(code: String, phone: String): Result<LoyaltyValidateResponse> {
        return try {
            val response = loyaltyApi.validateVoucher(accountKey, code, normalizePhone(phone))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Voucher validation failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Redeem a voucher after order completion.
     */
    suspend fun redeemVoucher(code: String, phone: String, orderUuid: String): Result<LoyaltyRedeemResponse> {
        return try {
            val response = loyaltyApi.redeemVoucher(accountKey, code, normalizePhone(phone), orderUuid)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Voucher redemption failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Record consent (or withdrawal). Always creates loyalty wallet regardless of consent.
     * Consent only controls WhatsApp marketing communication.
     * Queues offline if network unavailable.
     */
    suspend fun updateConsent(
        phone: String,
        consentGranted: Boolean,
        brandName: String? = null,
        storeId: Int = 0,
        terminalId: Int = 0,
        userId: Int = 0
    ): Result<Unit> {
        val normalized = normalizePhone(phone)
        val request = ConsentUpdateRequest(
            phone = normalized,
            consentGranted = consentGranted,
            consentSource = "POS",
            brandName = brandName,
            storeId = storeId,
            terminalId = terminalId,
            userId = userId,
            consentTimestamp = System.currentTimeMillis()
        )

        return try {
            val response = loyaltyApi.updateConsent(accountKey, request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                queuePendingConsent(normalized, consentGranted, brandName, storeId, terminalId, userId)
                Result.failure(Exception("Consent update failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update consent, queuing for retry", e)
            queuePendingConsent(normalized, consentGranted, brandName, storeId, terminalId, userId)
            Result.failure(e)
        }
    }

    private suspend fun queuePendingConsent(
        phone: String,
        consentGranted: Boolean,
        brandName: String?,
        storeId: Int,
        terminalId: Int,
        userId: Int
    ) {
        pendingConsentDao.insert(
            PendingConsentUpdate(
                phone = phone,
                consentGranted = consentGranted,
                brandName = brandName,
                storeId = storeId,
                terminalId = terminalId,
                userId = userId
            )
        )
    }

    /**
     * Process all pending offline awards. Called by LoyaltySyncWorker.
     * Returns number of successfully processed awards.
     */
    suspend fun processPendingAwards(): Int {
        val pending = pendingAwardDao.getAll()
        var processed = 0
        for (award in pending) {
            try {
                val request = LoyaltyAwardRequest(
                    phone = award.phone,
                    orderUuid = award.orderUuid,
                    orderTotal = award.orderTotal,
                    currency = award.currency,
                    storeId = award.storeId,
                    terminalId = award.terminalId
                )
                val response = loyaltyApi.awardPoints(accountKey, request)
                if (response.isSuccessful) {
                    pendingAwardDao.delete(award)
                    processed++
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to process pending award ${award.id}", e)
                break // Stop on first failure — likely no network
            }
        }
        return processed
    }

    /**
     * Process all pending consent updates. Called by LoyaltySyncWorker.
     * Returns number of successfully processed consent updates.
     */
    suspend fun processPendingConsents(): Int {
        val pending = pendingConsentDao.getAll()
        var processed = 0
        for (consent in pending) {
            try {
                val request = ConsentUpdateRequest(
                    phone = consent.phone,
                    consentGranted = consent.consentGranted,
                    consentSource = consent.consentSource,
                    brandName = consent.brandName,
                    storeId = consent.storeId,
                    terminalId = consent.terminalId,
                    userId = consent.userId,
                    consentTimestamp = consent.consentTimestamp
                )
                val response = loyaltyApi.updateConsent(accountKey, request)
                if (response.isSuccessful) {
                    pendingConsentDao.delete(consent)
                    processed++
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to process pending consent ${consent.id}", e)
                break
            }
        }
        return processed
    }
}
