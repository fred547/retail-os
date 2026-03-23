package com.posterita.pos.android.ui

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Automated UI flow tests using UI Automator 2.
 * Works on any screen size — finds elements by resource ID or text, not coordinates.
 *
 * Run: ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.posterita.pos.android.ui.LoginFlowTest
 */
@RunWith(AndroidJUnit4::class)
class LoginFlowTest {

    private lateinit var device: UiDevice
    private val PACKAGE = "com.posterita.pos.android"
    private val TIMEOUT = 10_000L

    @Before
    fun setup() {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())

        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = context.packageManager.getLaunchIntentForPackage(PACKAGE)
            ?: throw AssertionError("App not installed")
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(PACKAGE).depth(0)), TIMEOUT)
        Thread.sleep(3000)
    }

    @Test
    fun welcomeScreenShowsAllButtons() {
        // Wait for welcome screen
        assertTrue("Sign Up button visible",
            device.wait(Until.hasObject(By.text("Sign Up")), TIMEOUT))
        assertNotNull("Owner Log In button",
            device.findObject(By.text("Owner Log In")))
        assertNotNull("Enroll Device button",
            device.findObject(By.text("Enroll Device")))
    }

    @Test
    fun ownerLoginOpensLoginScreen() {
        device.wait(Until.hasObject(By.text("Owner Log In")), TIMEOUT)
        device.findObject(By.text("Owner Log In")).click()
        Thread.sleep(2000)

        // Should show login form
        assertTrue("Login screen loaded",
            device.wait(Until.hasObject(By.text("Welcome back")), TIMEOUT))
        assertNotNull("Email field exists",
            device.findObject(UiSelector().className("android.widget.EditText").instance(0)))
        assertNotNull("Password field exists",
            device.findObject(UiSelector().className("android.widget.EditText").instance(1)))
        assertNotNull("Log In button exists",
            device.findObject(By.text("Log In")))
    }

    @Test
    fun loginWithTestCredentials() {
        val testEmail = "e2e-1774260269260@test.posterita.com"
        val testPass = "E2eTestPass123!"

        // Navigate to login
        device.wait(Until.hasObject(By.text("Owner Log In")), TIMEOUT)
        device.findObject(By.text("Owner Log In")).click()
        device.wait(Until.hasObject(By.text("Welcome back")), TIMEOUT)

        // Enter email — find EditText by instance (0 = email, 1 = password)
        val emailField = device.findObject(UiSelector().className("android.widget.EditText").instance(0))
        emailField.clearTextField()
        emailField.setText(testEmail)

        // Enter password
        val passField = device.findObject(UiSelector().className("android.widget.EditText").instance(1))
        passField.clearTextField()
        passField.setText(testPass)

        // Tap Log In
        device.findObject(By.text("Log In")).click()

        // Wait for either Home screen or error
        val homeLoaded = device.wait(
            Until.hasObject(By.textContains("Home").pkg(PACKAGE)),
            30_000 // login + sync can take up to 30s
        )

        // If we don't get Home, check for PIN screen (also valid — means login succeeded)
        if (!homeLoaded) {
            val pinScreen = device.hasObject(By.textContains("PIN"))
            val lockScreen = device.hasObject(By.res("$PACKAGE:id/pin_dot_1"))
            assertTrue("Login succeeded (Home or PIN screen)",
                pinScreen || lockScreen)
        }
    }
}
