package com.posterita.pos.android.util

object Constants {
    const val PREFS_NAME = "SharedPref"
    const val DATABASE_NAME = "POSTERITA_LITE_DB"

    // SharedPreferences keys
    const val KEY_BASE_URL = "baseUrl"
    const val DEFAULT_BASE_URL = "https://my.posterita.com/posteritabo"
    const val ACCOUNT_ID = "account_id"
    const val STORE_ID = "store_id"
    const val TERMINAL_ID = "terminal_id"
    const val STORE_NAME = "store_name"
    const val TERMINAL_NAME = "terminal_name"
    const val USER_ID = "user_id"
    const val USER_NAME = "user_name"
    const val IS_TILL_OPEN = "is_till_open"
    const val SERVER_ENDPOINT_CHECKED = "server_endpoint_checked"
    const val SYNC_DATE = "sync_date"
    const val EMAIL = "email"
    const val OWNER_PHONE = "owner_phone"

    // Biometric login
    const val BIOMETRIC_ENROLLED_USER_ID = "biometric_enrolled_user_id"
    const val BIOMETRIC_ENROLLED_USER_NAME = "biometric_enrolled_user_name"
    const val BIOMETRIC_ENABLED = "biometric_enabled"

    // Intent extras
    const val ORDER_DETAILS = "ORDER_DETAILS"

    // Display limits
    const val PRODUCT_DISPLAY_LIMIT = 50
    const val CUSTOMER_DISPLAY_LIMIT = 20

    // POS Customization
    const val POS_PRODUCT_COLUMNS = "pos_product_columns" // 1, 2, 3 (default 3)
    const val POS_CATEGORY_MAX_LINES = "pos_category_max_lines" // 1, 2, 3 (default 2)
    const val POS_CATEGORY_COLUMNS = "pos_category_columns" // 2, 3, 4 (default 3)
    const val POS_LANDSCAPE_CATEGORY_ROWS = "pos_landscape_category_rows" // 1, 2 (default 1)
    const val POS_LANDSCAPE_CATEGORY_COLUMNS = "pos_landscape_category_columns" // 3, 4, 5, 6, 7, 8 (default 4)
    const val POS_SHOW_SCAN_BUTTON = "pos_show_scan_button"
    const val POS_SHOW_SEARCH_BUTTON = "pos_show_search_button"
    const val POS_SHOW_CLEAR_BUTTON = "pos_show_clear_button"
    const val POS_SHOW_CUST_BUTTON = "pos_show_cust_button"
    const val POS_SHOW_MORE_BUTTON = "pos_show_more_button"
    const val POS_SHOW_CATEGORIES = "pos_show_categories"
    const val POS_SHOW_PRODUCT_IMAGES = "pos_show_product_images"
    const val POS_SHOW_PRODUCT_PRICE = "pos_show_product_price"
    const val POS_BUSINESS_TYPE = "pos_business_type" // "retail" or "restaurant"

    // Checkout
    const val REQUIRE_CUSTOMER_BEFORE_CHECKOUT = "require_customer_before_checkout"

    // AI Configuration
    const val AI_API_KEY = "ai_api_key"
    const val AI_PROVIDER = "ai_provider" // "claude" for now

    // Loyalty
    const val LOYALTY_ENABLED = "loyalty_enabled"
    const val LOYALTY_API_BASE_URL = "loyalty_api_base_url"
    const val DEFAULT_LOYALTY_API_BASE_URL = "https://loyalty.posterita.com/api/"
    const val LOYALTY_ACCOUNT_KEY = "loyalty_account_key"

    // Cloud Sync (Supabase via Vercel)
    const val CLOUD_SYNC_URL = "cloud_sync_url"
    const val DEFAULT_CLOUD_SYNC_URL = "https://posterita-cloud.vercel.app/api/"
    const val CLOUD_LAST_SYNC_AT = "cloud_last_sync_at"

    // URLs
    const val SIGN_UP_URL = "https://my.posterita.com/posteritabo/sign-up.do"

    // Demo mode — do NOT hardcode credentials in source code.
    // Configure demo account email via Settings > Demo Account.
    const val DEMO_EMAIL = "" // Set via Settings > Demo Account
}
