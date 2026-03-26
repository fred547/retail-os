package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import org.json.JSONArray;
import org.posterita.app.inventoryspotcheck.R;

public class NewSpotCheckScanHistoryFragment extends Fragment {

    RecyclerView recyclerView;
    JSONArray lines;

    public void setLines(JSONArray lines){
        this.lines = lines;
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {

        getActivity().setTitle("Scan History");

        View view = inflater.inflate(R.layout.fragment_scan_history, container, false);
        recyclerView = view.findViewById(R.id.scan_history_recycler_view);

        NewSpotCheckScanHistoryAdapter adapter = new NewSpotCheckScanHistoryAdapter(getContext(), lines);
        recyclerView.setAdapter(adapter);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        return view;
    }
}
