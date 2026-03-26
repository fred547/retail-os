package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.Constants;
import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.fragment.DashboardFragment;
import org.posterita.app.inventoryspotcheck.model.Result;
import org.posterita.app.inventoryspotcheck.service.InventorySpotCheckService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;
import org.posterita.app.inventoryspotcheck.util.KeyboardUtil;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class NewSpotCheckFragment extends Fragment {

    public final String TAG = "NewSpotCheckFragment";

    ProgressDialog p;
    Configuration configuration;

    Button next_button;
    TextView barcode_txt, qty_txt;
    TextView last_barcode_txt, last_qty_txt;

    JSONArray counts = new JSONArray();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true);
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        // First clear current all the menu items
        menu.clear();

        // Add the new menu items
        inflater.inflate(R.menu.new_spot_check_menu, menu);

        super.onCreateOptionsMenu(menu, inflater);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.complete_menu:
                Log.d(TAG, "Will post the spot check to server");
                this.complete();
                return true;
            case R.id.save_menu:
                Log.d(TAG, "Will save spot check");
                this.save();
                return true;
            case R.id.reset_menu:
                Log.d(TAG, "Will reset spot check");
                this.reset();
                return true;
            case R.id.history_menu:
                Log.d(TAG, "Will show scan history");
                this.history();
                return true;
            default:
                break;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        getActivity().setTitle("New Spot Check");
        configuration = new Configuration(getActivity().getApplicationContext());
        p = new ProgressDialog(getActivity());
        p.setMessage("Please wait...");
        p.setIndeterminate(false);
        p.setCancelable(false);

        View rootView = inflater.inflate(R.layout.fragment_new_spot_check, container, false);

        last_barcode_txt = rootView.findViewById(R.id.last_barcode_text);
        last_qty_txt = rootView.findViewById(R.id.last_qty_text);

        barcode_txt = rootView.findViewById(R.id.barcode_text);
        qty_txt = rootView.findViewById(R.id.qty_text);
        next_button = rootView.findViewById(R.id.next_button);

        next_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                next();
            }});

        this.resetForm();

        return rootView;
    }


    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        this.resumeCount();
    }

    private void next(){

        String barcode = barcode_txt.getText().toString();
        if(barcode.trim().length() == 0){
            barcode_txt.setError("Barcode is required");
            barcode_txt.requestFocus();
            return;
        }

        String qty = qty_txt.getText().toString();
        if(qty.trim().length() == 0){
            qty_txt.setError("Quantity is required");
            qty_txt.requestFocus();
            return;
        }

        //save count
        try
        {
            counts.put(new JSONObject()
                    .put("barcode", barcode)
                    .put("qtyCounted", qty));

            KeyboardUtil.closeKeyboard(getActivity());
        }
        catch (Exception e)
        {
            Log.e(TAG, "JSON error", e);
        }

        last_barcode_txt.setText(barcode);
        last_qty_txt.setText(qty);

        this.resetForm();

    }

    private void resetForm(){
        barcode_txt.setText("");
        qty_txt.setText("");
        barcode_txt.requestFocus();
    }

    //menu actions

    private void complete(){

        if(counts.length() == 0){
            DialogUtil.showAlert(getActivity(),"Document has no lines!");
            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle("Confirmation");
        builder.setMessage("Do you want to complete spot check?");
        builder.setCancelable(false);

        builder.setNegativeButton("No", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int i) {
                dialog.cancel();
            }
        });

        builder.setPositiveButton(
                "Yes",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        _complete();
                    }
                });

        AlertDialog alert = builder.create();
        alert.show();

        DialogUtil.beepConfirm();

    }

    private void _complete(){

        CreateAndCompleteSpotCheckDocumentTask task = new CreateAndCompleteSpotCheckDocumentTask(this.counts);
        task.execute();

    }

    private void save(){

        if(counts.length() == 0){
            DialogUtil.showAlert(getActivity(),"Document has no lines!");
            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle("Confirmation");
        builder.setMessage("Do you want to save spot check?");
        builder.setCancelable(false);

        builder.setNegativeButton("No", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int i) {
                dialog.cancel();
            }
        });

        builder.setPositiveButton(
                "Yes",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        _save();
                        dialog.cancel();
                    }
                });

        AlertDialog alert = builder.create();
        alert.show();

        DialogUtil.beepConfirm();

    }

    private void resumeCount(){
        try
        {
            BufferedReader reader = new BufferedReader(new InputStreamReader(getActivity().openFileInput(Constants.NEW_SPOT_CHECK_FILENAME)));
            final StringBuffer json = new StringBuffer();

            String line;

            while((line = reader.readLine())!= null){

                json.append(line);
            }

            if(json.length() > 0){

                AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
                builder.setTitle("Confirmation");
                builder.setMessage("Do you want to resume last saved spot check?");
                builder.setCancelable(false);

                builder.setNegativeButton("No", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int i) {
                        getActivity().deleteFile(Constants.NEW_SPOT_CHECK_FILENAME);
                        dialog.cancel();
                    }
                });

                builder.setPositiveButton(
                        "Yes",
                        new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int id) {
                                try
                                {
                                    counts = new JSONArray(json.toString());
                                    Log.i(TAG, json.toString());
                                }
                                catch (Exception e){

                                }
                                dialog.cancel();
                            }
                        });

                AlertDialog alert = builder.create();
                alert.show();

                DialogUtil.beepConfirm();
            }
        }
        catch (Exception e){

        }
    }

    private void _save() {
        try
        {
            BufferedOutputStream bos = new BufferedOutputStream(getActivity().openFileOutput(Constants.NEW_SPOT_CHECK_FILENAME, Context.MODE_PRIVATE));
            bos.write(counts.toString().getBytes());
            bos.close();
        }
        catch (Exception e)
        {
            Log.e(TAG, "Failed to save!", e);
        }

    }

    private void reset(){

        if(counts.length() == 0){
            _reset();
            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle("Confirmation");
        builder.setMessage("Do you want to reset spot check?");
        builder.setCancelable(false);

        builder.setNegativeButton("No", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int i) {
                dialog.cancel();
            }
        });

        builder.setPositiveButton(
                "Yes",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        _reset();
                        dialog.cancel();
                    }
                });

        AlertDialog alert = builder.create();
        alert.show();

        DialogUtil.beepConfirm();
    }

    private void _reset(){
        counts = new JSONArray();
        last_barcode_txt.setText("");
        last_qty_txt.setText("");
        barcode_txt.setText("");
        qty_txt.setText("");
    }

    private void history(){

        NewSpotCheckScanHistoryFragment fragment = new NewSpotCheckScanHistoryFragment();
        fragment.setLines(counts);
        FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
        fragmentManager.beginTransaction().replace(R.id.content_frame, fragment).addToBackStack("tag").commit();
    }

    private void onCreateAndCompleteSpotCheckDocumentResult(Result result){

        p.hide();

        if(result == null) return;

        JSONObject json = result.getJson();

        String error_message = null;
        boolean completed = false;

        try
        {
            if(json.has("error")){
                error_message = json.getString("error");
                DialogUtil.showAlert(getActivity(), error_message);
                return;
            }

            completed = json.getBoolean("completed");

            if(completed){
                _reset();
                DialogUtil.showAlert(getActivity(), "Spot Check completed successfully!");
                DashboardFragment fragment = new DashboardFragment();
                FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.content_frame, fragment).commit();

            }else
            {
                DialogUtil.showAlert(getActivity(), "Failed to complete Spot Check!");
            }


        }
        catch (Exception e)
        {
            DialogUtil.showAlert(getActivity(), "Failed to parse response! " + e.getMessage());
        }

    }

    class CreateAndCompleteSpotCheckDocumentTask extends AsyncTask<Void, Void, Result> {

        private JSONArray counts;

        public CreateAndCompleteSpotCheckDocumentTask(JSONArray counts){
            this.counts = counts;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            p.show();
        }

        @Override
        protected void onPostExecute(Result result) {
            super.onPostExecute(result);

            p.hide();

            if(result.getError() != null){
                DialogUtil.showAlert(getActivity(), "Failed to create new spot check! " + result.getError());
                onCreateAndCompleteSpotCheckDocumentResult(null);
                return;
            }

            onCreateAndCompleteSpotCheckDocumentResult(result);
        }

        @Override
        protected Result doInBackground(Void... params) {

            String server_address = configuration.getServerEndpoint();
            int ad_client_id = configuration.getClientId();
            int ad_user_id = configuration.getUserId();
            int m_warehouse_id = configuration.getWarehouseId();

            return InventorySpotCheckService.createAndCompleteDocument(server_address, ad_client_id, ad_user_id, m_warehouse_id, this.counts);
        }
    }
}
