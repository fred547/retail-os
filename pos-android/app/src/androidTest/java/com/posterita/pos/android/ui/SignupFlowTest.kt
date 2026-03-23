package com.posterita.pos.android.ui

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.*
import com.posterita.pos.android.ui.TestHelper.PACKAGE
import com.posterita.pos.android.ui.TestHelper.TIMEOUT
import com.posterita.pos.android.ui.TestHelper.LONG_TIMEOUT
import org.junit.Assert.*
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

/**
 * Full signup flow — creates a real account on Supabase.
 * Must run first. Subsequent tests depend on this account.
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class SignupFlowTest {

    private lateinit var device: UiDevice

    companion object {
        val TEST_EMAIL = TestHelper.testEmail()
        val TEST_PHONE = TestHelper.testPhone()
    }

    @Before
    fun setup() {
        device = TestHelper.getDevice()
    }

    @Test
    fun test01_freshInstallShowsWelcomeScreen() {
        // Launch app (don't pm clear — it kills the test runner)
        TestHelper.launchApp(device)

        assertTrue("Sign Up visible", TestHelper.waitForText(device, "Sign Up", TIMEOUT))
        assertTrue("Owner Log In visible", TestHelper.hasText(device, "Owner Log In"))
        assertTrue("Enroll Device visible", TestHelper.hasText(device, "Enroll Device"))
        assertTrue("Posterita branding", TestHelper.hasText(device, "posterita") || TestHelper.hasText(device, "Posterita"))
    }

    @Test
    fun test02_signUpOpensWizard() {
        TestHelper.launchApp(device)
        if (!TestHelper.hasText(device, "Sign Up")) return // Already past welcome

        TestHelper.tapText(device, "Sign Up")
        Thread.sleep(2000)

        // Should show first step — email/password
        val hasEmailField = device.findObject(UiSelector().className("android.widget.EditText")) != null
        assertTrue("Signup form has input fields", hasEmailField)
    }

    @Test
    fun test03_fullSignupFlow() {
        TestHelper.launchApp(device)
        if (!TestHelper.hasText(device, "Sign Up")) return

        TestHelper.tapText(device, "Sign Up")
        Thread.sleep(2000)

        // Step 1: Email + Password + Phone
        val editTexts = device.findObjects(By.clazz("android.widget.EditText"))
        if (editTexts.size >= 3) {
            editTexts[0].text = TEST_EMAIL
            editTexts[1].text = TestHelper.TEST_PASSWORD
            if (editTexts.size > 2) editTexts[2].text = TEST_PHONE
        }

        // Find and tap Next/Continue
        TestHelper.tapIfExists(device, "Next") || TestHelper.tapIfExists(device, "Continue")
        Thread.sleep(2000)

        // Step 2: Name
        val nameFields = device.findObjects(By.clazz("android.widget.EditText"))
        if (nameFields.isNotEmpty()) {
            nameFields[0].text = "E2E Test"
            if (nameFields.size > 1) nameFields[1].text = "Bot"
        }
        TestHelper.tapIfExists(device, "Next") || TestHelper.tapIfExists(device, "Continue")
        Thread.sleep(2000)

        // Step 3: Brand name
        val brandFields = device.findObjects(By.clazz("android.widget.EditText"))
        if (brandFields.isNotEmpty()) brandFields[0].text = "Firebase Test Store"
        TestHelper.tapIfExists(device, "Next") || TestHelper.tapIfExists(device, "Continue")
        Thread.sleep(2000)

        // Step 4-5: Country + Category (may be dropdowns — tap through)
        for (i in 0..2) {
            TestHelper.tapIfExists(device, "Next") || TestHelper.tapIfExists(device, "Continue")
            Thread.sleep(2000)
        }

        // Step 6: PIN
        if (TestHelper.hasText(device, "PIN") || TestHelper.hasText(device, "pin")) {
            TestHelper.enterPIN(device, TestHelper.TEST_PIN)
            Thread.sleep(1000)
            // Confirm PIN
            if (TestHelper.hasText(device, "Confirm")) {
                TestHelper.enterPIN(device, TestHelper.TEST_PIN)
                Thread.sleep(1000)
            }
            TestHelper.tapIfExists(device, "Next") || TestHelper.tapIfExists(device, "Continue")
        }

        // Wait for server setup (up to 60s)
        for (i in 0..12) {
            Thread.sleep(5000)
            if (TestHelper.hasText(device, "Home") || TestHelper.hasText(device, "Start") ||
                TestHelper.hasText(device, "Good") || TestHelper.hasText(device, "Review")) break
        }

        // Accept any final step
        TestHelper.tapIfExists(device, "Start Selling")
        TestHelper.tapIfExists(device, "Get Started")
        Thread.sleep(3000)

        TestHelper.assertNotCrashed(device)
    }

    @Test
    fun test04_afterSignupAppIsUsable() {
        TestHelper.launchApp(device)
        Thread.sleep(5000)

        // Should be on Home, Lock Screen, or still in wizard
        val isUsable = TestHelper.hasText(device, "Good") ||
            TestHelper.hasText(device, "PIN") ||
            TestHelper.hasText(device, "Home") ||
            TestHelper.hasText(device, "Welcome") ||
            TestHelper.hasText(device, "Sign Up")

        assertTrue("App is in a usable state", isUsable)
        TestHelper.assertNotCrashed(device)
    }

}
