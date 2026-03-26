package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.support.v7.widget.RecyclerView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import org.posterita.app.inventoryspotcheck.R;

public class NewSpotCheckScanHistoryViewHolder extends RecyclerView.ViewHolder {

    TextView barcode_text, qty_text;
    Button delete_btn;

    public NewSpotCheckScanHistoryViewHolder(View itemView)
    {
        super(itemView);

        barcode_text = itemView.findViewById(R.id.barcode_text);
        qty_text = itemView.findViewById(R.id.qty_text);
        delete_btn = itemView.findViewById(R.id.delete_btn);
    }

    public NewSpotCheckScanHistoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType)
    {
        return null;
    }
}
