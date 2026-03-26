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
import android.widget.EditText;
import android.widget.Spinner;

import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.model.LogInResult;
import org.posterita.app.inventoryspotcheck.model.UsersResult;
import org.posterita.app.inventoryspotcheck.service.LogInService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;

import java.util.List;

public class LoginActivity extends ExitOnBackPressedActivity {

    ProgressDialog p;
    Spinner username_spinner;
    EditText pin_text;

    List<String> userList;
    String selectedUser;

    Configuration config;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        config = new Configuration(getApplicationContext());

        setTitle("Login");

        username_spinner = findViewById(R.id.username_spinner);
        pin_text = findViewById(R.id.pin_text);

        p = new ProgressDialog(LoginActivity.this);
        p.setMessage("Please wait...");
        p.setIndeterminate(false);
        p.setCancelable(false);

        loadUsers();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.login_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {

        Intent intent = null;

        // Handle item selection
        switch (item.getItemId()) {
            case R.id.store_and_warehouse_menu:
                intent = new Intent(LoginActivity.this, SelectWarehouseActivity.class);
                break;
            case R.id.server_endpoint_menu:
                intent = new Intent(LoginActivity.this, ServerEndpointActivity.class);
                break;
        }

        if(intent != null){
            startActivity(intent);
            finish();
        }

        return true;
    }

    private void loadUsers() {
        AsyncTaskUsers taskUsers = new AsyncTaskUsers();
        taskUsers.execute();
    }

    private void onUsersResult(UsersResult result) {

        userList = result.getUserList();

        ArrayAdapter<String> warehouse_adapter = new ArrayAdapter(LoginActivity.this, android.R.layout.simple_dropdown_item_1line, userList);
        username_spinner.setAdapter(warehouse_adapter);
        username_spinner.setSelection(0);

        username_spinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                selectedUser = userList.get(i);
            }

            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });
    }

    private void onLogInResult(LogInResult result) {

        if(!result.isFound()){
            pin_text.setError("Invalid PIN!");
            return;
        }

        if(!result.isActive()){
            DialogUtil.showAlert(LoginActivity.this, "User has been deactivated!");
            return;
        }

        config.setUserName(this.selectedUser);
        config.setUserId(result.getAd_user_id());
        config.setUserJon(result.getUserJson().toString());

        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
        startActivity(intent);

        finish();
    }

    public void onClickButtonLogin(View view){

        //validate
        if(selectedUser == null){
            DialogUtil.showAlert(LoginActivity.this, "Select A User");
            return;
        }

        String pin = pin_text.getText().toString().trim();

        if(pin.isEmpty()){
            pin_text.setError("PIN is required!");
            pin_text.requestFocus();
            return;
        }

        AsyncTaskLogin taskLogin = new AsyncTaskLogin(selectedUser, pin);
        taskLogin.execute();
    }

    @Override
    protected void onDestroy() {
        p.dismiss();
        p = null;
        super.onDestroy();
    }

    private class AsyncTaskUsers extends AsyncTask<Void, Void, UsersResult> {
        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            p.show();
        }
        @Override
        protected UsersResult doInBackground(Void... params) {

            String server_address = config.getServerEndpoint();
            int ad_client_id = config.getClientId();

            return LogInService.users(server_address, ad_client_id);
        }
        @Override
        protected void onPostExecute(UsersResult result) {
            super.onPostExecute(result);
            p.hide();

            if(result.getError() != null){
                DialogUtil.showAlert(LoginActivity.this, "Failed to query users! " + result.getError());
                onUsersResult(null);
                return;
            }

            onUsersResult(result);
        }
    }

    private class AsyncTaskLogin extends AsyncTask<Void, Void, LogInResult> {

        private String username, pin;

        public AsyncTaskLogin(String username, String pin){
            this.username = username;
            this.pin = pin;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            p.show();
        }
        @Override
        protected LogInResult doInBackground(Void... params) {

            String server_address = config.getServerEndpoint();
            int ad_client_id = config.getClientId();

            return LogInService.logIn(server_address, ad_client_id, this.username, this.pin);
        }
        @Override
        protected void onPostExecute(LogInResult result) {
            super.onPostExecute(result);
            p.hide();

            if(result.getError() != null){
                DialogUtil.showAlert(LoginActivity.this, "Failed to login! " + result.getError());
                onLogInResult(null);
                return;
            }

            onLogInResult(result);
        }
    }

}
