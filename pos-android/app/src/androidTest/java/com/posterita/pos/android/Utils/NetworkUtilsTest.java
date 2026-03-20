package com.posterita.pos.android.Utils;

import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;


public class NetworkUtilsTest {
    // Test case to check if the internet connection is available
    @Test
    public void testCheckInternetConnection() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        boolean result = NetworkUtils.isConnectedToInternet(context);
        assertTrue(result);
    }

    // Test case to check if the API endpoint is reachable
    @Test
    public void testCheckApiAvailability() {
        String apiUrl = "https://www.google.com";
        boolean result = NetworkUtils.isApiAvailable(apiUrl);
        assertTrue(result);
    }
}
