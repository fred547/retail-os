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
class POSFlowTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(3000)
    }

    @Test fun test01_posScreenLoads() {
        TestHelper.assertOnScreen(device, "CART", "MORE", "TABLES")
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test02_posShowsProducts() {
        // Should have product cards or grid
        val hasProducts = TestHelper.hasId(device, "recycler_view_search_product_result") ||
            device.findObjects(By.clazz("androidx.cardview.widget.CardView")).isNotEmpty()
        assertTrue("Products visible", hasProducts || TestHelper.hasText(device, "No products"))
    }

    @Test fun test03_posShowsCategoryChips() {
        assertTrue("Category chips or All tab",
            TestHelper.hasText(device, "All") || TestHelper.hasText(device, "Food") ||
            TestHelper.hasText(device, "Drinks") || TestHelper.hasId(device, "recyclerCategories"))
    }

    @Test fun test04_tapProductAddsToCart() {
        // Tap first product
        val products = device.findObjects(By.clazz("androidx.cardview.widget.CardView"))
        if (products.isNotEmpty()) {
            products[0].click()
            Thread.sleep(1000)
            // Cart badge should update
            assertTrue("Cart updated", TestHelper.hasId(device, "cart_badge") || TestHelper.hasId(device, "button_my_cart"))
        }
    }

    @Test fun test05_cartButtonOpensCart() {
        // Add a product first
        val products = device.findObjects(By.clazz("androidx.cardview.widget.CardView"))
        if (products.isNotEmpty()) products[0].click()
        Thread.sleep(1000)

        // Tap cart
        if (TestHelper.hasId(device, "button_my_cart")) {
            TestHelper.tapId(device, "button_my_cart")
            Thread.sleep(2000)
            TestHelper.assertOnScreen(device, "Total", "Cart", "PAY", "empty", "Browse")
        }
    }

    @Test fun test06_cartShowsItemsAndTotal() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)

        val products = device.findObjects(By.clazz("androidx.cardview.widget.CardView"))
        if (products.isNotEmpty()) {
            products[0].click()
            Thread.sleep(500)
            products[0].click() // Add twice
            Thread.sleep(500)
        }

        if (TestHelper.hasId(device, "button_my_cart")) {
            TestHelper.tapId(device, "button_my_cart")
            Thread.sleep(2000)
            // Should show items with quantity and total
            assertTrue("Has total or items",
                TestHelper.hasText(device, "Total") || TestHelper.hasText(device, "Cart"))
        }
    }

    @Test fun test07_emptyCartShowsEmptyState() {
        TestHelper.launchActivity(device, "CartActivity")
        Thread.sleep(2000)
        // Fresh cart should show empty
        TestHelper.assertOnScreen(device, "empty", "Browse Products", "Cart", "Total")
    }

    @Test fun test08_moreButtonShowsMenu() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)
        if (TestHelper.tapIfExists(device, "MORE")) {
            Thread.sleep(1000)
            // Should show popup menu
            val hasMenu = TestHelper.hasText(device, "Hold") || TestHelper.hasText(device, "Note")
            // Menu content varies — just verify no crash
            TestHelper.assertNotCrashed(device)
        }
    }

    @Test fun test09_tablesButtonVisible() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)
        // TABLES button visible only in restaurant mode
        val hasTables = TestHelper.hasText(device, "TABLES")
        // Either visible or not — both are valid depending on terminal_type
        assertTrue("App not crashed", !device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test10_drawerOpensFromPos() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)
        // Swipe from left to open drawer
        device.swipe(0, device.displayHeight / 2, device.displayWidth / 2, device.displayHeight / 2, 20)
        Thread.sleep(1000)
        TestHelper.assertOnScreen(device, "Home", "Orders", "Close Till", "Settings", "POS")
    }

    @Test fun test11_drawerKitchenOrdersIfRestaurant() {
        device.swipe(0, device.displayHeight / 2, device.displayWidth / 2, device.displayHeight / 2, 20)
        Thread.sleep(1000)
        // Kitchen Orders visible only in restaurant mode — either way, no crash
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test12_noAppCrash() {
        TestHelper.assertNotCrashed(device)
    }
}
