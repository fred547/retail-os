package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.Constants;
import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.util.FileUtil;
import org.posterita.app.inventoryspotcheck.util.KeyboardUtil;

public class PerformSpotCheckFragment extends Fragment {

    ProgressDialog p;
    Button next_button;
    EditText qty_text;
    TextView description_text, barcode_text, location_text;
    int index = -1;
    int noOfLines = -1;
    private JSONObject spotCheckDocument;
    private JSONArray spotCheckLines;
    private JSONObject line;

    public PerformSpotCheckFragment(){

    }

    private void next(){

        try
        {
            if(index >= 0){
                //save state
                line = spotCheckLines.getJSONObject(index);
                line.put("qtyCounted", qty_text.getText());
            }

            if(index == noOfLines - 1){
                completeDocument();
                return;
            }

            index ++;

            line = spotCheckLines.getJSONObject(index);

            String description, barcode, location;

            description = line.getString("description");
            barcode = line.getString("barcode");
            location = line.getString("location");

            description_text.setText(description);
            barcode_text.setText(barcode);
            location_text.setText(location);

            qty_text.setText("");
            qty_text.requestFocus();

        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    private void completeDocument() {

        try
        {
            FileUtil.saveFile(getActivity(), Constants.SPOT_CHECK_FILENAME, spotCheckDocument.toString());

            FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
            fragmentManager.beginTransaction().replace(R.id.content_frame, new CompleteSpotCheckFragment()).commit();
        }
        catch (Exception e){
            e.printStackTrace();
        }

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        getActivity().setTitle("Spot Check");

        //load spot check json
        try
        {
            String s = FileUtil.readFile(getActivity(), Constants.SPOT_CHECK_FILENAME);

            spotCheckDocument = new JSONObject(s);
            spotCheckLines = spotCheckDocument.getJSONArray("lines");
            noOfLines = spotCheckLines.length();

        }
        catch (Exception e)
        {
            e.printStackTrace();

            Log.i("SpotCheck", "File:" + Constants.SPOT_CHECK_FILENAME + " not found! Returning to load document screen.");
            FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
            fragmentManager.beginTransaction().replace(R.id.content_frame, new LoadSpotCheckFragment()).commit();
            return null;
        }

        View rootView = inflater.inflate(R.layout.fragment_spot_check_document, container, false);



        /*
        p = new ProgressDialog(getActivity().getApplicationContext());
        p.setMessage("Please wait...");
        p.setIndeterminate(false);
        p.setCancelable(false);
        */

        qty_text = rootView.findViewById(R.id.qty_text);
        next_button = rootView.findViewById(R.id.next_button);

        description_text = rootView.findViewById(R.id.description_text);
        barcode_text = rootView.findViewById(R.id.barcode_text);
        location_text = rootView.findViewById(R.id.location_text);

        next_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                String qty = qty_text.getText().toString().trim();

                if(qty.isEmpty()){

                    qty_text.setError("Qty is required!");
                    qty_text.requestFocus();

                    return;
                }

                next();

                //Hide Keyboard
                KeyboardUtil.closeKeyboard(getActivity());


            }
        });

        next();

        return rootView;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true);
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {

        getActivity().getMenuInflater().inflate(R.menu.save_spot_check_menu, menu);
    }

}
