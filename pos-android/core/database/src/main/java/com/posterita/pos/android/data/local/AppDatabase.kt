package com.posterita.pos.android.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.posterita.pos.android.data.local.converter.JSONConverter
import com.posterita.pos.android.data.local.converter.TimestampConverter
import com.posterita.pos.android.data.local.dao.*
import com.posterita.pos.android.data.local.entity.*

@Database(
    entities = [
        Product::class, ProductCategory::class, DiscountCode::class, Modifier::class,
        Preference::class, Tax::class, Integration::class, User::class, Account::class,
        Store::class, Terminal::class, Customer::class, Till::class, TillAdjustment::class,
        Order::class, OrderLine::class, Sequence::class, Printer::class,
        HoldOrder::class, Payment::class, RestaurantTable::class,
        LoyaltyCache::class, PendingLoyaltyAward::class,
        PendingConsentUpdate::class,
        AuditEvent::class,
        ErrorLog::class,
        InventoryCountSession::class,
        InventoryCountEntry::class,
        TableSection::class,
        PreparationStation::class,
        CategoryStationMapping::class,
        SerialItem::class,
        LoyaltyConfig::class,
        Promotion::class,
        MenuSchedule::class,
        Shift::class,
        Delivery::class,
        TagGroup::class,
        Tag::class,
        ProductTag::class,
        Quotation::class,
        QuotationLine::class,
        StaffSchedule::class,
        StaffBreak::class,
        LeaveType::class,
        LeaveRequest::class,
        LeaveBalance::class
    ],
    version = 39,
    exportSchema = false
)
@TypeConverters(TimestampConverter::class, JSONConverter::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun accountDao(): AccountDao
    abstract fun customerDao(): CustomerDao
    abstract fun productDao(): ProductDao
    abstract fun productCategoryDao(): ProductCategoryDao
    abstract fun storeDao(): StoreDao
    abstract fun terminalDao(): TerminalDao
    abstract fun userDao(): UserDao
    abstract fun taxDao(): TaxDao
    abstract fun discountCodeDao(): DiscountCodeDao
    abstract fun modifierDao(): ModifierDao
    abstract fun integrationDao(): IntegrationDao
    abstract fun preferenceDao(): PreferenceDao
    abstract fun sequenceDao(): SequenceDao
    abstract fun orderDao(): OrderDao
    abstract fun orderLineDao(): OrderLineDao
    abstract fun tillDao(): TillDao
    abstract fun tillAdjustmentDao(): TillAdjustmentDao
    abstract fun printerDao(): PrinterDao
    abstract fun holdOrderDao(): HoldOrderDao
    abstract fun restaurantTableDao(): RestaurantTableDao
    abstract fun loyaltyCacheDao(): LoyaltyCacheDao
    abstract fun pendingLoyaltyAwardDao(): PendingLoyaltyAwardDao
    abstract fun pendingConsentUpdateDao(): PendingConsentUpdateDao
    abstract fun paymentDao(): PaymentDao
    abstract fun auditEventDao(): AuditEventDao
    abstract fun errorLogDao(): ErrorLogDao
    abstract fun inventoryCountSessionDao(): InventoryCountSessionDao
    abstract fun inventoryCountEntryDao(): InventoryCountEntryDao
    abstract fun tableSectionDao(): TableSectionDao
    abstract fun preparationStationDao(): PreparationStationDao
    abstract fun categoryStationMappingDao(): CategoryStationMappingDao
    abstract fun serialItemDao(): SerialItemDao
    abstract fun loyaltyConfigDao(): LoyaltyConfigDao
    abstract fun promotionDao(): PromotionDao
    abstract fun menuScheduleDao(): MenuScheduleDao
    abstract fun shiftDao(): ShiftDao
    abstract fun deliveryDao(): DeliveryDao
    abstract fun tagGroupDao(): TagGroupDao
    abstract fun tagDao(): TagDao
    abstract fun productTagDao(): ProductTagDao
    abstract fun quotationDao(): QuotationDao
    abstract fun quotationLineDao(): QuotationLineDao
    abstract fun staffScheduleDao(): StaffScheduleDao
    abstract fun staffBreakDao(): StaffBreakDao
    abstract fun leaveTypeDao(): LeaveTypeDao
    abstract fun leaveRequestDao(): LeaveRequestDao
    abstract fun leaveBalanceDao(): LeaveBalanceDao

    companion object {
        const val DATABASE_NAME = "POSTERITA_LITE_DB"

        @Volatile
        private var INSTANCE: AppDatabase? = null
        @Volatile
        private var INSTANCE_ACCOUNT_ID: String? = null

        fun getInstance(context: Context, accountId: String): AppDatabase {
            val current = INSTANCE
            // Return existing if it's for the same account
            if (current != null && INSTANCE_ACCOUNT_ID == accountId) return current

            return synchronized(this) {
                // Double-check inside lock
                val check = INSTANCE
                if (check != null && INSTANCE_ACCOUNT_ID == accountId) return check

                val dbName = "${DATABASE_NAME}_$accountId"
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    dbName
                )
                    .addMigrations(
                        MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7,
                        MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10,
                        MIGRATION_10_11, MIGRATION_11_12, MIGRATION_12_13,
                        MIGRATION_13_14, MIGRATION_14_15,
                        MIGRATION_15_16, MIGRATION_16_17,
                        MIGRATION_17_18, MIGRATION_18_19,
                        MIGRATION_19_20,
                        MIGRATION_20_21,
                        MIGRATION_21_22,
                        MIGRATION_22_23,
                        MIGRATION_23_24,
                        MIGRATION_24_25,
                        MIGRATION_25_26,
                        MIGRATION_26_27,
                        MIGRATION_27_28,
                        MIGRATION_28_29,
                        MIGRATION_29_30,
                        MIGRATION_30_31,
                        MIGRATION_31_32,
                        MIGRATION_32_33,
                        MIGRATION_33_34,
                        MIGRATION_34_35,
                        MIGRATION_35_36,
                        MIGRATION_36_37,
                        MIGRATION_37_38,
                        MIGRATION_38_39
                    )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                INSTANCE_ACCOUNT_ID = accountId
                instance
            }
        }

        fun resetInstance() {
            synchronized(this) {
                INSTANCE = null
                INSTANCE_ACCOUNT_ID = null
            }
        }

        /**
         * Build a dedicated (non-singleton) database for a specific brand.
         * Caller is responsible for closing it when done.
         * Used by CloudSyncWorker for multi-brand sync without disturbing the UI singleton.
         */
        fun buildDedicated(context: Context, accountId: String): AppDatabase {
            val dbName = "${DATABASE_NAME}_$accountId"
            return Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                dbName
            )
                .addMigrations(
                    MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7,
                    MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10,
                    MIGRATION_10_11, MIGRATION_11_12, MIGRATION_12_13,
                    MIGRATION_13_14, MIGRATION_14_15,
                    MIGRATION_15_16, MIGRATION_16_17,
                    MIGRATION_17_18, MIGRATION_18_19,
                    MIGRATION_19_20,
                    MIGRATION_20_21,
                    MIGRATION_21_22,
                    MIGRATION_22_23,
                    MIGRATION_23_24,
                    MIGRATION_24_25,
                    MIGRATION_25_26,
                    MIGRATION_26_27,
                    MIGRATION_27_28,
                    MIGRATION_28_29,
                    MIGRATION_29_30,
                    MIGRATION_30_31,
                    MIGRATION_31_32,
                    MIGRATION_32_33,
                    MIGRATION_33_34,
                    MIGRATION_34_35,
                    MIGRATION_35_36,
                    MIGRATION_36_37,
                    MIGRATION_37_38
                )
                .fallbackToDestructiveMigration()
                .build()
        }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE orders ADD COLUMN tips REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE orders ADD COLUMN note TEXT")
                db.execSQL("ALTER TABLE terminal ADD COLUMN isselected TEXT")
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE orders ADD COLUMN couponids TEXT")
            }
        }

        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE discountcode ADD COLUMN value REAL NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE product ADD COLUMN wholesaleprice REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE product ADD COLUMN iswholesaleprice TEXT")
                db.execSQL("ALTER TABLE product ADD COLUMN barcodetype TEXT")
                db.execSQL("ALTER TABLE product ADD COLUMN printordercopy TEXT")
                db.execSQL("ALTER TABLE product ADD COLUMN itemcode TEXT")
            }
        }

        private val MIGRATION_8_9 = object : Migration(8, 9) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE printer ADD COLUMN cash_drawer TEXT")
            }
        }

        private val MIGRATION_9_10 = object : Migration(9, 10) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `hold_orders` (`holdOrderId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `dateHold` INTEGER, `json` TEXT, `description` TEXT, `tillId` INTEGER NOT NULL DEFAULT 0, `terminalId` INTEGER NOT NULL DEFAULT 0, `storeId` INTEGER NOT NULL DEFAULT 0)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `payment` (`paymentId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `documentNo` TEXT, `tendered` REAL NOT NULL DEFAULT 0.0, `amount` REAL NOT NULL DEFAULT 0.0, `change` REAL NOT NULL DEFAULT 0.0, `paymentType` TEXT, `datePaid` INTEGER, `payAmt` REAL NOT NULL DEFAULT 0.0, `status` TEXT, `checknumber` TEXT, `extraInfo` TEXT)")
            }
        }

        private val MIGRATION_10_11 = object : Migration(10, 11) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `restaurant_table` (`table_id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `table_name` TEXT NOT NULL, `is_occupied` INTEGER NOT NULL DEFAULT 0, `current_order_id` TEXT, `store_id` INTEGER NOT NULL DEFAULT 0, `terminal_id` INTEGER NOT NULL DEFAULT 0, `seats` INTEGER NOT NULL DEFAULT 4, `created` INTEGER NOT NULL DEFAULT 0, `updated` INTEGER NOT NULL DEFAULT 0)")
            }
        }

        private val MIGRATION_11_12 = object : Migration(11, 12) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE user ADD COLUMN role TEXT")
                // Set the first user (user_id=1) as owner, existing admins as admin, others as staff
                db.execSQL("UPDATE user SET role = 'owner' WHERE user_id = (SELECT MIN(user_id) FROM user)")
                db.execSQL("UPDATE user SET role = 'admin' WHERE role IS NULL AND isadmin = 'Y'")
                db.execSQL("UPDATE user SET role = 'staff' WHERE role IS NULL")
            }
        }

        private val MIGRATION_12_13 = object : Migration(12, 13) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `loyalty_cache` (`phone` TEXT NOT NULL PRIMARY KEY, `points` INTEGER NOT NULL DEFAULT 0, `tier` TEXT, `vouchersJson` TEXT, `lastUpdated` INTEGER NOT NULL DEFAULT 0)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `pending_loyalty_award` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `phone` TEXT NOT NULL, `orderUuid` TEXT NOT NULL, `orderTotal` REAL NOT NULL DEFAULT 0.0, `currency` TEXT NOT NULL, `storeId` INTEGER NOT NULL DEFAULT 0, `terminalId` INTEGER NOT NULL DEFAULT 0, `createdAt` INTEGER NOT NULL DEFAULT 0)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `pending_consent_update` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `phone` TEXT NOT NULL, `consentGranted` INTEGER NOT NULL DEFAULT 0, `consentSource` TEXT NOT NULL DEFAULT 'POS', `brandName` TEXT, `storeId` INTEGER NOT NULL DEFAULT 0, `terminalId` INTEGER NOT NULL DEFAULT 0, `userId` INTEGER NOT NULL DEFAULT 0, `consentTimestamp` INTEGER NOT NULL DEFAULT 0, `createdAt` INTEGER NOT NULL DEFAULT 0)")
            }
        }

        private val MIGRATION_13_14 = object : Migration(13, 14) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Add currency to store (default from account)
                db.execSQL("ALTER TABLE store ADD COLUMN currency TEXT")
                // Add forex columns to till
                db.execSQL("ALTER TABLE till ADD COLUMN forexcurrency TEXT")
                db.execSQL("ALTER TABLE till ADD COLUMN forexamt REAL NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_14_15 = object : Migration(14, 15) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Flag for products whose price was set by staff and needs owner review
                db.execSQL("ALTER TABLE product ADD COLUMN needs_price_review TEXT")
                // Track who set the price
                db.execSQL("ALTER TABLE product ADD COLUMN price_set_by INTEGER NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_15_16 = object : Migration(15, 16) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE preference ADD COLUMN ai_api_key TEXT")
            }
        }

        private val MIGRATION_16_17 = object : Migration(16, 17) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Add orderId to payment so payments can be linked to orders
                db.execSQL("ALTER TABLE payment ADD COLUMN orderId INTEGER NOT NULL DEFAULT 0")
                // Add subtotal to orders for direct analytics (avoids computing grand_total - tax_total)
                db.execSQL("ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_17_18 = object : Migration(17, 18) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `audit_event` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `timestamp` INTEGER NOT NULL DEFAULT 0,
                        `userId` INTEGER NOT NULL DEFAULT 0,
                        `userName` TEXT,
                        `action` TEXT NOT NULL,
                        `detail` TEXT,
                        `reason` TEXT,
                        `supervisorId` INTEGER,
                        `storeId` INTEGER NOT NULL DEFAULT 0,
                        `terminalId` INTEGER NOT NULL DEFAULT 0,
                        `orderId` TEXT,
                        `isSynced` TEXT NOT NULL DEFAULT 'N'
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_18_19 = object : Migration(18, 19) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE account ADD COLUMN whatsappNumber TEXT")
                db.execSQL("ALTER TABLE account ADD COLUMN headOfficeAddress TEXT")
            }
        }

        private val MIGRATION_19_20 = object : Migration(19, 20) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE printer ADD COLUMN role TEXT NOT NULL DEFAULT 'receipt'")
            }
        }

        private val MIGRATION_20_21 = object : Migration(20, 21) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS error_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        timestamp INTEGER NOT NULL DEFAULT 0,
                        severity TEXT NOT NULL DEFAULT 'ERROR',
                        tag TEXT NOT NULL,
                        message TEXT NOT NULL,
                        stacktrace TEXT,
                        screen TEXT,
                        userId INTEGER NOT NULL DEFAULT 0,
                        userName TEXT,
                        storeId INTEGER NOT NULL DEFAULT 0,
                        terminalId INTEGER NOT NULL DEFAULT 0,
                        accountId TEXT,
                        deviceId TEXT,
                        appVersion TEXT,
                        osVersion TEXT,
                        isSynced TEXT NOT NULL DEFAULT 'N'
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_21_22 = object : Migration(21, 22) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // No-op: bridge migration for version alignment
            }
        }

        private val MIGRATION_22_23 = object : Migration(22, 23) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS inventory_count_session (
                        session_id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        store_id INTEGER NOT NULL DEFAULT 0,
                        type TEXT NOT NULL DEFAULT 'spot_check',
                        status TEXT NOT NULL DEFAULT 'created',
                        name TEXT,
                        started_at TEXT,
                        completed_at TEXT,
                        created_by INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT,
                        updated_at TEXT,
                        notes TEXT
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS inventory_count_entry (
                        entry_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        session_id INTEGER NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        product_id INTEGER NOT NULL DEFAULT 0,
                        product_name TEXT,
                        upc TEXT,
                        quantity INTEGER NOT NULL DEFAULT 1,
                        scanned_by INTEGER NOT NULL DEFAULT 0,
                        terminal_id INTEGER NOT NULL DEFAULT 0,
                        scanned_at INTEGER NOT NULL DEFAULT 0,
                        is_synced TEXT NOT NULL DEFAULT 'N'
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_23_24 = object : Migration(23, 24) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // New tables
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS table_section (
                        section_id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        store_id INTEGER NOT NULL DEFAULT 0,
                        name TEXT NOT NULL DEFAULT '',
                        display_order INTEGER NOT NULL DEFAULT 0,
                        color TEXT NOT NULL DEFAULT '#6B7280',
                        is_active INTEGER NOT NULL DEFAULT 1,
                        is_takeaway INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS preparation_station (
                        station_id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        store_id INTEGER NOT NULL DEFAULT 0,
                        name TEXT NOT NULL DEFAULT '',
                        station_type TEXT NOT NULL DEFAULT 'kitchen',
                        printer_id INTEGER,
                        color TEXT NOT NULL DEFAULT '#3B82F6',
                        display_order INTEGER NOT NULL DEFAULT 0,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS category_station_mapping (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        category_id INTEGER NOT NULL DEFAULT 0,
                        station_id INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT
                    )
                """.trimIndent())

                // Alter existing tables
                db.execSQL("ALTER TABLE restaurant_table ADD COLUMN section_id INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE product ADD COLUMN station_override_id INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE printer ADD COLUMN station_id INTEGER DEFAULT NULL")
            }
        }

        private val MIGRATION_24_25 = object : Migration(24, 25) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE terminal ADD COLUMN terminal_type TEXT NOT NULL DEFAULT 'pos_retail'")
                db.execSQL("ALTER TABLE terminal ADD COLUMN zone TEXT DEFAULT NULL")
            }
        }

        private val MIGRATION_25_26 = object : Migration(25, 26) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Rename timestamp columns to match Supabase schema
                db.execSQL("ALTER TABLE product RENAME COLUMN created TO created_at")
                db.execSQL("ALTER TABLE product RENAME COLUMN updated TO updated_at")
                // Add soft delete columns
                db.execSQL("ALTER TABLE product ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE product ADD COLUMN deleted_at TEXT DEFAULT NULL")
            }
        }

        private val MIGRATION_26_27 = object : Migration(26, 27) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE orders ADD COLUMN tillUuid TEXT")
            }
        }

        private val MIGRATION_27_28 = object : Migration(27, 28) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Serial item table for VIN/IMEI/serial number tracking
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS serial_item (
                        serial_item_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        account_id TEXT NOT NULL DEFAULT '',
                        product_id INTEGER NOT NULL DEFAULT 0,
                        store_id INTEGER NOT NULL DEFAULT 0,
                        serial_number TEXT NOT NULL DEFAULT '',
                        serial_type TEXT NOT NULL DEFAULT 'serial',
                        status TEXT NOT NULL DEFAULT 'in_stock',
                        supplier_name TEXT,
                        purchase_date TEXT,
                        cost_price REAL NOT NULL DEFAULT 0,
                        order_id INTEGER,
                        orderline_id INTEGER,
                        customer_id INTEGER,
                        sold_date TEXT,
                        selling_price REAL,
                        delivered_date TEXT,
                        warranty_months INTEGER NOT NULL DEFAULT 0,
                        warranty_expiry TEXT,
                        color TEXT,
                        year INTEGER,
                        engine_number TEXT,
                        notes TEXT,
                        is_deleted INTEGER NOT NULL DEFAULT 0,
                        is_sync INTEGER NOT NULL DEFAULT 1
                    )
                """.trimIndent())
                // Product: serialized flag
                db.execSQL("ALTER TABLE product ADD COLUMN is_serialized TEXT DEFAULT 'N'")
                // OrderLine: link to serial item
                db.execSQL("ALTER TABLE orderline ADD COLUMN serial_item_id INTEGER")
            }
        }

        private val MIGRATION_28_29 = object : Migration(28, 29) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE account ADD COLUMN brn TEXT")
                db.execSQL("ALTER TABLE account ADD COLUMN tan TEXT")
            }
        }

        private val MIGRATION_29_30 = object : Migration(29, 30) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE product ADD COLUMN quantity_on_hand REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE product ADD COLUMN reorder_point REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE product ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 1")
            }
        }

        private val MIGRATION_30_31 = object : Migration(30, 31) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS loyalty_config (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        points_per_currency REAL NOT NULL DEFAULT 1.0,
                        redemption_rate REAL NOT NULL DEFAULT 0.01,
                        min_redeem_points INTEGER NOT NULL DEFAULT 100,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        welcome_bonus INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS promotion (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        name TEXT NOT NULL DEFAULT '',
                        description TEXT,
                        type TEXT NOT NULL DEFAULT 'percentage_off',
                        discount_value REAL NOT NULL DEFAULT 0,
                        buy_quantity INTEGER,
                        get_quantity INTEGER,
                        applies_to TEXT NOT NULL DEFAULT 'order',
                        product_ids TEXT,
                        category_ids TEXT,
                        min_order_amount REAL,
                        max_discount_amount REAL,
                        promo_code TEXT,
                        max_uses INTEGER,
                        max_uses_per_customer INTEGER,
                        start_date TEXT,
                        end_date TEXT,
                        days_of_week TEXT,
                        start_time TEXT,
                        end_time TEXT,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        store_id INTEGER,
                        priority INTEGER NOT NULL DEFAULT 0,
                        is_deleted INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS menu_schedule (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        store_id INTEGER NOT NULL DEFAULT 0,
                        name TEXT NOT NULL DEFAULT '',
                        description TEXT,
                        category_ids TEXT,
                        start_time TEXT,
                        end_time TEXT,
                        days_of_week TEXT,
                        priority INTEGER NOT NULL DEFAULT 0,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS shift (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        store_id INTEGER NOT NULL DEFAULT 0,
                        terminal_id INTEGER NOT NULL DEFAULT 0,
                        user_id INTEGER NOT NULL DEFAULT 0,
                        user_name TEXT,
                        clock_in TEXT,
                        clock_out TEXT,
                        break_minutes INTEGER NOT NULL DEFAULT 0,
                        hours_worked REAL,
                        notes TEXT,
                        status TEXT NOT NULL DEFAULT 'active',
                        created_at TEXT
                    )
                """.trimIndent())

                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS delivery (
                        id INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
                        account_id TEXT NOT NULL DEFAULT '',
                        order_id INTEGER,
                        store_id INTEGER NOT NULL DEFAULT 0,
                        customer_id INTEGER,
                        customer_name TEXT,
                        customer_phone TEXT,
                        delivery_address TEXT,
                        delivery_city TEXT,
                        delivery_notes TEXT,
                        driver_id INTEGER,
                        driver_name TEXT,
                        status TEXT NOT NULL DEFAULT 'pending',
                        estimated_time TEXT,
                        actual_delivery_at TEXT,
                        assigned_at TEXT,
                        picked_up_at TEXT,
                        distance_km REAL,
                        delivery_fee REAL,
                        is_deleted INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_31_32 = object : Migration(31, 32) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Warehouse enhancements: variance tracking + staff assignment
                db.execSQL("ALTER TABLE inventory_count_session ADD COLUMN assigned_to INTEGER")
                db.execSQL("ALTER TABLE inventory_count_session ADD COLUMN variance_count INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE inventory_count_entry ADD COLUMN system_qty REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE inventory_count_entry ADD COLUMN variance REAL NOT NULL DEFAULT 0")
                // Product: shelf location, batch, expiry
                db.execSQL("ALTER TABLE product ADD COLUMN shelf_location TEXT")
                db.execSQL("ALTER TABLE product ADD COLUMN batch_number TEXT")
                db.execSQL("ALTER TABLE product ADD COLUMN expiry_date TEXT")
            }
        }

        private val MIGRATION_32_33 = object : Migration(32, 33) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Nested categories: parent reference + level
                db.execSQL("ALTER TABLE productcategory ADD COLUMN parent_category_id INTEGER")
                db.execSQL("ALTER TABLE productcategory ADD COLUMN level INTEGER NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_34_35 = object : Migration(34, 35) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Store type: retail or warehouse
                db.execSQL("ALTER TABLE store ADD COLUMN store_type TEXT NOT NULL DEFAULT 'retail'")
            }
        }

        private val MIGRATION_35_36 = object : Migration(35, 36) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Shift offline sync: UUID for de-duplication + sync tracking
                db.execSQL("ALTER TABLE shift ADD COLUMN uuid TEXT")
                db.execSQL("ALTER TABLE shift ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_36_37 = object : Migration(36, 37) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `quotation` (`quotation_id` INTEGER NOT NULL PRIMARY KEY, `account_id` TEXT NOT NULL, `store_id` INTEGER NOT NULL DEFAULT 0, `terminal_id` INTEGER NOT NULL DEFAULT 0, `customer_id` INTEGER, `customer_name` TEXT, `customer_email` TEXT, `customer_phone` TEXT, `customer_address` TEXT, `document_no` TEXT, `status` TEXT NOT NULL DEFAULT 'draft', `uuid` TEXT, `subtotal` REAL NOT NULL DEFAULT 0, `tax_total` REAL NOT NULL DEFAULT 0, `grand_total` REAL NOT NULL DEFAULT 0, `currency` TEXT, `notes` TEXT, `terms` TEXT, `valid_until` TEXT, `template_id` TEXT NOT NULL DEFAULT 'classic', `converted_order_id` INTEGER, `created_by` INTEGER NOT NULL DEFAULT 0, `sent_at` TEXT, `accepted_at` TEXT, `is_deleted` INTEGER NOT NULL DEFAULT 0, `created_at` TEXT, `updated_at` TEXT)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `quotation_line` (`line_id` INTEGER NOT NULL PRIMARY KEY, `quotation_id` INTEGER NOT NULL DEFAULT 0, `product_id` INTEGER, `product_name` TEXT NOT NULL, `description` TEXT, `quantity` REAL NOT NULL DEFAULT 1, `unit_price` REAL NOT NULL DEFAULT 0, `discount_percent` REAL NOT NULL DEFAULT 0, `tax_id` INTEGER NOT NULL DEFAULT 0, `tax_rate` REAL NOT NULL DEFAULT 0, `line_total` REAL NOT NULL DEFAULT 0, `position` INTEGER NOT NULL DEFAULT 0)")
            }
        }

        private val MIGRATION_33_34 = object : Migration(33, 34) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Tags: grouped product/customer/order classification for reporting
                db.execSQL("CREATE TABLE IF NOT EXISTS `tag_group` (`tag_group_id` INTEGER NOT NULL PRIMARY KEY, `account_id` TEXT NOT NULL, `name` TEXT NOT NULL, `description` TEXT, `color` TEXT NOT NULL DEFAULT '#6B7280', `is_active` INTEGER NOT NULL DEFAULT 1, `is_deleted` INTEGER NOT NULL DEFAULT 0, `created_at` TEXT, `updated_at` TEXT)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `tag` (`tag_id` INTEGER NOT NULL PRIMARY KEY, `account_id` TEXT NOT NULL, `tag_group_id` INTEGER NOT NULL, `name` TEXT NOT NULL, `color` TEXT, `position` INTEGER NOT NULL DEFAULT 0, `is_active` INTEGER NOT NULL DEFAULT 1, `is_deleted` INTEGER NOT NULL DEFAULT 0, `created_at` TEXT, `updated_at` TEXT)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `product_tag` (`product_id` INTEGER NOT NULL, `tag_id` INTEGER NOT NULL, `account_id` TEXT NOT NULL, PRIMARY KEY(`product_id`, `tag_id`))")
            }
        }

        private val MIGRATION_37_38 = object : Migration(37, 38) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""CREATE TABLE IF NOT EXISTS staff_schedule (
                    id INTEGER NOT NULL PRIMARY KEY,
                    account_id TEXT NOT NULL DEFAULT '',
                    store_id INTEGER NOT NULL DEFAULT 0,
                    user_id INTEGER NOT NULL DEFAULT 0,
                    date TEXT NOT NULL DEFAULT '',
                    start_time TEXT NOT NULL DEFAULT '',
                    end_time TEXT NOT NULL DEFAULT '',
                    break_minutes INTEGER NOT NULL DEFAULT 0,
                    role_override TEXT,
                    notes TEXT,
                    status TEXT NOT NULL DEFAULT 'scheduled',
                    created_by INTEGER,
                    created_at TEXT,
                    updated_at TEXT
                )""")
                db.execSQL("""CREATE TABLE IF NOT EXISTS staff_break (
                    id INTEGER NOT NULL PRIMARY KEY,
                    shift_id INTEGER,
                    account_id TEXT NOT NULL DEFAULT '',
                    user_id INTEGER NOT NULL DEFAULT 0,
                    break_type TEXT NOT NULL DEFAULT 'unpaid',
                    start_time TEXT,
                    end_time TEXT,
                    duration_minutes INTEGER,
                    created_at TEXT
                )""")
                db.execSQL("""CREATE TABLE IF NOT EXISTS leave_type (
                    id INTEGER NOT NULL PRIMARY KEY,
                    account_id TEXT NOT NULL DEFAULT '',
                    name TEXT NOT NULL DEFAULT '',
                    paid INTEGER NOT NULL DEFAULT 1,
                    default_days INTEGER NOT NULL DEFAULT 0,
                    color TEXT NOT NULL DEFAULT '#1976D2',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT
                )""")
                db.execSQL("""CREATE TABLE IF NOT EXISTS leave_request (
                    id INTEGER NOT NULL PRIMARY KEY,
                    account_id TEXT NOT NULL DEFAULT '',
                    user_id INTEGER NOT NULL DEFAULT 0,
                    leave_type_id INTEGER NOT NULL DEFAULT 0,
                    start_date TEXT NOT NULL DEFAULT '',
                    end_date TEXT NOT NULL DEFAULT '',
                    days REAL NOT NULL DEFAULT 0.0,
                    reason TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    approved_by INTEGER,
                    approved_at TEXT,
                    rejection_reason TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )""")
                db.execSQL("""CREATE TABLE IF NOT EXISTS leave_balance (
                    id INTEGER NOT NULL PRIMARY KEY,
                    account_id TEXT NOT NULL DEFAULT '',
                    user_id INTEGER NOT NULL DEFAULT 0,
                    leave_type_id INTEGER NOT NULL DEFAULT 0,
                    year INTEGER NOT NULL DEFAULT 0,
                    total_days REAL NOT NULL DEFAULT 0.0,
                    used_days REAL NOT NULL DEFAULT 0.0
                )""")
                // Extend shift table
                db.execSQL("ALTER TABLE shift ADD COLUMN scheduled_start TEXT")
                db.execSQL("ALTER TABLE shift ADD COLUMN scheduled_end TEXT")
                db.execSQL("ALTER TABLE shift ADD COLUMN overtime_minutes INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE shift ADD COLUMN is_late INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE shift ADD COLUMN late_minutes INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE shift ADD COLUMN total_break_minutes INTEGER NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_38_39 = object : Migration(38, 39) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Terminal lock modes
                db.execSQL("ALTER TABLE terminal ADD COLUMN lock_mode TEXT NOT NULL DEFAULT 'exploration'")
                db.execSQL("ALTER TABLE terminal ADD COLUMN locked_device_id TEXT")
            }
        }
    }
}
