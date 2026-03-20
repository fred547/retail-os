package com.posterita.pos.android.database;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.posterita.pos.android.Interface.SyncCallback;
import com.posterita.pos.android.Utils.SharedPreferencesUtils;
import com.posterita.pos.android.database.entities.Store;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public class DatabaseSynchronizerTest {

    private Context context;
    private DatabaseSynchronizer databaseSynchronizer;
    private SharedPreferencesUtils sharedPreferencesUtils;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        sharedPreferencesUtils = new SharedPreferencesUtils(context);
        databaseSynchronizer = new DatabaseSynchronizer(context);

        sharedPreferencesUtils.setAccountId("101");
        sharedPreferencesUtils.setTerminalId(101);
    }

    @Test
    public void testPullData() throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);

        databaseSynchronizer.pullData(new SyncCallback() {
            @Override
            public void onSuccess() {
                latch.countDown();
            }

            @Override
            public void onFailure(String errorMessage) {
                latch.countDown();
            }
        });

        // Wait for the async operation to complete
        boolean completed = latch.await(30, TimeUnit.SECONDS);
        assertTrue("Pull data operation timed out", completed);

        // Verify that data has been pulled and stored in the database
        AppDatabase db = AppDatabase.getInstance(context);
        List<Store> stores = db.storeDao().getAllStores();
        assertNotNull("Stores should not be null", stores);
        assertTrue("Stores should not be empty", !stores.isEmpty());
    }
}