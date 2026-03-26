package org.posterita.app.inventoryspotcheck.fragment;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

import org.posterita.app.inventoryspotcheck.R;

public class TableFragment extends Fragment {

    Button bar_button;

    public TableFragment() {
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.fragment_table, container, false);

        bar_button = rootView.findViewById(R.id.bar_button);

        bar_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                fragmentManager.beginTransaction().replace(R.id.content_frame, new BarFragment()).commit(); //addToBackStack
            }
        });

        return rootView;
    }

}
