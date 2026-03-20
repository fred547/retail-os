package com.posterita.pos.android

import com.posterita.pos.android.data.local.dao.LoyaltyCacheDao
import com.posterita.pos.android.data.local.dao.PendingConsentUpdateDao
import com.posterita.pos.android.data.local.dao.PendingLoyaltyAwardDao
import com.posterita.pos.android.data.local.entity.LoyaltyCache
import com.posterita.pos.android.data.local.entity.PendingConsentUpdate
import com.posterita.pos.android.data.local.entity.PendingLoyaltyAward
import com.posterita.pos.android.data.remote.LoyaltyApiService
import com.posterita.pos.android.data.remote.model.request.LoyaltyAwardRequest
import com.posterita.pos.android.data.remote.model.response.LoyaltyAwardResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyBalanceResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyRedeemResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyValidateResponse
import com.posterita.pos.android.data.remote.model.response.LoyaltyVoucher
import com.posterita.pos.android.data.repository.LoyaltyRepository
import com.posterita.pos.android.util.SharedPreferencesManager
import kotlinx.coroutines.runBlocking
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.*
import retrofit2.Response

/**
 * Tests for LoyaltyRepository: API calls, caching, offline queue, phone normalization.
 */
class LoyaltyRepositoryTest {

    private lateinit var api: LoyaltyApiService
    private lateinit var cacheDao: LoyaltyCacheDao
    private lateinit var awardDao: PendingLoyaltyAwardDao
    private lateinit var consentDao: PendingConsentUpdateDao
    private lateinit var prefs: SharedPreferencesManager
    private lateinit var repo: LoyaltyRepository

    @Before
    fun setup() {
        api = mock()
        cacheDao = mock()
        awardDao = mock()
        consentDao = mock()
        prefs = mock {
            on { loyaltyEnabled } doReturn true
            on { loyaltyAccountKey } doReturn "test-key"
        }
        repo = LoyaltyRepository(api, cacheDao, awardDao, consentDao, prefs)
    }

    // ======================== PHONE NORMALIZATION ========================

    @Test
    fun `normalizePhone strips spaces and dashes`() {
        assertEquals("+23012345678", repo.normalizePhone("+230 1234 5678"))
        assertEquals("+23012345678", repo.normalizePhone("+230-1234-5678"))
        assertEquals("12345678", repo.normalizePhone("1234 5678"))
    }

    @Test
    fun `normalizePhone strips parentheses`() {
        assertEquals("+23012345678", repo.normalizePhone("+230 (1234) 5678"))
    }

    @Test
    fun `normalizePhone handles already clean numbers`() {
        assertEquals("+23012345678", repo.normalizePhone("+23012345678"))
    }

    @Test
    fun `normalizePhone handles empty and blank strings`() {
        assertEquals("", repo.normalizePhone(""))
        assertEquals("", repo.normalizePhone("   "))
    }

    // ======================== GET BALANCE ========================

    @Test
    fun `getBalance returns null for empty phone`(): Unit = runBlocking {
        val result = repo.getBalance("")
        assertNull(result)
        verify(api, never()).getBalance(any(), any())
    }

    @Test
    fun `getBalance returns null for blank phone`(): Unit = runBlocking {
        val result = repo.getBalance("   ")
        assertNull(result)
        verify(api, never()).getBalance(any(), any())
    }

    @Test
    fun `getBalance returns API result and caches it`(): Unit = runBlocking {
        val balance = LoyaltyBalanceResponse(
            phone = "+23012345678",
            points = 500,
            tier = "Gold",
            activeVouchers = listOf(LoyaltyVoucher(code = "V1", discountValue = 50.0))
        )
        whenever(api.getBalance("+23012345678", "test-key")).thenReturn(Response.success(balance))

        val result = repo.getBalance("+230 1234 5678")

        assertNotNull(result)
        assertEquals(500, result!!.points)
        assertEquals("Gold", result.tier)
        assertEquals(1, result.activeVouchers.size)
        assertEquals("V1", result.activeVouchers[0].code)

        // Verify cache was updated
        verify(cacheDao).upsert(argThat { phone == "+23012345678" && points == 500 && tier == "Gold" })
    }

    @Test
    fun `getBalance returns cached data on API error response`(): Unit = runBlocking {
        whenever(api.getBalance(any(), any())).thenReturn(
            Response.error(500, "error".toResponseBody(null))
        )
        whenever(cacheDao.getByPhone("+23012345678")).thenReturn(
            LoyaltyCache(phone = "+23012345678", points = 300, tier = "Silver")
        )

        val result = repo.getBalance("+23012345678")

        assertNotNull(result)
        assertEquals(300, result!!.points)
        assertEquals("Silver", result.tier)
    }

    @Test
    fun `getBalance returns cached data on network exception`(): Unit = runBlocking {
        whenever(api.getBalance(any(), any())).thenThrow(RuntimeException("No network"))
        whenever(cacheDao.getByPhone("+23012345678")).thenReturn(
            LoyaltyCache(phone = "+23012345678", points = 100)
        )

        val result = repo.getBalance("+23012345678")

        assertNotNull(result)
        assertEquals(100, result!!.points)
    }

    @Test
    fun `getBalance returns null when API fails and no cache exists`(): Unit = runBlocking {
        whenever(api.getBalance(any(), any())).thenThrow(RuntimeException("No network"))
        whenever(cacheDao.getByPhone(any())).thenReturn(null)

        val result = repo.getBalance("+23012345678")
        assertNull(result)
    }

    @Test
    fun `getBalance normalizes phone before API call`(): Unit = runBlocking {
        whenever(api.getBalance(eq("+23012345678"), any())).thenReturn(
            Response.success(LoyaltyBalanceResponse(phone = "+23012345678", points = 10))
        )

        repo.getBalance("+230 1234 5678")

        // API must be called with normalized phone
        verify(api).getBalance(eq("+23012345678"), eq("test-key"))
    }

    // ======================== AWARD POINTS ========================

    @Test
    fun `awardPoints returns success and updates cache`(): Unit = runBlocking {
        val request = LoyaltyAwardRequest(
            phone = "+23012345678", orderUuid = "order-1",
            orderTotal = 500.0, currency = "MUR", storeId = 1, terminalId = 1
        )
        val response = LoyaltyAwardResponse(
            phone = "+23012345678", newBalance = 550, pointsAwarded = 50
        )
        whenever(api.awardPoints("test-key", request)).thenReturn(Response.success(response))
        whenever(cacheDao.getByPhone("+23012345678")).thenReturn(
            LoyaltyCache(phone = "+23012345678", points = 500)
        )

        val result = repo.awardPoints(request)

        assertTrue(result.isSuccess)
        assertEquals(550, result.getOrNull()?.newBalance)
        assertEquals(50, result.getOrNull()?.pointsAwarded)
        verify(cacheDao).upsert(argThat { points == 550 })
    }

    @Test
    fun `awardPoints queues pending award on API error`(): Unit = runBlocking {
        val request = LoyaltyAwardRequest(
            phone = "+230 1234 5678", orderUuid = "order-1",
            orderTotal = 500.0, currency = "MUR", storeId = 1, terminalId = 1
        )
        whenever(api.awardPoints(any(), any())).thenReturn(
            Response.error(500, "error".toResponseBody(null))
        )

        val result = repo.awardPoints(request)

        assertTrue(result.isFailure)
        verify(awardDao).insert(argThat {
            phone == "+23012345678" && orderUuid == "order-1" && orderTotal == 500.0
        })
    }

    @Test
    fun `awardPoints queues pending award on network exception`(): Unit = runBlocking {
        val request = LoyaltyAwardRequest(
            phone = "+23012345678", orderUuid = "order-1",
            orderTotal = 200.0, currency = "MUR", storeId = 1, terminalId = 1
        )
        whenever(api.awardPoints(any(), any())).thenThrow(RuntimeException("Offline"))

        val result = repo.awardPoints(request)

        assertTrue(result.isFailure)
        verify(awardDao).insert(any())
    }

    @Test
    fun `awardPoints does not update cache when no cached entry exists`(): Unit = runBlocking {
        val request = LoyaltyAwardRequest(
            phone = "+23012345678", orderUuid = "order-1",
            orderTotal = 100.0, currency = "MUR", storeId = 1, terminalId = 1
        )
        val response = LoyaltyAwardResponse(
            phone = "+23012345678", newBalance = 10, pointsAwarded = 10
        )
        whenever(api.awardPoints(any(), any())).thenReturn(Response.success(response))
        whenever(cacheDao.getByPhone(any())).thenReturn(null)

        val result = repo.awardPoints(request)

        assertTrue(result.isSuccess)
        // upsert should not be called since there is no cached entry
        verify(cacheDao, never()).upsert(any())
    }

    // ======================== VALIDATE VOUCHER ========================

    @Test
    fun `validateVoucher returns success with discount details`(): Unit = runBlocking {
        val response = LoyaltyValidateResponse(
            voucherId = "V1", valid = true, discountType = "FIXED", discountValue = 100.0
        )
        whenever(api.validateVoucher("test-key", "VOUCHER1", "+23012345678"))
            .thenReturn(Response.success(response))

        val result = repo.validateVoucher("VOUCHER1", "+230 1234 5678")
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.valid)
        assertEquals(100.0, result.getOrNull()?.discountValue ?: 0.0, 0.01)
        assertEquals("FIXED", result.getOrNull()?.discountType)
    }

    @Test
    fun `validateVoucher returns failure on API error`(): Unit = runBlocking {
        whenever(api.validateVoucher(any(), any(), any()))
            .thenReturn(Response.error(404, "not found".toResponseBody(null)))

        val result = repo.validateVoucher("INVALID", "+23012345678")
        assertTrue(result.isFailure)
    }

    @Test
    fun `validateVoucher returns failure on network exception`(): Unit = runBlocking {
        whenever(api.validateVoucher(any(), any(), any()))
            .thenThrow(RuntimeException("No network"))

        val result = repo.validateVoucher("V1", "+23012345678")
        assertTrue(result.isFailure)
    }

    @Test
    fun `validateVoucher normalizes phone`(): Unit = runBlocking {
        whenever(api.validateVoucher(eq("test-key"), eq("V1"), eq("+23012345678")))
            .thenReturn(Response.success(LoyaltyValidateResponse(valid = true)))

        repo.validateVoucher("V1", "+230 1234 5678")

        verify(api).validateVoucher("test-key", "V1", "+23012345678")
    }

    // ======================== REDEEM VOUCHER ========================

    @Test
    fun `redeemVoucher returns success`(): Unit = runBlocking {
        val response = LoyaltyRedeemResponse(
            voucherId = "V1", redeemed = true, discountApplied = 100.0
        )
        whenever(api.redeemVoucher("test-key", "V1", "+23012345678", "order-1"))
            .thenReturn(Response.success(response))

        val result = repo.redeemVoucher("V1", "+230 1234 5678", "order-1")
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.redeemed)
        assertEquals(100.0, result.getOrNull()?.discountApplied ?: 0.0, 0.01)
    }

    @Test
    fun `redeemVoucher returns failure on API error`(): Unit = runBlocking {
        whenever(api.redeemVoucher(any(), any(), any(), any()))
            .thenReturn(Response.error(400, "already redeemed".toResponseBody(null)))

        val result = repo.redeemVoucher("V1", "+23012345678", "order-1")
        assertTrue(result.isFailure)
    }

    @Test
    fun `redeemVoucher returns failure on network exception`(): Unit = runBlocking {
        whenever(api.redeemVoucher(any(), any(), any(), any()))
            .thenThrow(RuntimeException("Offline"))

        val result = repo.redeemVoucher("V1", "+23012345678", "order-1")
        assertTrue(result.isFailure)
    }

    // ======================== UPDATE CONSENT ========================

    @Test
    fun `updateConsent calls API on success and does not queue`(): Unit = runBlocking {
        whenever(api.updateConsent(eq("test-key"), any())).thenReturn(Response.success(Unit))

        val result = repo.updateConsent("+230 1234 5678", true, "TestBrand", 1, 1, 1)
        assertTrue(result.isSuccess)
        verify(consentDao, never()).insert(any())
    }

    @Test
    fun `updateConsent queues offline on API failure`(): Unit = runBlocking {
        whenever(api.updateConsent(any(), any())).thenReturn(
            Response.error(500, "error".toResponseBody(null))
        )

        val result = repo.updateConsent("+23012345678", true)
        assertTrue(result.isFailure)
        verify(consentDao).insert(argThat { phone == "+23012345678" && consentGranted })
    }

    @Test
    fun `updateConsent queues offline on network exception`(): Unit = runBlocking {
        whenever(api.updateConsent(any(), any())).thenThrow(RuntimeException("Offline"))

        val result = repo.updateConsent("+23012345678", false)
        assertTrue(result.isFailure)
        verify(consentDao).insert(argThat { !consentGranted })
    }

    @Test
    fun `updateConsent normalizes phone before API call and queuing`(): Unit = runBlocking {
        whenever(api.updateConsent(any(), any())).thenReturn(Response.success(Unit))

        repo.updateConsent("+230 1234 5678", true)

        verify(api).updateConsent(eq("test-key"), argThat { phone == "+23012345678" })
    }

    // ======================== PROCESS PENDING AWARDS ========================

    @Test
    fun `processPendingAwards processes all and removes successful`(): Unit = runBlocking {
        val pending = listOf(
            PendingLoyaltyAward(id = 1, phone = "+230111", orderUuid = "o1", orderTotal = 100.0, currency = "MUR", storeId = 1, terminalId = 1),
            PendingLoyaltyAward(id = 2, phone = "+230222", orderUuid = "o2", orderTotal = 200.0, currency = "MUR", storeId = 1, terminalId = 1)
        )
        whenever(awardDao.getAll()).thenReturn(pending)
        whenever(api.awardPoints(any(), any())).thenReturn(
            Response.success(LoyaltyAwardResponse(phone = "", newBalance = 10, pointsAwarded = 10))
        )

        val count = repo.processPendingAwards()

        assertEquals(2, count)
        verify(awardDao, times(2)).delete(any())
    }

    @Test
    fun `processPendingAwards stops on first network failure`(): Unit = runBlocking {
        val pending = listOf(
            PendingLoyaltyAward(id = 1, phone = "+230111", orderUuid = "o1", orderTotal = 100.0, currency = "MUR", storeId = 1, terminalId = 1),
            PendingLoyaltyAward(id = 2, phone = "+230222", orderUuid = "o2", orderTotal = 200.0, currency = "MUR", storeId = 1, terminalId = 1)
        )
        whenever(awardDao.getAll()).thenReturn(pending)
        whenever(api.awardPoints(any(), any())).thenThrow(RuntimeException("No network"))

        val count = repo.processPendingAwards()

        assertEquals(0, count)
        verify(awardDao, never()).delete(any())
    }

    @Test
    fun `processPendingAwards keeps failed items in queue on API error`(): Unit = runBlocking {
        val pending = listOf(
            PendingLoyaltyAward(id = 1, phone = "+230111", orderUuid = "o1", orderTotal = 100.0, currency = "MUR", storeId = 1, terminalId = 1)
        )
        whenever(awardDao.getAll()).thenReturn(pending)
        whenever(api.awardPoints(any(), any())).thenReturn(
            Response.error(400, "bad request".toResponseBody(null))
        )

        val count = repo.processPendingAwards()

        assertEquals(0, count)
        verify(awardDao, never()).delete(any())
    }

    @Test
    fun `processPendingAwards returns 0 when queue is empty`(): Unit = runBlocking {
        whenever(awardDao.getAll()).thenReturn(emptyList())
        assertEquals(0, repo.processPendingAwards())
    }

    // ======================== PROCESS PENDING CONSENTS ========================

    @Test
    fun `processPendingConsents processes all and removes successful`(): Unit = runBlocking {
        val pending = listOf(
            PendingConsentUpdate(id = 1, phone = "+230111", consentGranted = true),
            PendingConsentUpdate(id = 2, phone = "+230222", consentGranted = false)
        )
        whenever(consentDao.getAll()).thenReturn(pending)
        whenever(api.updateConsent(any(), any())).thenReturn(Response.success(Unit))

        val count = repo.processPendingConsents()

        assertEquals(2, count)
        verify(consentDao, times(2)).delete(any())
    }

    @Test
    fun `processPendingConsents stops on first network failure`(): Unit = runBlocking {
        val pending = listOf(
            PendingConsentUpdate(id = 1, phone = "+230111", consentGranted = true),
            PendingConsentUpdate(id = 2, phone = "+230222", consentGranted = false)
        )
        whenever(consentDao.getAll()).thenReturn(pending)
        whenever(api.updateConsent(any(), any())).thenThrow(RuntimeException("No network"))

        val count = repo.processPendingConsents()

        assertEquals(0, count)
        verify(consentDao, never()).delete(any())
    }

    @Test
    fun `processPendingConsents returns 0 when queue is empty`(): Unit = runBlocking {
        whenever(consentDao.getAll()).thenReturn(emptyList())
        assertEquals(0, repo.processPendingConsents())
    }

    // ======================== ENABLED FLAG ========================

    @Test
    fun `isEnabled reflects SharedPreferencesManager value`() {
        whenever(prefs.loyaltyEnabled).thenReturn(false)
        assertFalse(repo.isEnabled)
        whenever(prefs.loyaltyEnabled).thenReturn(true)
        assertTrue(repo.isEnabled)
    }
}
