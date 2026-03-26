package org.posterita.app.inventoryspotcheck.fragment;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import org.posterita.app.inventoryspotcheck.R;

public class BarFragment extends Fragment {

    public BarFragment() {
        super();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.fragment_bar, container, false);

        getActivity().setTitle("Bar");

        return rootView;
    }

}
