package org.posterita.app.inventoryspotcheck;

import android.app.ProgressDialog;
import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.WindowManager;

import org.posterita.app.inventoryspotcheck.config.Configuration;

public class SplashScreenActivity extends ExitOnBackPressedActivity {

    ProgressDialog p;
    Configuration config;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getSupportActionBar().hide();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_splash_screen);

        config = new Configuration(getApplicationContext());

        try
        {
            p = new ProgressDialog(SplashScreenActivity.this);
            p.setMessage("Please wait...");
            p.setIndeterminate(false);
            p.setCancelable(false);
            p.show();

            //config.reset();

            Class<? extends AppCompatActivity> activity = null;

            if(config.getUserId() > 0){
                activity = MainActivity.class;
            }
            else if(config.getStoreId() > 0){
                activity = LoginActivity.class;
            }
            else if(config.getClientId() > 0){
                activity = SelectWarehouseActivity.class;
            }
            else {
                activity = ServerEndpointActivity.class;
            }

            Intent intent = new Intent(SplashScreenActivity.this, activity);
            startActivity(intent);

            p.dismiss();

            finish();
        }
        catch (Exception e){
            e.printStackTrace();
        }
        finally {
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        p = null;
        super.onDestroy();
    }
}
