package org.posterita.app.inventorycount;

import android.content.DialogInterface;
import android.content.Intent;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import org.posterita.app.inventorycount.model.ProductInfo;
import org.posterita.app.inventorycount.model.ScannedProduct;

import java.util.List;

public class MainActivity extends AppCompatActivity {


    EditText locationInput, barcodeInput, qtyInput;
    Button nextBtn;

    TextView prev_location, prev_location_total_qty, prev_barcode;

    private String prev_scanned_location = "", prev_scanned_barcode = "";
    private float prev_scanned_location_qty = 0;

    private void beepAlert(){
        ToneGenerator toneGen1 = new ToneGenerator(AudioManager.STREAM_MUSIC, 100);
        toneGen1.startTone(ToneGenerator.TONE_CDMA_ABBR_ALERT,150);
    }

    private void beepConfirm(){
        ToneGenerator toneGen1 = new ToneGenerator(AudioManager.STREAM_MUSIC, 100);
        toneGen1.startTone(ToneGenerator.TONE_CDMA_CONFIRM,150);
    }

    private boolean validInput(final EditText input, String inputName){

        if(input.getText().toString().trim().length() == 0){

            String error_message = inputName + " is required!";

            AlertDialog.Builder builder = new AlertDialog.Builder(this);

            builder.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int id) {
                    dialog.cancel();

                    input.requestFocus();
                }
            });

            builder.setMessage(error_message)
                    .setTitle("Error");

            AlertDialog alertDialog = builder.create();
            alertDialog.show();

            beepAlert();


            return false;
        }

        return true;
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        locationInput = (EditText)findViewById(R.id.locationText);
        barcodeInput = (EditText)findViewById(R.id.barcodeText);
        qtyInput = (EditText)findViewById(R.id.qtyText);
        nextBtn = (Button)findViewById(R.id.nextBtn);

        prev_location = (TextView) findViewById(R.id.prev_location);
        prev_location_total_qty = (TextView) findViewById(R.id.prev_location_total_qty);
        prev_barcode = (TextView) findViewById(R.id.prev_barcode);

        //load last scan history
        prev_barcode.setText(prev_scanned_barcode);
        prev_location.setText(prev_scanned_location);
        prev_location_total_qty.setText("" + prev_scanned_location_qty);

        nextBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                if(validInput(locationInput, "Location") &&
                        validInput(barcodeInput, "Barcode") &&
                        validInput(qtyInput, "Qty")){

                    String location = locationInput.getText().toString();
                    String barcode = barcodeInput.getText().toString();
                    float qty = Float.parseFloat(qtyInput.getText().toString());

                    prev_scanned_barcode = barcode;
                    prev_barcode.setText(barcode);

                    if(prev_scanned_location.equalsIgnoreCase(location)){
                        prev_scanned_location_qty += qty;
                    }
                    else
                    {
                        prev_scanned_location = location;
                        prev_scanned_location_qty = qty;
                    }

                    prev_location.setText(location);
                    prev_location_total_qty.setText("" + prev_scanned_location_qty);

                    ScannedProduct.addInfo(new ProductInfo(location, barcode, qty));

                    qtyInput.setText("1");
                    barcodeInput.setText("");
                    barcodeInput.requestFocus();

                    Toast.makeText(getApplicationContext(),"Scan Next Barcode" ,Toast.LENGTH_SHORT).show();
                }


            }
        });


        locationInput.setOnEditorActionListener(new EditText.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int id, KeyEvent event) {
                if (event !=null && event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {

                    barcodeInput.setText("");
                    barcodeInput.selectAll();

                    Toast.makeText(getApplicationContext(),"Location:" + v.getText() ,Toast.LENGTH_SHORT).show();

                    return true;
                }
                return false;
            }
        });

        barcodeInput.setOnEditorActionListener(new EditText.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int id, KeyEvent event) {
                if (event !=null && event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {

                    ((EditText)v).selectAll();

                    Toast.makeText(getApplicationContext(),"Barcode:" + v.getText() ,Toast.LENGTH_SHORT).show();

                    return true;
                }
                return false;
            }
        });
    }

    @Override
    public void onBackPressed() {
        AlertDialog.Builder alertDialogBuilder = new AlertDialog.Builder(this);
        alertDialogBuilder.setTitle("Exit Application?");
        alertDialogBuilder
                .setMessage("Click yes to exit!")
                .setCancelable(false)
                .setPositiveButton("Yes",
                        new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int id) {
                                moveTaskToBack(true);
                                android.os.Process.killProcess(android.os.Process.myPid());
                                System.exit(1);
                            }
                        })

                .setNegativeButton("No", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {

                        dialog.cancel();
                    }
                });

        AlertDialog alertDialog = alertDialogBuilder.create();
        alertDialog.show();

        beepConfirm();
    }

    /* Toolbar menus */


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_menu, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle item selection

        switch (item.getItemId()) {
            case R.id.clearMenu:
                clear();
                return true;
            case R.id.saveMenu:
                save();
                return true;
            case R.id.startNewMenu:
                startNew();
                return true;
            case R.id.historyMenu:
                showHistory();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }


    public void resetForm(){
        qtyInput.setText("1");
        barcodeInput.setText("");
        locationInput.setText("");
        locationInput.requestFocus();
    }


    public void clear(){

        AlertDialog.Builder builder = new AlertDialog.Builder(this);

        builder.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User clicked OK button

                resetForm();

                Toast.makeText(getApplicationContext(),"Cleared form" ,Toast.LENGTH_SHORT).show();

            }
        });
        builder.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User cancelled the dialog
                dialog.cancel();
            }
        });

        builder.setMessage("Reset form?")
                .setTitle("Confirmation");

        AlertDialog dialog = builder.create();
        dialog.show();

        beepConfirm();
    }

    public void save(){

       //save
        List<ProductInfo> list = ScannedProduct.getList();
        if(list.isEmpty()){

            AlertDialog.Builder builder2 = new AlertDialog.Builder(this);
            builder2.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int id) {
                    dialog.cancel();
                }
            });

            builder2.setMessage("Scan list is empty!")
                    .setTitle("Alert");

            AlertDialog d = builder2.create();
            d.show();

            beepAlert();

            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);


        builder.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User clicked OK button


                dialog.cancel();

                try
                {
                    ScannedProduct.saveInventoryCountFile();
                    ScannedProduct.clearAll();
                    resetForm();

                    Toast.makeText(getApplicationContext(),"Saved to Documents folder" ,Toast.LENGTH_SHORT).show();
                }
                catch (Exception e){

                    Toast.makeText(getApplicationContext(),"Failed to save count! Error " + e.getMessage() ,Toast.LENGTH_SHORT).show();
                    e.printStackTrace();
                }


            }
        });
        builder.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User cancelled the dialog
                dialog.cancel();
            }
        });

        builder.setMessage("Save count?")
                .setTitle("Confirmation");

        AlertDialog dialog = builder.create();
        dialog.show();

        beepConfirm();
    }

    public void startNew(){

        AlertDialog.Builder builder = new AlertDialog.Builder(this);

        builder.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User clicked OK button

                //clear existing
                ScannedProduct.clearAll();

                resetForm();

                Toast.makeText(getApplicationContext(),"Starting new count .." ,Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                // User cancelled the dialog
                dialog.cancel();
            }
        });

        builder.setMessage("Start new count?")
                .setTitle("Confirmation");

        AlertDialog dialog = builder.create();
        dialog.show();

        beepConfirm();

    }

    public void showHistory(){

        //Intent intent = new Intent(this, HistoryActivity.class);
        Intent intent = new Intent(this, ScanListActivity.class);
        startActivity(intent);

        Toast.makeText(getApplicationContext(),"Showing history .." ,Toast.LENGTH_SHORT).show();
    }

}
