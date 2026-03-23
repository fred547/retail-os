package com.posterita.pos.android.ui

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Navigation flow tests — verifies tapping menu items opens correct screens
 * and back button returns to previous screen.
 *
 * Prerequisite: App must be logged in (past PIN/setup). Run LoginFlowTest first.
 *
 * Run: ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.posterita.pos.android.ui.NavigationFlowTest
 */
@RunWith(AndroidJUnit4::class)
class NavigationFlowTest {

    private lateinit var device: UiDevice

    @Before
    fun setup() {
        device = TestHelper.getDevice()
        TestHelper.launchActivity(device, "HomeActivity")
    }

    @Test
    fun homeScreenHasContent() {
        // Home should have some recognizable content
        val hasContent = device.hasObject(By.pkg(TestHelper.PACKAGE))
        assertTrue("Home has content", hasContent)
    }

    @Test
    fun settingsOpens() {
        // Try tapping Settings in bottom nav or drawer
        val settings = device.findObject(By.text("Settings"))
        if (settings != null) {
            settings.click()
            Thread.sleep(2000)
            // Settings should show Sync, Printers, etc.
            val hasSettingsContent = device.hasObject(By.text("Sync"))
                || device.hasObject(By.text("Printers"))
                || device.hasObject(By.text("Restaurant Mode"))
            assertTrue("Settings screen loaded", hasSettingsContent)
        }
    }

    @Test
    fun settingsTerminalsOpensWebView() {
        // Navigate: Home → Settings → Terminals
        val settings = device.findObject(By.text("Settings"))
        settings?.click()
        Thread.sleep(2000)

        val terminals = device.findObject(By.text("Terminals"))
        if (terminals != null) {
            terminals.click()
            Thread.sleep(5000) // WebView takes time to load

            // Should show WebView or "Terminals" title in top bar
            val webViewLoaded = device.hasObject(By.clazz("android.webkit.WebView"))
                || device.hasObject(By.textContains("Terminal"))
            assertTrue("Terminals WebView loaded", webViewLoaded)

            // Test back button
            device.pressBack()
            Thread.sleep(2000)
            val backToSettings = device.hasObject(By.text("Sync"))
                || device.hasObject(By.text("Printers"))
            assertTrue("Back returns to Settings", backToSettings)
        }
    }

    @Test
    fun posScreenLoads() {
        TestHelper.launchActivity(device, "ProductActivity")

        // POS should show cart button or product grid
        val hasPosContent = device.hasObject(By.textContains("CART"))
            || device.hasObject(By.textContains("MORE"))
            || TestHelper.hasId(device, "button_my_cart")
        assertTrue("POS screen has content", hasPosContent)
    }

    @Test
    fun cartOpensFromPos() {
        TestHelper.launchActivity(device, "ProductActivity")

        // Tap cart button
        val cartBtn = device.findObject(By.res("${TestHelper.PACKAGE}:id/button_my_cart"))
        cartBtn?.click()
        Thread.sleep(2000)

        // Cart should show total or empty message
        val hasCartContent = device.hasObject(By.textContains("Total"))
            || device.hasObject(By.textContains("empty"))
            || device.hasObject(By.textContains("Cart"))
        assertTrue("Cart screen loaded", hasCartContent)
    }

    @Test
    fun kitchenOrdersOpens() {
        TestHelper.launchActivity(device, "KitchenOrdersActivity")

        val hasContent = device.hasObject(By.textContains("Kitchen"))
            || device.hasObject(By.textContains("No"))
            || device.hasObject(By.textContains("order"))
        assertTrue("Kitchen Orders screen loaded", hasContent)
    }

    @Test
    fun rapidNavigationNoCrash() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val activities = listOf(
            "HomeActivity", "ProductActivity",
            "CartActivity", "KitchenOrdersActivity"
        )

        for (activity in activities) {
            val intent = Intent().apply {
                setClassName(TestHelper.PACKAGE, "${TestHelper.PACKAGE}.ui.activity.$activity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(intent)
                Thread.sleep(500)
            } catch (_: Exception) {}
        }

        Thread.sleep(2000)

        // App should still be running
        TestHelper.assertNotCrashed(device)
    }
}
