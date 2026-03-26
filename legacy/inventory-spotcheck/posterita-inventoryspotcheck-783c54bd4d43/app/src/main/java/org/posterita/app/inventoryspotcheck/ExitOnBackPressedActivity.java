package org.posterita.app.inventoryspotcheck;

import android.support.v7.app.AppCompatActivity;

import org.posterita.app.inventoryspotcheck.util.DialogUtil;

public class ExitOnBackPressedActivity extends AppCompatActivity {

    @Override
    public void onBackPressed() {
        DialogUtil.showExitDialog(this);
    }
}
