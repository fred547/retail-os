package com.posterita.pos.android.ui

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import org.junit.Assert.*

/**
 * Shared test infrastructure for all UI Automator tests.
 * Provides helpers for launching, navigating, and asserting.
 */
object TestHelper {
    const val PACKAGE = "com.posterita.pos.android"
    const val TIMEOUT = 10_000L
    const val LONG_TIMEOUT = 60_000L
    const val TEST_PIN = "1234"
    const val TEST_PASSWORD = "E2eTestPass123!"

    fun testEmail(): String = "e2e-${System.currentTimeMillis()}@test.posterita.com"
    fun testPhone(): String = "+2305${(System.currentTimeMillis() % 10000000)}"

    fun getDevice(): UiDevice = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())

    fun launchApp(device: UiDevice) {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = context.packageManager.getLaunchIntentForPackage(PACKAGE)
            ?: throw AssertionError("App not installed")
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(PACKAGE).depth(0)), TIMEOUT)
        Thread.sleep(3000)
    }

    fun launchActivity(device: UiDevice, activityName: String) {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = Intent().apply {
            setClassName(PACKAGE, "$PACKAGE.ui.activity.$activityName")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(PACKAGE)), TIMEOUT)
        Thread.sleep(2000)
    }

    fun waitForText(device: UiDevice, text: String, timeout: Long = TIMEOUT): Boolean {
        return device.wait(Until.hasObject(By.textContains(text)), timeout)
    }

    fun hasText(device: UiDevice, text: String): Boolean {
        return device.hasObject(By.textContains(text))
    }

    fun hasId(device: UiDevice, id: String): Boolean {
        return device.hasObject(By.res("$PACKAGE:id/$id"))
    }

    fun tapText(device: UiDevice, text: String) {
        val obj = device.findObject(By.text(text))
            ?: device.findObject(By.textContains(text))
            ?: throw AssertionError("Text '$text' not found on screen")
        obj.click()
        Thread.sleep(1000)
    }

    fun tapId(device: UiDevice, id: String) {
        val obj = device.findObject(By.res("$PACKAGE:id/$id"))
            ?: throw AssertionError("ID '$id' not found on screen")
        obj.click()
        Thread.sleep(1000)
    }

    fun tapIfExists(device: UiDevice, text: String): Boolean {
        val obj = device.findObject(By.text(text)) ?: device.findObject(By.textContains(text))
        return if (obj != null) { obj.click(); Thread.sleep(1000); true } else false
    }

    fun enterText(device: UiDevice, instance: Int, text: String) {
        val field = device.findObject(UiSelector().className("android.widget.EditText").instance(instance))
        field.clearTextField()
        field.setText(text)
        Thread.sleep(500)
    }

    fun enterPIN(device: UiDevice, pin: String) {
        for (digit in pin) {
            val btnId = "btn_$digit"
            try {
                tapId(device, btnId)
            } catch (_: Exception) {
                // Try by text as fallback
                tapText(device, digit.toString())
            }
            Thread.sleep(200)
        }
        Thread.sleep(1000)
    }

    fun unlockWithPIN(device: UiDevice) {
        enterPIN(device, TEST_PIN)
        Thread.sleep(3000)
    }

    fun scrollToText(device: UiDevice, text: String): Boolean {
        val scrollable = UiScrollable(UiSelector().scrollable(true))
        return try {
            scrollable.scrollTextIntoView(text)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun assertOnScreen(device: UiDevice, vararg texts: String) {
        val found = texts.any { hasText(device, it) }
        assertTrue(
            "Expected one of [${texts.joinToString()}] on screen",
            found
        )
    }

    fun assertNotCrashed(device: UiDevice) {
        assertFalse("App crashed", device.hasObject(By.textContains("has stopped")))
        assertFalse("App keeps stopping", device.hasObject(By.textContains("keeps stopping")))
        assertTrue("App still running", device.hasObject(By.pkg(PACKAGE)))
    }
}
