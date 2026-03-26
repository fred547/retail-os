package org.posterita.app.inventoryspotcheck;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.util.Patterns;
import android.view.View;
import android.widget.EditText;

import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.model.ValidateDomainResult;
import org.posterita.app.inventoryspotcheck.service.LogInService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;

public class ServerEndpointActivity extends ExitOnBackPressedActivity {

    EditText server_address_text, domain_text;
    ProgressDialog p;

    boolean isTestMode = false;

    Context ctx;

    Configuration config;

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        ctx = getApplicationContext();
        config = new Configuration(ctx);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_server_endpoint);

        setTitle("Server Endpoint");

        server_address_text = findViewById(R.id.server_address_text);
        domain_text = findViewById(R.id.domain_text);

        if(savedInstanceState == null){
            server_address_text.setText(config.getServerEndpoint());
            String domain = config.getDomain();

            if(domain != null){
                domain_text.setText(domain);
            }
        }
    }

    public void onClickButtonTest(View view){

        isTestMode = true;

        if(!validate()) return;

        validateDomain();
    }

    public void onClickButtonContinue(View view){

        isTestMode = false;

        if(!validate()) return;

        validateDomain();
    }

    public boolean validate(){

        String server_address = server_address_text.getText().toString().trim();

        if(server_address.isEmpty()){
            server_address_text.setError("Server URL is required!");
            server_address_text.requestFocus();
            return false;
        }


        if(!Patterns.WEB_URL.matcher(server_address).matches()){
            server_address_text.setError("Invalid Server URL!");
            server_address_text.requestFocus();
            return false;
        }

        String domain = domain_text.getText().toString().trim();
        if(domain.isEmpty()){
            domain_text.setError("Domain is required!");
            domain_text.requestFocus();
            return false;
        }

        return true;
    }

    public void validateDomain() {

        AsyncTaskExample task = new AsyncTaskExample();
        task.execute();

    }

    public void onValidateDomainResult(ValidateDomainResult result){

       if(result == null) return;

        if(!result.isFound()){

            DialogUtil.showAlert(ServerEndpointActivity.this, "Invalid Domain!");

            return;
        }

        if(isTestMode){

            DialogUtil.showAlert(ServerEndpointActivity.this, "Connection Successful!");

            return;
        }

        //clear previous if any
        config.resetUser();
        config.resetStore();

        config.setServerEndpoint(server_address_text.getText().toString().trim());
        config.setDomain(domain_text.getText().toString().trim());
        config.setClientId(result.getAd_client_id());

        Intent intent = new Intent(ServerEndpointActivity.this, SelectWarehouseActivity.class);
        startActivity(intent);

        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }



    private class AsyncTaskExample extends AsyncTask<Void, Void, ValidateDomainResult> {
        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            p = new ProgressDialog(ServerEndpointActivity.this);
            p.setMessage("Please wait...");
            p.setIndeterminate(false);
            p.setCancelable(false);
            p.show();
        }
        @Override
        protected ValidateDomainResult doInBackground(Void... params) {

            String server_address = server_address_text.getText().toString().trim();
            String domain = domain_text.getText().toString().trim();

            return LogInService.validateDomain(server_address, domain);
        }
        @Override
        protected void onPostExecute(ValidateDomainResult result) {
            super.onPostExecute(result);
            p.dismiss();
            p = null;

            if(result.getError() != null){
                DialogUtil.showAlert(ServerEndpointActivity.this, "Failed to validate domain! " + result.getError());
                onValidateDomainResult(null);
                return;
            }

            onValidateDomainResult(result);
        }
    }

}
