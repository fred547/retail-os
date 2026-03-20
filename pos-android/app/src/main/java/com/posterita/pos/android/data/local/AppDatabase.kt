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
import com.posterita.pos.android.util.Constants

@Database(
    entities = [
        Product::class, ProductCategory::class, DiscountCode::class, Modifier::class,
        Preference::class, Tax::class, Integration::class, User::class, Account::class,
        Store::class, Terminal::class, Customer::class, Till::class, TillAdjustment::class,
        Order::class, OrderLine::class, Sequence::class, Printer::class,
        HoldOrder::class, Payment::class, RestaurantTable::class,
        LoyaltyCache::class, PendingLoyaltyAward::class,
        PendingConsentUpdate::class,
        AuditEvent::class
    ],
    version = 19,
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

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context, accountId: String): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val dbName = "${Constants.DATABASE_NAME}_$accountId"
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
                        MIGRATION_17_18, MIGRATION_18_19
                    )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }

        fun resetInstance() {
            INSTANCE = null
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
    }
}
