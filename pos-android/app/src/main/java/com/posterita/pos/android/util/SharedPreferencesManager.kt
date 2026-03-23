package com.posterita.pos.android.util

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SharedPreferencesManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE)

    private val securePrefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "${Constants.PREFS_NAME}_secure",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        // If encrypted prefs are corrupted, clear them and retry once
        Log.e("SharedPreferencesManager", "Encrypted prefs failed, clearing and retrying", e)
        try {
            context.getSharedPreferences("${Constants.PREFS_NAME}_secure", Context.MODE_PRIVATE)
                .edit().clear().commit()
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "${Constants.PREFS_NAME}_secure",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (retryEx: Exception) {
            Log.e("SharedPreferencesManager", "Encrypted prefs retry also failed", retryEx)
            throw IllegalStateException(
                "Cannot create encrypted SharedPreferences. Sensitive data cannot be stored securely.", retryEx
            )
        }
    }

    var accountId: String
        get() {
            // Migrate from plain prefs if needed
            val secure = securePrefs.getString(Constants.ACCOUNT_ID, null)
            if (secure != null && secure != "null") return secure
            val plain = prefs.getString(Constants.ACCOUNT_ID, "") ?: ""
            if (plain.isNotEmpty() && plain != "null") {
                securePrefs.edit().putString(Constants.ACCOUNT_ID, plain).apply()
                prefs.edit().remove(Constants.ACCOUNT_ID).apply()
            }
            return if (plain == "null") "" else plain
        }
        set(value) {
            // Never store the string "null" — treat it as empty
            val sanitized = if (value == "null") "" else value
            securePrefs.edit().putString(Constants.ACCOUNT_ID, sanitized).apply()
        }

    var baseUrl: String
        get() = prefs.getString(Constants.KEY_BASE_URL, Constants.DEFAULT_BASE_URL) ?: Constants.DEFAULT_BASE_URL
        set(value) {
            val validated = validateUrl(value)
            prefs.edit().putString(Constants.KEY_BASE_URL, validated).apply()
        }

    /**
     * Validates and normalizes a server URL.
     * Enforces HTTPS unless targeting a local development IP.
     */
    private fun validateUrl(url: String): String {
        val trimmed = url.trim()
        if (trimmed.isEmpty()) return Constants.DEFAULT_BASE_URL

        // Allow HTTP for local dev IPs only
        val localPatterns = listOf("192.168.", "10.0.", "172.16.", "localhost", "127.0.0.1", "10.0.2.2")
        val isLocal = localPatterns.any { trimmed.contains(it, ignoreCase = true) }

        return when {
            trimmed.startsWith("https://") -> trimmed
            trimmed.startsWith("http://") && isLocal -> trimmed
            trimmed.startsWith("http://") && !isLocal -> trimmed.replaceFirst("http://", "https://")
            isLocal -> "http://$trimmed"
            else -> "https://$trimmed"
        }
    }

    var serverEndpointChecked: Boolean
        get() = prefs.getBoolean(Constants.SERVER_ENDPOINT_CHECKED, false)
        set(value) = prefs.edit().putBoolean(Constants.SERVER_ENDPOINT_CHECKED, value).apply()

    var userId: Int
        get() {
            val secure = securePrefs.getInt(Constants.USER_ID, 0)
            if (secure != 0) return secure
            val plain = prefs.getInt(Constants.USER_ID, 0)
            if (plain != 0) {
                securePrefs.edit().putInt(Constants.USER_ID, plain).apply()
                prefs.edit().remove(Constants.USER_ID).apply()
            }
            return plain
        }
        set(value) = securePrefs.edit().putInt(Constants.USER_ID, value).apply()

    var storeId: Int
        get() {
            val secure = securePrefs.getInt(Constants.STORE_ID, 0)
            if (secure != 0) return secure
            val plain = prefs.getInt(Constants.STORE_ID, 0)
            if (plain != 0) {
                securePrefs.edit().putInt(Constants.STORE_ID, plain).apply()
                prefs.edit().remove(Constants.STORE_ID).apply()
            }
            return plain
        }
        set(value) = securePrefs.edit().putInt(Constants.STORE_ID, value).apply()

    var terminalId: Int
        get() {
            val secure = securePrefs.getInt(Constants.TERMINAL_ID, 0)
            if (secure != 0) return secure
            val plain = prefs.getInt(Constants.TERMINAL_ID, 0)
            if (plain != 0) {
                securePrefs.edit().putInt(Constants.TERMINAL_ID, plain).apply()
                prefs.edit().remove(Constants.TERMINAL_ID).apply()
            }
            return plain
        }
        set(value) = securePrefs.edit().putInt(Constants.TERMINAL_ID, value).apply()

    var email: String
        get() {
            val secure = securePrefs.getString(Constants.EMAIL, null)
            if (secure != null) return secure
            val plain = prefs.getString(Constants.EMAIL, "") ?: ""
            if (plain.isNotEmpty()) {
                securePrefs.edit().putString(Constants.EMAIL, plain).apply()
                prefs.edit().remove(Constants.EMAIL).apply()
            }
            return plain
        }
        set(value) = securePrefs.edit().putString(Constants.EMAIL, value).apply()

    var ownerPhone: String
        get() {
            val secure = securePrefs.getString(Constants.OWNER_PHONE, null)
            if (secure != null) return secure
            val plain = prefs.getString(Constants.OWNER_PHONE, "") ?: ""
            if (plain.isNotEmpty()) {
                securePrefs.edit().putString(Constants.OWNER_PHONE, plain).apply()
                prefs.edit().remove(Constants.OWNER_PHONE).apply()
            }
            return plain
        }
        set(value) = securePrefs.edit().putString(Constants.OWNER_PHONE, value).apply()

    var syncDate: String
        get() = prefs.getString(Constants.SYNC_DATE, "2000-01-01 00:00:00") ?: "2000-01-01 00:00:00"
        set(value) = prefs.edit().putString(Constants.SYNC_DATE, value).apply()

    var storeName: String
        get() = prefs.getString(Constants.STORE_NAME, "") ?: ""
        set(value) = prefs.edit().putString(Constants.STORE_NAME, value).apply()

    var terminalName: String
        get() = prefs.getString(Constants.TERMINAL_NAME, "") ?: ""
        set(value) = prefs.edit().putString(Constants.TERMINAL_NAME, value).apply()

    var userName: String
        get() = prefs.getString(Constants.USER_NAME, "") ?: ""
        set(value) = prefs.edit().putString(Constants.USER_NAME, value).apply()

    var isTillOpen: String
        get() = prefs.getString(Constants.IS_TILL_OPEN, "") ?: ""
        set(value) = prefs.edit().putString(Constants.IS_TILL_OPEN, value).apply()

    fun getString(key: String, default: String = ""): String =
        prefs.getString(key, default) ?: default

    fun setString(key: String, value: String) =
        prefs.edit().putString(key, value).apply()

    /** Wipe all preferences — used by factory reset */
    fun clearAll() {
        prefs.edit().clear().commit()
        try { securePrefs.edit().clear().commit() } catch (_: Exception) {}
    }

    // Biometric login (stored encrypted)
    var biometricEnabled: Boolean
        get() = securePrefs.getBoolean(Constants.BIOMETRIC_ENABLED, false)
        set(value) = securePrefs.edit().putBoolean(Constants.BIOMETRIC_ENABLED, value).apply()

    var biometricEnrolledUserId: Int
        get() = securePrefs.getInt(Constants.BIOMETRIC_ENROLLED_USER_ID, 0)
        set(value) = securePrefs.edit().putInt(Constants.BIOMETRIC_ENROLLED_USER_ID, value).apply()

    var biometricEnrolledUserName: String
        get() = securePrefs.getString(Constants.BIOMETRIC_ENROLLED_USER_NAME, "") ?: ""
        set(value) = securePrefs.edit().putString(Constants.BIOMETRIC_ENROLLED_USER_NAME, value).apply()

    fun clearBiometricEnrollment() {
        securePrefs.edit()
            .remove(Constants.BIOMETRIC_ENABLED)
            .remove(Constants.BIOMETRIC_ENROLLED_USER_ID)
            .remove(Constants.BIOMETRIC_ENROLLED_USER_NAME)
            .apply()
        // Also clean up old plain prefs if migrating
        prefs.edit()
            .remove(Constants.BIOMETRIC_ENABLED)
            .remove(Constants.BIOMETRIC_ENROLLED_USER_ID)
            .remove(Constants.BIOMETRIC_ENROLLED_USER_NAME)
            .apply()
    }

    // POS Customization
    var productColumns: Int
        get() = prefs.getInt(Constants.POS_PRODUCT_COLUMNS, 3)
        set(value) = prefs.edit().putInt(Constants.POS_PRODUCT_COLUMNS, value).apply()

    var categoryMaxLines: Int
        get() = prefs.getInt(Constants.POS_CATEGORY_MAX_LINES, 2)
        set(value) = prefs.edit().putInt(Constants.POS_CATEGORY_MAX_LINES, value).apply()

    var categoryColumns: Int
        get() = prefs.getInt(Constants.POS_CATEGORY_COLUMNS, 3)
        set(value) = prefs.edit().putInt(Constants.POS_CATEGORY_COLUMNS, value).apply()

    var landscapeCategoryRows: Int
        get() = prefs.getInt(Constants.POS_LANDSCAPE_CATEGORY_ROWS, 1)
        set(value) = prefs.edit().putInt(Constants.POS_LANDSCAPE_CATEGORY_ROWS, value).apply()

    var landscapeCategoryColumns: Int
        get() = prefs.getInt(Constants.POS_LANDSCAPE_CATEGORY_COLUMNS, 4)
        set(value) = prefs.edit().putInt(Constants.POS_LANDSCAPE_CATEGORY_COLUMNS, value).apply()

    var showScanButton: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_SCAN_BUTTON, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_SCAN_BUTTON, value).apply()

    var showSearchButton: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_SEARCH_BUTTON, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_SEARCH_BUTTON, value).apply()

    var showClearButton: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_CLEAR_BUTTON, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_CLEAR_BUTTON, value).apply()

    var showCustButton: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_CUST_BUTTON, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_CUST_BUTTON, value).apply()

    var showMoreButton: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_MORE_BUTTON, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_MORE_BUTTON, value).apply()

    var showCategories: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_CATEGORIES, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_CATEGORIES, value).apply()

    var showProductImages: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_PRODUCT_IMAGES, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_PRODUCT_IMAGES, value).apply()

    var showProductPrice: Boolean
        get() = prefs.getBoolean(Constants.POS_SHOW_PRODUCT_PRICE, true)
        set(value) = prefs.edit().putBoolean(Constants.POS_SHOW_PRODUCT_PRICE, value).apply()

    var businessType: String
        get() = prefs.getString(Constants.POS_BUSINESS_TYPE, "retail") ?: "retail"
        set(value) = prefs.edit().putString(Constants.POS_BUSINESS_TYPE, value).apply()

    /** Terminal type from the enrolled terminal (synced from Room DB). */
    var terminalType: String
        get() = prefs.getString("terminal_type", "pos_retail") ?: "pos_retail"
        set(value) = prefs.edit().putString("terminal_type", value).apply()

    /** True if this terminal is a restaurant POS (has tables, kitchen, order types). */
    val isRestaurantTerminal: Boolean
        get() = terminalType == "pos_restaurant"

    /** True if this terminal is a KDS display (boots into full-screen kitchen grid). */
    val isKdsTerminal: Boolean
        get() = terminalType == "kds"

    /** True if this terminal is a staff mobile device (limited features). */
    val isMobileStaff: Boolean
        get() = terminalType == "mobile_staff"

    /** Backward compat — checks both terminal type and legacy businessType. */
    val isRestaurant: Boolean
        get() = isRestaurantTerminal || businessType == "restaurant"

    var accountSwitchingEnabled: Boolean
        get() = prefs.getBoolean("account_switching_enabled", true)
        set(value) = prefs.edit().putBoolean("account_switching_enabled", value).apply()

    // Scanner — auto-scan mode (default: true)
    var scannerAutoScan: Boolean
        get() = prefs.getBoolean(Constants.SCANNER_AUTO_SCAN, true)
        set(value) = prefs.edit().putBoolean(Constants.SCANNER_AUTO_SCAN, value).apply()

    // Cart item removal security — require note/reason when removing items (default: false)
    var cartRemovalRequireNote: Boolean
        get() = prefs.getBoolean(Constants.CART_REMOVAL_REQUIRE_NOTE, false)
        set(value) = prefs.edit().putBoolean(Constants.CART_REMOVAL_REQUIRE_NOTE, value).apply()

    // Cart item removal security — require supervisor PIN when removing items (default: false)
    var cartRemovalRequirePin: Boolean
        get() = prefs.getBoolean(Constants.CART_REMOVAL_REQUIRE_PIN, false)
        set(value) = prefs.edit().putBoolean(Constants.CART_REMOVAL_REQUIRE_PIN, value).apply()

    // Checkout — require customer number before checkout (default: true)
    var requireCustomerBeforeCheckout: Boolean
        get() = prefs.getBoolean(Constants.REQUIRE_CUSTOMER_BEFORE_CHECKOUT, true)
        set(value) = prefs.edit().putBoolean(Constants.REQUIRE_CUSTOMER_BEFORE_CHECKOUT, value).apply()

    // AI Configuration (stored encrypted)
    var aiApiKey: String
        get() = securePrefs.getString(Constants.AI_API_KEY, "") ?: ""
        set(value) = securePrefs.edit().putString(Constants.AI_API_KEY, value).apply()

    var aiProvider: String
        get() = prefs.getString(Constants.AI_PROVIDER, "claude") ?: "claude"
        set(value) = prefs.edit().putString(Constants.AI_PROVIDER, value).apply()

    // Loyalty Configuration (enabled by default)
    var loyaltyEnabled: Boolean
        get() = prefs.getBoolean(Constants.LOYALTY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(Constants.LOYALTY_ENABLED, value).apply()

    var loyaltyApiBaseUrl: String
        get() = prefs.getString(Constants.LOYALTY_API_BASE_URL, Constants.DEFAULT_LOYALTY_API_BASE_URL)
            ?: Constants.DEFAULT_LOYALTY_API_BASE_URL
        set(value) = prefs.edit().putString(Constants.LOYALTY_API_BASE_URL, value).apply()

    var loyaltyAccountKey: String
        get() = securePrefs.getString(Constants.LOYALTY_ACCOUNT_KEY, "") ?: ""
        set(value) = securePrefs.edit().putString(Constants.LOYALTY_ACCOUNT_KEY, value).apply()

    // Cloud Sync (Supabase via Vercel)
    var cloudSyncUrl: String
        get() = prefs.getString(Constants.CLOUD_SYNC_URL, Constants.DEFAULT_CLOUD_SYNC_URL)
            ?: Constants.DEFAULT_CLOUD_SYNC_URL
        set(value) = prefs.edit().putString(Constants.CLOUD_SYNC_URL, value).apply()

    var cloudSyncEnabled: Boolean
        get() = prefs.getBoolean("cloud_sync_enabled", true) // Enabled by default
        set(value) = prefs.edit().putBoolean("cloud_sync_enabled", value).apply()

    // HMAC sync secret (stored encrypted — used to sign sync API requests)
    var syncSecret: String
        get() = securePrefs.getString(Constants.SYNC_SECRET, "") ?: ""
        set(value) = securePrefs.edit().putString(Constants.SYNC_SECRET, value).apply()

    fun resetAccount() {
        val savedEmail = email
        val savedOwnerPhone = ownerPhone
        prefs.edit().clear().apply()
        securePrefs.edit().clear().apply()
        email = savedEmail
        ownerPhone = savedOwnerPhone
    }

    /**
     * Writes a string value synchronously (using commit instead of apply).
     * Use this when the value must be persisted before process exit.
     */
    fun setStringSync(key: String, value: String) {
        prefs.edit().putString(key, value).commit()
    }

    /**
     * Writes storeName synchronously for use before process restart.
     */
    fun setStoreNameSync(name: String) {
        prefs.edit().putString(Constants.STORE_NAME, name).commit()
    }

    /**
     * Writes terminalName synchronously for use before process restart.
     */
    fun setTerminalNameSync(name: String) {
        prefs.edit().putString(Constants.TERMINAL_NAME, name).commit()
    }

    /**
     * Writes storeId synchronously for use before process restart.
     */
    fun setStoreIdSync(id: Int) {
        securePrefs.edit().putInt(Constants.STORE_ID, id).commit()
    }

    /**
     * Writes terminalId synchronously for use before process restart.
     */
    fun setTerminalIdSync(id: Int) {
        securePrefs.edit().putInt(Constants.TERMINAL_ID, id).commit()
    }

    /**
     * Writes accountId synchronously for use before process restart.
     */
    fun setAccountIdSync(id: String) {
        securePrefs.edit().putString(Constants.ACCOUNT_ID, id).commit()
    }

    /**
     * Writes owner email synchronously for use before process restart or account switching.
     */
    fun setEmailSync(value: String) {
        securePrefs.edit().putString(Constants.EMAIL, value).commit()
    }

    fun setOwnerPhoneSync(value: String) {
        securePrefs.edit().putString(Constants.OWNER_PHONE, value).commit()
    }
}
