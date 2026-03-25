package com.posterita.pos.android.di

import android.content.Context
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.*
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    fun provideDatabase(
        @ApplicationContext context: Context,
        prefsManager: SharedPreferencesManager
    ): AppDatabase {
        val accountId = prefsManager.accountId
        // Never create a "default" DB — use the actual account or fail gracefully
        require(accountId.isNotEmpty() && accountId != "null") {
            "Cannot provide database: no active account_id in prefs"
        }
        return AppDatabase.getInstance(context, accountId)
    }

    @Provides
    @Singleton
    fun provideShoppingCart(): ShoppingCart = ShoppingCart()

    @Provides fun provideAccountDao(db: AppDatabase): AccountDao = db.accountDao()
    @Provides fun provideCustomerDao(db: AppDatabase): CustomerDao = db.customerDao()
    @Provides fun provideProductDao(db: AppDatabase): ProductDao = db.productDao()
    @Provides fun provideProductCategoryDao(db: AppDatabase): ProductCategoryDao = db.productCategoryDao()
    @Provides fun provideStoreDao(db: AppDatabase): StoreDao = db.storeDao()
    @Provides fun provideTerminalDao(db: AppDatabase): TerminalDao = db.terminalDao()
    @Provides fun provideUserDao(db: AppDatabase): UserDao = db.userDao()
    @Provides fun provideTaxDao(db: AppDatabase): TaxDao = db.taxDao()
    @Provides fun provideDiscountCodeDao(db: AppDatabase): DiscountCodeDao = db.discountCodeDao()
    @Provides fun provideModifierDao(db: AppDatabase): ModifierDao = db.modifierDao()
    @Provides fun provideIntegrationDao(db: AppDatabase): IntegrationDao = db.integrationDao()
    @Provides fun providePreferenceDao(db: AppDatabase): PreferenceDao = db.preferenceDao()
    @Provides fun provideSequenceDao(db: AppDatabase): SequenceDao = db.sequenceDao()
    @Provides fun provideOrderDao(db: AppDatabase): OrderDao = db.orderDao()
    @Provides fun provideOrderLineDao(db: AppDatabase): OrderLineDao = db.orderLineDao()
    @Provides fun provideTillDao(db: AppDatabase): TillDao = db.tillDao()
    @Provides fun provideTillAdjustmentDao(db: AppDatabase): TillAdjustmentDao = db.tillAdjustmentDao()
    @Provides fun providePrinterDao(db: AppDatabase): PrinterDao = db.printerDao()
    @Provides fun provideHoldOrderDao(db: AppDatabase): HoldOrderDao = db.holdOrderDao()
    @Provides fun provideLoyaltyCacheDao(db: AppDatabase): LoyaltyCacheDao = db.loyaltyCacheDao()
    @Provides fun providePendingLoyaltyAwardDao(db: AppDatabase): PendingLoyaltyAwardDao = db.pendingLoyaltyAwardDao()
    @Provides fun providePendingConsentUpdateDao(db: AppDatabase): PendingConsentUpdateDao = db.pendingConsentUpdateDao()
    @Provides fun providePaymentDao(db: AppDatabase): PaymentDao = db.paymentDao()
    @Provides fun provideErrorLogDao(db: AppDatabase): ErrorLogDao = db.errorLogDao()
    @Provides fun providePreparationStationDao(db: AppDatabase): PreparationStationDao = db.preparationStationDao()
}
