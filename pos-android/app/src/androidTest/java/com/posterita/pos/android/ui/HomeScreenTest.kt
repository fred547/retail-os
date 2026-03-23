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
class HomeScreenTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(3000)
    }

    @Test fun test01_homeShowsGreeting() {
        TestHelper.assertOnScreen(device, "Good morning", "Good afternoon", "Good evening", "Hello")
    }

    @Test fun test02_homeShowsContextBar() {
        assertTrue("Brand context", TestHelper.hasId(device, "textContextBrand") || TestHelper.hasText(device, "Store"))
    }

    @Test fun test03_homeShowsSummaryCard() {
        assertTrue("Summary card exists", TestHelper.hasId(device, "cardSummary") || TestHelper.hasText(device, "Today"))
    }

    @Test fun test04_homeShowsAppGrid() {
        TestHelper.assertOnScreen(device, "Point of Sale", "POS", "Orders", "Settings")
    }

    @Test fun test05_homeShowsBottomNav() {
        assertTrue("Bottom nav", TestHelper.hasText(device, "Home") || TestHelper.hasText(device, "POS"))
    }

    @Test fun test06_connectivityDotExists() {
        assertTrue("Connectivity dot", TestHelper.hasId(device, "connectivity_dot"))
    }

    @Test fun test07_tapPOSTileOpensProduct() {
        if (TestHelper.tapIfExists(device, "Point of Sale")) {
            Thread.sleep(3000)
            TestHelper.assertOnScreen(device, "CART", "MORE", "Open Till", "product")
        }
    }

    @Test fun test08_tapOrdersTileOpens() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        if (TestHelper.tapIfExists(device, "Orders")) {
            Thread.sleep(3000)
            TestHelper.assertOnScreen(device, "Orders", "No orders", "Today")
        }
    }

    @Test fun test09_tapSettingsTileOpens() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        if (TestHelper.tapIfExists(device, "Settings")) {
            Thread.sleep(2000)
            TestHelper.assertOnScreen(device, "Sync", "Printers", "Stores", "Products")
        }
    }

    @Test fun test10_tapBrandsTileOpens() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        if (TestHelper.tapIfExists(device, "Brands")) {
            Thread.sleep(3000)
            TestHelper.assertOnScreen(device, "Brands", "Demo", "Live")
        }
    }

    @Test fun test11_noAppCrash() {
        TestHelper.assertNotCrashed(device)
    }
}
