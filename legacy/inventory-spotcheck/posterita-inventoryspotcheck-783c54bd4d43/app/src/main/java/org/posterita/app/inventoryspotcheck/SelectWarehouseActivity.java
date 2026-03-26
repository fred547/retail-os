package org.posterita.app.inventoryspotcheck;

import android.app.ProgressDialog;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Spinner;

import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.model.Store;
import org.posterita.app.inventoryspotcheck.model.StoreAndWarehouseResult;
import org.posterita.app.inventoryspotcheck.model.Warehouse;
import org.posterita.app.inventoryspotcheck.service.LogInService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;

import java.util.ArrayList;
import java.util.List;

public class SelectWarehouseActivity extends ExitOnBackPressedActivity {

    ProgressDialog p;
    private Spinner store_spinner, warehouse_spinner;
    private List<Store> storeList;
    private List<Warehouse> warehouseList;
    private Store selectedStore;
    private Warehouse selectedwarehouse;
    private Configuration config;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_select_warehouse);

        config = new Configuration(getApplicationContext());

        setTitle("Store & Warehouse");

        store_spinner = findViewById(R.id.store_spinner);
        warehouse_spinner = findViewById(R.id.warehouse_spinner);

        loadStoreList();
    }

    private void loadStoreList() {

        AsyncTaskExample task = new AsyncTaskExample();
        task.execute();
    }

    private void onStoreAndWarehouseResult(StoreAndWarehouseResult result){

        if(result != null){
            this.storeList = result.getStoreList();
            this.renderStoreSpinner();
        }

    }

    private void renderStoreSpinner() {

        List<String> storeNameList = new ArrayList<>();

        for(Store store : this.storeList){
            storeNameList.add(store.getName());
        }

        ArrayAdapter<String> store_adapter = new ArrayAdapter(SelectWarehouseActivity.this, android.R.layout.simple_dropdown_item_1line, storeNameList);
        store_spinner.setAdapter(store_adapter);

        store_spinner.setSelection(0);

        store_spinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                selectedStore = storeList.get(i);
                renderWarehouseSpinner(i);
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });

        warehouse_spinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                if(warehouseList != null){
                    selectedwarehouse = warehouseList.get(i);
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });

    }

    private void renderWarehouseSpinner(int index){

        warehouseList = this.storeList.get(index).getWarehouseList();

        List<String> warehouseNameList = new ArrayList<>();

        for(Warehouse warehouse : warehouseList){
            warehouseNameList.add(warehouse.getName());
        }

        ArrayAdapter<String> warehouse_adapter = new ArrayAdapter(SelectWarehouseActivity.this, android.R.layout.simple_dropdown_item_1line, warehouseNameList);
        warehouse_spinner.setAdapter(warehouse_adapter);

    }

    public void onClickButtonContinue(View view){

        //validate
        if(this.selectedStore == null){
            DialogUtil.showAlert(SelectWarehouseActivity.this, "Select A Store!");
            return;
        }

        if(this.selectedwarehouse == null){
            DialogUtil.showAlert(SelectWarehouseActivity.this, "Select A Warehouse!");
            return;
        }

        //DialogUtil.showAlert(SelectWarehouseActivity.this, "Store:" + this.selectedStore.getAd_org_id() + " Warehouse:" + this.selectedwarehouse.getM_warehouse_id()  );

        config.setStoreName(this.selectedStore.getName());
        config.setStoreId(this.selectedStore.getAd_org_id());
        config.setWarehouseName(this.selectedwarehouse.getName());
        config.setWarehouseId(this.selectedwarehouse.getM_warehouse_id());

        //clear previous if any
        config.resetUser();

        Intent intent = new Intent(SelectWarehouseActivity.this, LoginActivity.class);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.store_warehouse_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {

        Intent intent = null;

        // Handle item selection
        switch (item.getItemId()) {
            case R.id.server_endpoint_menu:
                intent = new Intent(SelectWarehouseActivity.this, ServerEndpointActivity.class);
                break;
        }

        if(intent != null){
            startActivity(intent);
            finish();
        }

        return true;
    }

    private class AsyncTaskExample extends AsyncTask<Void, Void, StoreAndWarehouseResult> {
        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            p = new ProgressDialog(SelectWarehouseActivity.this);
            p.setMessage("Please wait...");
            p.setIndeterminate(false);
            p.setCancelable(false);
            p.show();
        }
        @Override
        protected StoreAndWarehouseResult doInBackground(Void... params) {

            String server_address = config.getServerEndpoint();
            int ad_client_id = config.getClientId();

            return LogInService.storeAndWarehouse(server_address, ad_client_id);
        }
        @Override
        protected void onPostExecute(StoreAndWarehouseResult result) {
            super.onPostExecute(result);
            p.dismiss();
            p = null;

            if(result.getError() != null){
                DialogUtil.showAlert(SelectWarehouseActivity.this, "Failed to query stores! " + result.getError());
                onStoreAndWarehouseResult(null);
                return;
            }

            onStoreAndWarehouseResult(result);
        }
    }
}
