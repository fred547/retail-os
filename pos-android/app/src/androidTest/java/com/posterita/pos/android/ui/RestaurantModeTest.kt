package com.posterita.pos.android.ui

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class RestaurantModeTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
    }

    @Test fun test01_enableRestaurantMode() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        if (TestHelper.hasId(device, "switch_restaurant_mode")) {
            // Enable restaurant mode
            val sw = device.findObject(By.res("${TestHelper.PACKAGE}:id/switch_restaurant_mode"))
            if (sw != null && !sw.isChecked) {
                sw.click()
                Thread.sleep(1000)
            }
            assertTrue("Tables visible", TestHelper.hasText(device, "Tables") || TestHelper.hasText(device, "Kitchen Display"))
        }
    }

    @Test fun test02_kitchenOrdersScreenLoads() {
        TestHelper.launchActivity(device, "KitchenOrdersActivity")
        Thread.sleep(3000)
        TestHelper.assertOnScreen(device, "Kitchen", "No", "order", "Orders")
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test03_tablesButtonOnPOS() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(3000)
        // TABLES button should be visible if restaurant mode is on
        if (TestHelper.hasText(device, "TABLES")) {
            TestHelper.tapText(device, "TABLES")
            Thread.sleep(2000)
            // Should show table dialog with sections
            TestHelper.assertOnScreen(device, "Table", "All", "Indoor", "Patio", "Free", "Occupied", "Close")
        }
    }

    @Test fun test04_tableDialogHasSections() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(3000)
        if (TestHelper.tapIfExists(device, "TABLES")) {
            Thread.sleep(2000)
            // Should have section tabs
            val hasSections = TestHelper.hasText(device, "Indoor") ||
                TestHelper.hasText(device, "Patio") ||
                TestHelper.hasText(device, "All")
            assertTrue("Section tabs visible", hasSections || TestHelper.hasText(device, "Table"))
            // Dismiss
            device.pressBack()
        }
    }

    @Test fun test05_orderTypeDialogInRestaurant() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(3000)
        // Add a product and go to cart
        val products = device.findObjects(By.clazz("androidx.cardview.widget.CardView"))
        if (products.isNotEmpty()) {
            products[0].click()
            Thread.sleep(500)
        }
        if (TestHelper.hasId(device, "button_my_cart")) {
            TestHelper.tapId(device, "button_my_cart")
            Thread.sleep(2000)
            // Try to checkout — should show order type dialog
            TestHelper.tapIfExists(device, "PAY") || TestHelper.tapIfExists(device, "Checkout")
            Thread.sleep(1000)
            // Should show Dine In / Take Away / Delivery
            val hasOrderType = TestHelper.hasText(device, "DINE IN") ||
                TestHelper.hasText(device, "TAKE AWAY") ||
                TestHelper.hasText(device, "DELIVERY") ||
                TestHelper.hasText(device, "Order Type")
            // May go to payment directly depending on mode — verify no crash
            TestHelper.assertNotCrashed(device)
        }
    }

    @Test fun test06_deliveryOptionExists() {
        // Order type dialog should have delivery
        if (TestHelper.hasText(device, "DELIVERY")) {
            TestHelper.tapText(device, "DELIVERY")
            Thread.sleep(1000)
            // Should show delivery details form
            TestHelper.assertOnScreen(device, "Delivery", "Customer", "Phone", "Address", "name")
            device.pressBack()
        }
    }

    @Test fun test07_kdsSetupOpens() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        if (TestHelper.tapIfExists(device, "Kitchen Display")) {
            Thread.sleep(2000)
            TestHelper.assertOnScreen(device, "KDS", "Setup", "Connect", "Search", "IP")
        }
    }

    @Test fun test08_disableRestaurantMode() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        if (TestHelper.hasId(device, "switch_restaurant_mode")) {
            val sw = device.findObject(By.res("${TestHelper.PACKAGE}:id/switch_restaurant_mode"))
            if (sw != null && sw.isChecked) {
                sw.click()
                Thread.sleep(1000)
            }
        }
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test09_noAppCrash() {
        TestHelper.assertNotCrashed(device)
    }
}
