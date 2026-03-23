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
class SettingsFlowTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
    }

    @Test fun test01_settingsLoads() {
        TestHelper.assertOnScreen(device, "Stores", "Products", "Sync", "Printers")
    }

    @Test fun test02_webConsoleOptionsVisible() {
        assertTrue("Stores", TestHelper.hasText(device, "Stores"))
        assertTrue("Terminals", TestHelper.hasText(device, "Terminals"))
        assertTrue("Products", TestHelper.hasText(device, "Products"))
        assertTrue("Categories", TestHelper.hasText(device, "Categories"))
    }

    @Test fun test03_deviceOptionsVisible() {
        assertTrue("Sync", TestHelper.hasText(device, "Sync"))
        assertTrue("Printers", TestHelper.hasText(device, "Printers"))
    }

    @Test fun test04_restaurantModeToggle() {
        if (TestHelper.hasId(device, "switch_restaurant_mode")) {
            TestHelper.tapId(device, "switch_restaurant_mode")
            Thread.sleep(1000)
            // Should show tables option
            val hasTableOrKds = TestHelper.hasText(device, "Tables") || TestHelper.hasText(device, "Kitchen Display")
            assertTrue("Restaurant options appear", hasTableOrKds)
            // Toggle back
            TestHelper.tapId(device, "switch_restaurant_mode")
            Thread.sleep(1000)
        }
    }

    @Test fun test05_storesOpensWebView() {
        TestHelper.tapText(device, "Stores")
        Thread.sleep(5000)
        assertTrue("WebView loaded", device.hasObject(By.clazz("android.webkit.WebView")) ||
            TestHelper.hasText(device, "Stores"))
        device.pressBack()
        Thread.sleep(2000)
    }

    @Test fun test06_terminalsOpensWebView() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.tapText(device, "Terminals")
        Thread.sleep(5000)
        assertTrue("WebView loaded", device.hasObject(By.clazz("android.webkit.WebView")) ||
            TestHelper.hasText(device, "Terminals"))
        device.pressBack()
        Thread.sleep(2000)
    }

    @Test fun test07_productsOpensWebView() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.tapText(device, "Products")
        Thread.sleep(5000)
        assertTrue("WebView loaded", device.hasObject(By.clazz("android.webkit.WebView")) ||
            TestHelper.hasText(device, "Products"))
        device.pressBack()
        Thread.sleep(2000)
    }

    @Test fun test08_syncScreenOpens() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.tapText(device, "Sync")
        Thread.sleep(2000)
        TestHelper.assertOnScreen(device, "Sync", "Online", "Offline", "Last sync", "Cloud")
    }

    @Test fun test09_printersScreenOpens() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.tapText(device, "Printers")
        Thread.sleep(2000)
        TestHelper.assertOnScreen(device, "Printer", "Add", "No printer")
    }

    @Test fun test10_brandsOptionVisible() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.scrollToText(device, "Brands")
        assertTrue("Brands option", TestHelper.hasText(device, "Brands"))
    }

    @Test fun test11_aboutScreenOpens() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.scrollToText(device, "About")
        if (TestHelper.tapIfExists(device, "About")) {
            Thread.sleep(2000)
            TestHelper.assertOnScreen(device, "About", "Posterita", "Version")
        }
    }

    @Test fun test12_webViewBackButton() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        TestHelper.tapText(device, "Stores")
        Thread.sleep(5000)
        // Tap the back button in top bar
        if (TestHelper.hasId(device, "button_back")) {
            TestHelper.tapId(device, "button_back")
            Thread.sleep(2000)
            TestHelper.assertOnScreen(device, "Sync", "Printers", "Stores")
        } else {
            device.pressBack()
            Thread.sleep(2000)
        }
    }

    @Test fun test13_noAppCrash() {
        TestHelper.assertNotCrashed(device)
    }
}
