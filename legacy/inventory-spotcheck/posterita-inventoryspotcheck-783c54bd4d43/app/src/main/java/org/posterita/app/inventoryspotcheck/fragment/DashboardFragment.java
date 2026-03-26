package org.posterita.app.inventoryspotcheck.fragment;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.fragment.spotcheck.LoadSpotCheckFragment;
import org.posterita.app.inventoryspotcheck.fragment.spotcheck.NewSpotCheckFragment;

public class DashboardFragment extends Fragment {

    Button load_spot_check_button, new_spot_check_button;

    public DashboardFragment(){

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        getActivity().setTitle("Dashboard");

        View rootView = inflater.inflate(R.layout.fragment_dashboard, container, false);

        load_spot_check_button = rootView.findViewById(R.id.load_spot_check_button);
        new_spot_check_button = rootView.findViewById(R.id.new_spot_check_button);

        load_spot_check_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                Fragment fragment = new LoadSpotCheckFragment();
                fragmentManager.beginTransaction().replace(R.id.content_frame, fragment, fragment.getClass().getSimpleName()).addToBackStack("tag").commit(); //addToBackStack
            }
        });

        new_spot_check_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                FragmentManager fragmentManager = getActivity().getSupportFragmentManager();
                Fragment fragment = new NewSpotCheckFragment();
                fragmentManager.beginTransaction().replace(R.id.content_frame, fragment, fragment.getClass().getSimpleName()).addToBackStack("tag").commit(); //addToBackStack
            }
        });

        return rootView;
    }
}
