package com.posterita.pos.android.ui

import androidx.test.ext.junit.runners.AndroidJUnit4
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

    @Before
    fun setup() {
        device = TestHelper.getDevice()
        TestHelper.launchApp(device)
    }

    @Test
    fun welcomeScreenShowsAllButtons() {
        // Wait for welcome screen
        assertTrue("Sign Up button visible",
            device.wait(Until.hasObject(By.text("Sign Up")), TestHelper.TIMEOUT))
        assertNotNull("Owner Log In button",
            device.findObject(By.text("Owner Log In")))
        assertNotNull("Enroll Device button",
            device.findObject(By.text("Enroll Device")))
    }

    @Test
    fun ownerLoginOpensLoginScreen() {
        device.wait(Until.hasObject(By.text("Owner Log In")), TestHelper.TIMEOUT)
        device.findObject(By.text("Owner Log In")).click()
        Thread.sleep(2000)

        // Should show login form
        assertTrue("Login screen loaded",
            device.wait(Until.hasObject(By.text("Welcome back")), TestHelper.TIMEOUT))
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

        // Navigate to login
        device.wait(Until.hasObject(By.text("Owner Log In")), TestHelper.TIMEOUT)
        device.findObject(By.text("Owner Log In")).click()
        device.wait(Until.hasObject(By.text("Welcome back")), TestHelper.TIMEOUT)

        // Enter email — find EditText by instance (0 = email, 1 = password)
        TestHelper.enterText(device, 0, testEmail)

        // Enter password
        TestHelper.enterText(device, 1, TestHelper.TEST_PASSWORD)

        // Tap Log In
        device.findObject(By.text("Log In")).click()

        // Wait for either Home screen or error
        val homeLoaded = device.wait(
            Until.hasObject(By.textContains("Home").pkg(TestHelper.PACKAGE)),
            30_000 // login + sync can take up to 30s
        )

        // If we don't get Home, check for PIN screen (also valid — means login succeeded)
        if (!homeLoaded) {
            val pinScreen = device.hasObject(By.textContains("PIN"))
            val lockScreen = device.hasObject(By.res("${TestHelper.PACKAGE}:id/pin_dot_1"))
            assertTrue("Login succeeded (Home or PIN screen)",
                pinScreen || lockScreen)
        }
    }
}
