package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.content.DialogInterface;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.Constants;
import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.config.Configuration;
import org.posterita.app.inventoryspotcheck.fragment.DashboardFragment;
import org.posterita.app.inventoryspotcheck.model.Result;
import org.posterita.app.inventoryspotcheck.service.InventorySpotCheckService;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;
import org.posterita.app.inventoryspotcheck.util.FileUtil;

public class CompleteSpotCheckFragment extends Fragment {

    Button complete_button;
    Configuration configuration;

    public CompleteSpotCheckFragment(){

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        getActivity().setTitle("Spot Check");
        configuration = new Configuration(getActivity());

        View rootView = inflater.inflate(R.layout.fragment_complete_spot_check, container, false);

        complete_button = rootView.findViewById(R.id.complete_button);

        complete_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                //load spot check json
                try
                {
                    CompleteSpotCheckTask task = new CompleteSpotCheckTask();
                    task.execute();

                }
                catch (Exception e) {
                    e.printStackTrace();
                }

            }
        });

        return rootView;
    }

    private void onCompleteResult(Result result){

        JSONObject json = result.getJson();

        boolean completed = json.optBoolean("completed", false);

        if(completed){

            AlertDialog.Builder builder1 = new AlertDialog.Builder(getActivity());
            builder1.setTitle("Information");
            builder1.setMessage("Spot Check was successfully completed!");
            builder1.setCancelable(false);

            builder1.setPositiveButton(
                    "OK",
                    new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            dialog.cancel();

                            try
                            {
                                //remove cache spot-check.json
                                FileUtil.deleteFile(getActivity(), Constants.SPOT_CHECK_FILENAME);
                            }
                            catch (Exception e){
                                e.printStackTrace();
                            }

                            FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                            fragmentManager.beginTransaction().replace(R.id.content_frame, new DashboardFragment()).commit();
                        }
                    });

            AlertDialog alert11 = builder1.create();
            alert11.show();
        }
        else
        {
            String error = json.optString("error", "Failed to complete document!");
            DialogUtil.showAlert(getActivity(), error);
        }
    }

    class CompleteSpotCheckTask extends AsyncTask<Void, Void, Result> {

        public CompleteSpotCheckTask(){
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
                DialogUtil.showAlert(getActivity(), "Failed to complete document! " + result.getError());
                onCompleteResult(null);
                return;
            }

            onCompleteResult(result);
        }

        @Override
        protected Result doInBackground(Void... params) {

            try
            {
                String s = FileUtil.readFile(getActivity(), Constants.SPOT_CHECK_FILENAME);

                JSONObject spotCheckDocument = new JSONObject(s);
                JSONArray spotCheckLines = spotCheckDocument.getJSONArray("lines");
                int noOfLines = spotCheckLines.length();

                Log.i("SpotCheck - complete", spotCheckDocument.toString(4));

                String server_address = configuration.getServerEndpoint();
                int ad_client_id = configuration.getClientId();
                int ad_user_id = configuration.getUserId();

                return InventorySpotCheckService.completeDocument(server_address, ad_client_id, ad_user_id, s);

            }
            catch (Exception e){

                e.printStackTrace();

                Result error = new Result();
                error.setError(e.getMessage());

                return error;
            }


        }
    }
}
