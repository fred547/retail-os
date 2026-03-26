package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;

import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.Constants;
import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.model.Result;
import org.posterita.app.inventoryspotcheck.service.InventorySpotCheckService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;
import org.posterita.app.inventoryspotcheck.util.KeyboardUtil;

import java.io.BufferedOutputStream;

public class LoadSpotCheckFragment extends Fragment {

    ProgressDialog p;
    Configuration configuration;

    Button load_button;
    EditText document_no_text;

    public LoadSpotCheckFragment(){
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.fragment_load_spot_check_document, container, false);

        configuration = new Configuration(getActivity().getApplicationContext());
        getActivity().setTitle("Spot Check");

        p = new ProgressDialog(getActivity().getApplicationContext());
        p.setMessage("Please wait...");
        p.setIndeterminate(false);
        p.setCancelable(false);

        document_no_text = rootView.findViewById(R.id.document_no_text);

        load_button = rootView.findViewById(R.id.load_button);

        load_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                String documentNo = document_no_text.getText().toString().trim();

                if(documentNo.isEmpty()){

                    document_no_text.setError("Document no is required!");
                    document_no_text.requestFocus();

                    return;
                }

                //Hide Keyboard
                KeyboardUtil.closeKeyboard(getActivity());

                //FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                //fragmentManager.beginTransaction().replace(R.id.content_frame, new BarFragment()).commit(); //addToBackStack

                LoadSpotCheckDocumentTask task = new LoadSpotCheckDocumentTask(documentNo);
                task.execute();
            }
        });

        document_no_text.requestFocus();

        return rootView;
    }

    private void onDocumentResult(Result result){

        if(result == null) return;

        JSONObject json = result.getJson();

        try
        {
            boolean error = false;
            String error_message = null;

            boolean found = json.getBoolean("found");

            JSONObject spotcheck = null;

            if(!found){
                error = true;
                error_message = "Document not found!";
            }
            else
            {
                spotcheck = json.getJSONObject("spotcheck");
                String docStatus = spotcheck.getString("docStatus");

                int warehouseId = spotcheck.getInt("warehouseId");

                if( warehouseId != configuration.getWarehouseId() ){
                    error = true;
                    error_message = "Document belongs to another warehouse!";
                }
                else {
                    if(!"IP".equalsIgnoreCase(docStatus)){
                        error = true;
                        error_message = "Invalid doc status: "+ docStatus + "!";
                    }
                }
            }

            if(error){
                DialogUtil.showAlert(getActivity(), error_message);
                return;
            }

            BufferedOutputStream bos = new BufferedOutputStream(getActivity().openFileOutput(Constants.SPOT_CHECK_FILENAME, Context.MODE_PRIVATE));
            bos.write(spotcheck.toString().getBytes());
            bos.close();


            PerformSpotCheckFragment fragment = new PerformSpotCheckFragment();
            FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
            fragmentManager.beginTransaction().replace(R.id.content_frame, fragment).commit();
        }
        catch (Exception e){

        }

    }

    class LoadSpotCheckDocumentTask extends AsyncTask<Void, Void, Result>{

        private String documentNo;

        public LoadSpotCheckDocumentTask(String documentNo){
            this.documentNo = documentNo;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            //p.show();
        }

        @Override
        protected void onPostExecute(Result result) {
            super.onPostExecute(result);

            //p.hide();

            if(result.getError() != null){
                DialogUtil.showAlert(getActivity(), "Failed to load document! " + result.getError());
                onDocumentResult(null);
                return;
            }

            onDocumentResult(result);
        }

        @Override
        protected Result doInBackground(Void... params) {

            String server_address = configuration.getServerEndpoint();
            int ad_client_id = configuration.getClientId();

            return InventorySpotCheckService.getDocument(server_address, ad_client_id, this.documentNo);
        }
    }




}
