package com.posterita.pos.android.service

import com.posterita.pos.android.data.local.dao.PromotionDao
import com.posterita.pos.android.data.local.entity.Promotion
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Evaluates promotions locally against the cart (offline-first).
 * Promotions are pulled from server via sync and stored in Room.
 */
@Singleton
class PromotionService @Inject constructor(
    private val promotionDao: PromotionDao,
    private val prefsManager: SharedPreferencesManager
) {
    data class AppliedPromotion(
        val promotion: Promotion,
        val discountAmount: Double,
        val description: String
    )

    /**
     * Find all applicable promotions for the current cart (auto-apply only, no promo codes).
     * Returns list of promotions sorted by discount amount (highest first).
     */
    suspend fun findApplicablePromotions(
        cartItems: List<CartItem>,
        subtotal: Double,
        storeId: Int
    ): List<AppliedPromotion> {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return emptyList()

        val promotions = promotionDao.getActivePromotionsForStore(accountId, storeId)
        val now = Calendar.getInstance()
        val results = mutableListOf<AppliedPromotion>()

        for (promo in promotions) {
            // Skip promo code promotions (those require manual entry)
            if (promo.type == Promotion.TYPE_PROMO_CODE) continue
            if (!isWithinDateRange(promo, now)) continue
            if (!isWithinTimeRange(promo, now)) continue
            if (!isOnActiveDay(promo, now)) continue
            val minAmount = promo.min_order_amount
            if (minAmount != null && subtotal < minAmount) continue

            val applied = evaluatePromotion(promo, cartItems, subtotal)
            if (applied != null) results.add(applied)
        }

        return results.sortedByDescending { it.discountAmount }
    }

    /**
     * Validate a promo code against the cart.
     */
    suspend fun validatePromoCode(
        code: String,
        cartItems: List<CartItem>,
        subtotal: Double
    ): AppliedPromotion? {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return null

        val promo = promotionDao.getByPromoCode(accountId, code) ?: return null
        val now = Calendar.getInstance()

        if (!isWithinDateRange(promo, now)) return null
        if (!isWithinTimeRange(promo, now)) return null
        if (!isOnActiveDay(promo, now)) return null
        val minAmount = promo.min_order_amount
        if (minAmount != null && subtotal < minAmount) return null

        return evaluatePromotion(promo, cartItems, subtotal)
    }

    private fun evaluatePromotion(
        promo: Promotion,
        cartItems: List<CartItem>,
        subtotal: Double
    ): AppliedPromotion? {
        return when (promo.type) {
            Promotion.TYPE_PERCENTAGE_OFF -> evaluatePercentageOff(promo, cartItems, subtotal)
            Promotion.TYPE_FIXED_OFF -> evaluateFixedOff(promo, cartItems, subtotal)
            Promotion.TYPE_BUY_X_GET_Y -> evaluateBuyXGetY(promo, cartItems)
            Promotion.TYPE_PROMO_CODE -> evaluatePercentageOff(promo, cartItems, subtotal) // Promo codes use same logic
            else -> null
        }
    }

    private fun evaluatePercentageOff(
        promo: Promotion,
        cartItems: List<CartItem>,
        subtotal: Double
    ): AppliedPromotion? {
        val applicableAmount = getApplicableAmount(promo, cartItems, subtotal)
        if (applicableAmount <= 0) return null

        var discount = applicableAmount * promo.discount_value / 100.0
        val maxDiscount = promo.max_discount_amount
        if (maxDiscount != null && discount > maxDiscount) {
            discount = maxDiscount
        }

        return AppliedPromotion(
            promotion = promo,
            discountAmount = discount,
            description = "${promo.name}: ${promo.discount_value.toInt()}% off"
        )
    }

    private fun evaluateFixedOff(
        promo: Promotion,
        cartItems: List<CartItem>,
        subtotal: Double
    ): AppliedPromotion? {
        val applicableAmount = getApplicableAmount(promo, cartItems, subtotal)
        if (applicableAmount <= 0) return null

        val discount = minOf(promo.discount_value, applicableAmount)

        return AppliedPromotion(
            promotion = promo,
            discountAmount = discount,
            description = "${promo.name}: ${promo.discount_value} off"
        )
    }

    private fun evaluateBuyXGetY(
        promo: Promotion,
        cartItems: List<CartItem>
    ): AppliedPromotion? {
        val buyQty = promo.buy_quantity ?: return null
        val getQty = promo.get_quantity ?: return null
        val applicableItems = getApplicableItems(promo, cartItems)
        if (applicableItems.isEmpty()) return null

        val totalQty = applicableItems.sumOf { it.qty }.toInt()
        val sets = totalQty / (buyQty + getQty)
        if (sets <= 0) return null

        // Free items = cheapest items up to getQty * sets
        val sortedByPrice = applicableItems.sortedBy { it.priceEntered }
        var freeItems = getQty * sets
        var discount = 0.0
        for (item in sortedByPrice) {
            if (freeItems <= 0) break
            val freeFromThis = minOf(freeItems.toDouble(), item.qty)
            discount += freeFromThis * item.priceEntered
            freeItems -= freeFromThis.toInt()
        }

        return AppliedPromotion(
            promotion = promo,
            discountAmount = discount,
            description = "${promo.name}: Buy $buyQty get $getQty free"
        )
    }

    private fun getApplicableAmount(
        promo: Promotion,
        cartItems: List<CartItem>,
        subtotal: Double
    ): Double {
        return when (promo.applies_to) {
            Promotion.APPLIES_TO_ORDER -> subtotal
            Promotion.APPLIES_TO_PRODUCT, Promotion.APPLIES_TO_CATEGORY -> {
                getApplicableItems(promo, cartItems).sumOf { it.lineAmt }
            }
            else -> subtotal
        }
    }

    private fun getApplicableItems(
        promo: Promotion,
        cartItems: List<CartItem>
    ): List<CartItem> {
        return when (promo.applies_to) {
            Promotion.APPLIES_TO_PRODUCT -> {
                val productIds = parseJsonIntArray(promo.product_ids)
                if (productIds.isEmpty()) cartItems
                else cartItems.filter { it.product.product_id in productIds }
            }
            Promotion.APPLIES_TO_CATEGORY -> {
                val categoryIds = parseJsonIntArray(promo.category_ids)
                if (categoryIds.isEmpty()) cartItems
                else cartItems.filter { it.product.productcategory_id in categoryIds }
            }
            else -> cartItems
        }
    }

    private fun parseJsonIntArray(json: String?): Set<Int> {
        if (json.isNullOrBlank()) return emptySet()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getInt(it) }.toSet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun isWithinDateRange(promo: Promotion, now: Calendar): Boolean {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val today = dateFormat.format(now.time)

        val startDate = promo.start_date
        if (startDate != null && today < startDate.substring(0, minOf(10, startDate.length))) return false
        val endDate = promo.end_date
        if (endDate != null && today > endDate.substring(0, minOf(10, endDate.length))) return false
        return true
    }

    private fun isWithinTimeRange(promo: Promotion, now: Calendar): Boolean {
        val startTime = promo.start_time
        val endTime = promo.end_time
        if (startTime == null && endTime == null) return true
        val currentTime = String.format("%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE))

        if (startTime != null && currentTime < startTime) return false
        if (endTime != null && currentTime > endTime) return false
        return true
    }

    private fun isOnActiveDay(promo: Promotion, now: Calendar): Boolean {
        val daysJson = promo.days_of_week ?: return true
        return try {
            val arr = JSONArray(daysJson)
            val dayNames = (0 until arr.length()).map { arr.getString(it).lowercase() }
            val todayName = when (now.get(Calendar.DAY_OF_WEEK)) {
                Calendar.MONDAY -> "monday"
                Calendar.TUESDAY -> "tuesday"
                Calendar.WEDNESDAY -> "wednesday"
                Calendar.THURSDAY -> "thursday"
                Calendar.FRIDAY -> "friday"
                Calendar.SATURDAY -> "saturday"
                Calendar.SUNDAY -> "sunday"
                else -> ""
            }
            dayNames.isEmpty() || todayName in dayNames
        } catch (e: Exception) {
            true // If can't parse, assume active
        }
    }
}
