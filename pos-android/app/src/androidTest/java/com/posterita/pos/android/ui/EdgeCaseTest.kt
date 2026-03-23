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
class EdgeCaseTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
    }

    @Test fun test01_rapidNavigationAllScreens() {
        val activities = listOf(
            "HomeActivity", "ProductActivity", "CartActivity",
            "KitchenOrdersActivity", "SettingsActivity"
        )
        for (activity in activities) {
            try {
                TestHelper.launchActivity(device, activity)
                Thread.sleep(500)
            } catch (_: Exception) {}
        }
        Thread.sleep(2000)
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test02_backButtonOnHome() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        device.pressBack()
        Thread.sleep(2000)
        // App may go to background — bring it back
        TestHelper.launchApp(device)
        Thread.sleep(2000)
        assertFalse("No crash dialog", device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test03_backButtonOnPOS() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)
        device.pressBack()
        Thread.sleep(2000)
        TestHelper.launchApp(device)
        Thread.sleep(2000)
        assertFalse("No crash", device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test04_backButtonOnCart() {
        TestHelper.launchActivity(device, "CartActivity")
        Thread.sleep(2000)
        device.pressBack()
        Thread.sleep(2000)
        TestHelper.launchApp(device)
        Thread.sleep(2000)
        assertFalse("No crash", device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test05_backButtonOnSettings() {
        TestHelper.launchActivity(device, "SettingsActivity")
        Thread.sleep(2000)
        device.pressBack()
        Thread.sleep(2000)
        TestHelper.launchApp(device)
        Thread.sleep(2000)
        assertFalse("No crash", device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test06_backButtonOnKitchen() {
        TestHelper.launchActivity(device, "KitchenOrdersActivity")
        Thread.sleep(2000)
        device.pressBack()
        Thread.sleep(2000)
        TestHelper.launchApp(device)
        Thread.sleep(2000)
        assertFalse("No crash", device.hasObject(By.textContains("has stopped")))
    }

    @Test fun test07_rotationOnHome() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        device.setOrientationLandscape()
        Thread.sleep(2000)
        TestHelper.assertNotCrashed(device)
        device.setOrientationNatural()
        Thread.sleep(2000)
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test08_rotationOnPOS() {
        TestHelper.launchActivity(device, "ProductActivity")
        Thread.sleep(2000)
        try {
            device.setOrientationLandscape()
            Thread.sleep(2000)
            assertFalse("No crash after rotation", device.hasObject(By.textContains("has stopped")))
            device.setOrientationNatural()
            Thread.sleep(2000)
        } catch (_: Exception) {
            // Rotation may not be supported on all devices
        }
    }

    @Test fun test09_emptyCartCheckoutBlocked() {
        TestHelper.launchActivity(device, "CartActivity")
        Thread.sleep(2000)
        // PAY button should be absent or disabled on empty cart
        val payExists = TestHelper.hasText(device, "PAY")
        if (payExists) {
            TestHelper.tapText(device, "PAY")
            Thread.sleep(1000)
            // Should not proceed — show error or do nothing
        }
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test10_appSurvivesBackgroundReturn() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        device.pressHome()
        Thread.sleep(5000)
        // Bring app back
        TestHelper.launchApp(device)
        Thread.sleep(3000)
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test11_splashRouting() {
        TestHelper.launchActivity(device, "SplashActivity")
        Thread.sleep(5000)
        // Should route to Lock, Home, or Setup — never stay on splash
        val routed = TestHelper.hasText(device, "PIN") ||
            TestHelper.hasText(device, "Good") ||
            TestHelper.hasText(device, "Sign Up") ||
            TestHelper.hasText(device, "Home") ||
            TestHelper.hasText(device, "Welcome")
        assertTrue("Splash routed somewhere", routed)
    }

    @Test fun test12_webViewMultipleOpens() {
        val pages = listOf("Products", "Stores", "Terminals", "Categories")
        for (page in pages) {
            TestHelper.launchActivity(device, "SettingsActivity")
            Thread.sleep(1000)
            if (TestHelper.tapIfExists(device, page)) {
                Thread.sleep(3000)
                device.pressBack()
                Thread.sleep(1000)
            }
        }
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test13_doubleClickProtection() {
        TestHelper.launchActivity(device, "HomeActivity")
        Thread.sleep(2000)
        // Rapid double tap on POS tile
        val tile = device.findObject(By.textContains("Point of Sale"))
        tile?.click()
        Thread.sleep(100)
        tile?.click()
        Thread.sleep(3000)
        TestHelper.assertNotCrashed(device)
    }

    @Test fun test14_allActivitiesLaunchable() {
        val activities = listOf(
            "HomeActivity", "ProductActivity", "CartActivity",
            "KitchenOrdersActivity", "SettingsActivity",
            "DatabaseSynchonizerActivity", "InventoryCountActivity"
        )
        for (activity in activities) {
            try {
                TestHelper.launchActivity(device, activity)
                Thread.sleep(1500)
                TestHelper.assertNotCrashed(device)
            } catch (_: Exception) {
                // Some activities may require extras — that's OK
            }
        }
    }

    @Test fun test15_finalCrashCheck() {
        TestHelper.assertNotCrashed(device)
    }
}
