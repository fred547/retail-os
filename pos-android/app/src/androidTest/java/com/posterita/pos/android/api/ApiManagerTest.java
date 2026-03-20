package com.posterita.pos.android.api;

import android.content.Context;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.posterita.pos.android.Utils.ApiManagerHelper;
import com.posterita.pos.android.Utils.SharedPreferencesUtils;
import com.posterita.pos.android.api.request.SyncDocumentNoRequest;
import com.posterita.pos.android.api.request.SyncOrderRequest;
import com.posterita.pos.android.api.response.LoginResponse;
import com.posterita.pos.android.api.response.SyncDocumentNoResponse;
import com.posterita.pos.android.api.response.SyncOrderResponse;
import com.posterita.pos.android.api.response.SyncTillResponse;
import com.posterita.pos.android.database.DatabaseSynchronizer;

import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.List;
import java.util.concurrent.CountDownLatch;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

@RunWith(AndroidJUnit4.class)
public class ApiManagerTest {

    private Context context;
    private DatabaseSynchronizer databaseSynchronizer;
    private SharedPreferencesUtils sharedPreferencesUtils;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        sharedPreferencesUtils = new SharedPreferencesUtils(context);
                
        databaseSynchronizer = new DatabaseSynchronizer(context);

        sharedPreferencesUtils.setAccountId("101");
    }

    @Test
    public void login() {
        ApiManager apiManager = ApiManagerHelper.getApiManager(context);

        CountDownLatch countDownLatch = new CountDownLatch(1);

        apiManager.login("support@posterita.com", "demo123", new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("LoginResponse: " + response.body());
                }

                countDownLatch.countDown();
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                System.out.println("Failed to login");

                countDownLatch.countDown();
            }
        });

        try {
            countDownLatch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Test
    public void pullData() {
        ApiManager apiManager = ApiManagerHelper.getApiManager(context);

        CountDownLatch countDownLatch = new CountDownLatch(1);

        apiManager.pullData("2020-01-01 00:00:00", new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("PullDataResponse: " + response.body());
                }

                countDownLatch.countDown();
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                System.out.println("Failed to pull data");
                t.printStackTrace(System.out);
                countDownLatch.countDown();
            }
        });

        try {
            countDownLatch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Test
    public void syncDocumentNo() {
        ApiManager apiManager = ApiManagerHelper.getApiManager(context);

        CountDownLatch countDownLatch = new CountDownLatch(1);

        SyncDocumentNoRequest request = new SyncDocumentNoRequest(544, 1000, 100);

        apiManager.syncDocumentNumber(request, new Callback<SyncDocumentNoResponse>() {
            @Override
            public void onResponse(Call<SyncDocumentNoResponse> call, Response<SyncDocumentNoResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("SyncDocumentNoResponse: " + response.body());
                }

                countDownLatch.countDown();
            }

            @Override
            public void onFailure(Call<SyncDocumentNoResponse> call, Throwable t) {
                System.out.println("Failed to SyncDocumentNo");
                t.printStackTrace(System.out);
                countDownLatch.countDown();
            }
        });

        try {
            countDownLatch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Test
    public void syncTill() {
        ApiManager apiManager = ApiManagerHelper.getApiManager(context);

        CountDownLatch countDownLatch = new CountDownLatch(1);

        String tills = "[\n" +
                "  {\n" +
                "    \"account_id\": 101,\n" +
                "    \"store_id\": 101,\n" +
                "    \"store_name\": \"Demo Store\",\n" +
                "    \"terminal_id\": \"101\",\n" +
                "    \"terminal_name\": \"Demo Store - Default Terminal\",\n" +
                "    \"uuid\": \"2e93d63948684da0a50f6ffa\",\n" +
                "    \"openingdate\": 1727071356186,\n" +
                "    \"openingdatetext\": \"23-09-2024 10:02:36\",\n" +
                "    \"openingdatefull\": \"Sep 23rd 2024, 10:02\",\n" +
                "    \"openby\": \"101\",\n" +
                "    \"openby_name\": \"Admin\",\n" +
                "    \"closingdate\": 1727074024216,\n" +
                "    \"closeby\": \"101\",\n" +
                "    \"openingamt\": \"0\",\n" +
                "    \"closingamt\": 100,\n" +
                "    \"closingcardamt\": 0,\n" +
                "    \"issync\": \"N\",\n" +
                "    \"adjustments\": [],\n" +
                "    \"till_id\": 1,\n" +
                "    \"vouchers\": {},\n" +
                "    \"closeby_name\": \"Admin\",\n" +
                "    \"closingdatetext\": \"23-09-2024 10:47:04\",\n" +
                "    \"closingdatefull\": \"Sep 23rd 2024, 10:47\",\n" +
                "    \"cashamt\": 327,\n" +
                "    \"card\": 380,\n" +
                "    \"check\": 0,\n" +
                "    \"mcbjuice\": 0,\n" +
                "    \"adjustmenttotal\": 0,\n" +
                "    \"subtotal\": 614.77,\n" +
                "    \"taxtotal\": 92.23,\n" +
                "    \"discounttotal\": 0,\n" +
                "    \"grandtotal\": 707,\n" +
                "    \"nooforders\": 2,\n" +
                "    \"noofitemssold\": 8,\n" +
                "    \"noofitemsreturned\": 0,\n" +
                "    \"salestotal\": 707,\n" +
                "    \"refundtotal\": 0,\n" +
                "    \"documentno\": \"000000128\"\n" +
                "  }\n" +
                "]";

        apiManager.syncTill(tills, new Callback<List<SyncTillResponse.SyncTillResponseItem>>() {
            @Override
            public void onResponse(Call<List<SyncTillResponse.SyncTillResponseItem>> call, Response<List<SyncTillResponse.SyncTillResponseItem>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("SyncTillResponse: " + response.body());
                }

                countDownLatch.countDown();
            }

            @Override
            public void onFailure(Call<List<SyncTillResponse.SyncTillResponseItem>> call, Throwable t) {
                System.out.println("Failed to SyncTillResponse");
                t.printStackTrace(System.out);
                countDownLatch.countDown();
            }
        });

        try {
            countDownLatch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Test
    public void syncOrder() {
        ApiManager apiManager = ApiManagerHelper.getApiManager(context);

        CountDownLatch countDownLatch = new CountDownLatch(1);

        String syncOrderRequest = "[{\n" +
                "  \"account\": {\n" +
                "    \"zip\": \"\",\n" +
                "    \"website\": \"\",\n" +
                "    \"vatregno\": \"BRN C1002131 / VAT5214532\",\n" +
                "    \"address2\": \"\",\n" +
                "    \"city\": \"\",\n" +
                "    \"address1\": \"\",\n" +
                "    \"phone2\": \"\",\n" +
                "    \"receiptmessage\": \"\",\n" +
                "    \"phone1\": \"\",\n" +
                "    \"account_id\": 101,\n" +
                "    \"isvatable\": \"Y\",\n" +
                "    \"businessname\": \"ABC Marketing\",\n" +
                "    \"state\": \"\",\n" +
                "    \"fax\": \"\"\n" +
                "  },\n" +
                "  \"cashback\": 0,\n" +
                "  \"change\": 0,\n" +
                "  \"costtotal\": 0,\n" +
                "  \"customer_id\": 0,\n" +
                "  \"customer_name\": \"Walk-in Customer\",\n" +
                "  \"dateordered\": 1726725845505,\n" +
                "  \"dateorderedfull\": \"Thu, 19th Sep 2024, 10:04:05\",\n" +
                "  \"dateorderedtext\": \"19-09-2024 10:04:05\",\n" +
                "  \"discountamt\": 0,\n" +
                "  \"discounts\": [],\n" +
                "  \"documentno\": \"000000284\",\n" +
                "  \"ebscounter\": \"545\",\n" +
                "  \"grandtotal\": 425,\n" +
                "  \"ispaid\": \"Y\",\n" +
                "  \"issync\": \"N\",\n" +
                "  \"lines\": [\n" +
                "    {\n" +
                "      \"linenetamt\": 50,\n" +
                "      \"note\": \"\",\n" +
                "      \"discountamt\": 0,\n" +
                "      \"discountpercentage\": 0,\n" +
                "      \"discountcode_id\": 0,\n" +
                "      \"costamt\": 0,\n" +
                "      \"voucher\": null,\n" +
                "      \"description\": \"Boite Briyani 50g\",\n" +
                "      \"isbom\": \"N\",\n" +
                "      \"ismodifier\": \"N\",\n" +
                "      \"modifiers\": [],\n" +
                "      \"tax_id\": 2040,\n" +
                "      \"productcategory_id\": 355,\n" +
                "      \"enabletax\": true,\n" +
                "      \"product_id\": 20795,\n" +
                "      \"priceentered\": 50,\n" +
                "      \"name\": \"Boite Briyani 50g\",\n" +
                "      \"qtyentered\": 1,\n" +
                "      \"taxcode\": \"Z\",\n" +
                "      \"priceactual\": 50,\n" +
                "      \"isstock\": \"Y\",\n" +
                "      \"productcategoryname\": \"Cakes\",\n" +
                "      \"taxamt\": 0,\n" +
                "      \"lineamt\": 50\n" +
                "    },\n" +
                "    {\n" +
                "      \"linenetamt\": 375,\n" +
                "      \"note\": \"\",\n" +
                "      \"discountamt\": 0,\n" +
                "      \"discountpercentage\": 0,\n" +
                "      \"discountcode_id\": 0,\n" +
                "      \"costamt\": 0,\n" +
                "      \"voucher\": null,\n" +
                "      \"description\": \"Appalam Boite 250g\",\n" +
                "      \"isbom\": \"N\",\n" +
                "      \"ismodifier\": \"N\",\n" +
                "      \"modifiers\": [],\n" +
                "      \"tax_id\": 103,\n" +
                "      \"productcategory_id\": 355,\n" +
                "      \"enabletax\": true,\n" +
                "      \"product_id\": 20797,\n" +
                "      \"priceentered\": 375,\n" +
                "      \"name\": \"Appalam Boite 250g\",\n" +
                "      \"qtyentered\": 1,\n" +
                "      \"taxcode\": \"V\",\n" +
                "      \"priceactual\": 375,\n" +
                "      \"isstock\": \"Y\",\n" +
                "      \"productcategoryname\": \"Cakes\",\n" +
                "      \"taxamt\": 48.91,\n" +
                "      \"lineamt\": 326.09\n" +
                "    }\n" +
                "  ],\n" +
                "  \"loyaltycardno\": null,\n" +
                "  \"mra\": true,\n" +
                "  \"note\": \"\",\n" +
                "  \"o_order_id\": 96948,\n" +
                "  \"openDrawer\": true,\n" +
                "  \"order_id\": 6,\n" +
                "  \"payments\": [\n" +
                "    {\n" +
                "      \"tendered\": 425,\n" +
                "      \"documentno\": \"000000284\",\n" +
                "      \"amount\": 425,\n" +
                "      \"change\": 0,\n" +
                "      \"type\": \"CASH\",\n" +
                "      \"datepaid\": 1726725845505,\n" +
                "      \"paymenttype\": \"CASH\",\n" +
                "      \"payamt\": 425,\n" +
                "      \"status\": \"CO\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"paymenttype\": \"CASH\",\n" +
                "  \"printReceipt\": true,\n" +
                "  \"qtytotal\": 2,\n" +
                "  \"status\": \"CO\",\n" +
                "  \"store\": {\n" +
                "    \"store_id\": 101,\n" +
                "    \"zip\": \"\",\n" +
                "    \"country\": \"United States\",\n" +
                "    \"address\": \"1451 Millie Mays\",\n" +
                "    \"city\": \"Palo Alto\",\n" +
                "    \"created\": \"2020-12-21 04:40:06.811013\",\n" +
                "    \"isactive\": \"Y\",\n" +
                "    \"account_id\": 101,\n" +
                "    \"name\": \"Demo Store\",\n" +
                "    \"state\": \"\",\n" +
                "    \"updated\": \"2020-12-21 04:40:06.811013\"\n" +
                "  },\n" +
                "  \"subtotal\": 376.09,\n" +
                "  \"taxes\": [\n" +
                "    {\n" +
                "      \"name\": \"Tax Free\",\n" +
                "      \"taxcode\" : \"Z\",\n" +
                "      \"rate\": 0,\n" +
                "      \"amt\": 50\n" +
                "    },\n" +
                "    {\n" +
                "      \"name\": \"Sales Tax\",\n" +
                "      \"taxcode\" : \"S\",\n" +
                "      \"rate\": 15,\n" +
                "      \"amt\": 375\n" +
                "    }\n" +
                "  ],\n" +
                "  \"taxtotal\": 48.91,\n" +
                "  \"tendered\": 425,\n" +
                "  \"terminal_id\": \"101\",\n" +
                "  \"terminal_name\": \"Demo Store - Default Terminal\",\n" +
                "  \"till_id\": 1,\n" +
                "  \"till_uuid\": \"2d179c8c19a14384831119ea\",\n" +
                "  \"tipamt\": 0,\n" +
                "  \"user_id\": \"101\",\n" +
                "  \"user_name\": \"Admin\",\n" +
                "  \"uuid\": \"3ecfefbe42c348a4aaf7b948\",\n" +
                "  \"vouchers\": []\n" +
                "}]";

        apiManager.syncOrder(syncOrderRequest, new Callback<List<SyncOrderResponse.SyncOrderResponseItem>>() {
            @Override
            public void onResponse(Call<List<SyncOrderResponse.SyncOrderResponseItem>> call, Response<List<SyncOrderResponse.SyncOrderResponseItem>> response) {
                if (response.isSuccessful() && response.body() != null) {

                    List<SyncOrderResponse.SyncOrderResponseItem> syncOrderResponse = response.body();

                    System.out.println("SyncOrderResponse: " + syncOrderResponse);
                }

                countDownLatch.countDown();
            }

            @Override
            public void onFailure(Call<List<SyncOrderResponse.SyncOrderResponseItem>> call, Throwable t) {
                System.out.println("Failed to sync order");
                t.printStackTrace(System.out);
                countDownLatch.countDown();
            }
        });

        try {
            countDownLatch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
