package org.posterita.app.inventoryspotcheck.fragment;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.config.Configuration;

public class AboutFragment extends Fragment {

    public AboutFragment(){}

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {

        getActivity().setTitle("About");

        View rootView = inflater.inflate(R.layout.fragment_about, container, false);

        Configuration configuration = new Configuration(getActivity().getApplicationContext());

        TextView tw = rootView.findViewById(R.id.server_url_text);
        tw.setText(configuration.getServerEndpoint());

        tw = rootView.findViewById(R.id.domain_text);
        tw.setText(configuration.getDomain());

        tw = rootView.findViewById(R.id.store_text);
        tw.setText(configuration.getStoreName());

        tw = rootView.findViewById(R.id.warehouse_text);
        tw.setText(configuration.getWarehouseName());

        tw = rootView.findViewById(R.id.username_text);
        tw.setText(configuration.getUserName());


        return rootView;
    }
}
