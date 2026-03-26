package org.posterita.app.inventoryspotcheck.fragment.spotcheck;

import android.content.Context;
import android.content.DialogInterface;
import android.support.annotation.NonNull;
import android.support.v7.app.AlertDialog;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.R;
import org.posterita.app.inventoryspotcheck.util.DialogUtil;

public class NewSpotCheckScanHistoryAdapter extends RecyclerView.Adapter<NewSpotCheckScanHistoryViewHolder>{

    Context context;
    JSONArray lines;

    public NewSpotCheckScanHistoryAdapter(Context context, JSONArray lines){

        this.context = context;
        this.lines = lines;
    }

    @NonNull
    @Override
    public NewSpotCheckScanHistoryViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {

        Context context = parent.getContext();
        LayoutInflater inflater = LayoutInflater.from(context);
        View view = inflater.inflate(R.layout.scan_history_list_item, parent, false);

        NewSpotCheckScanHistoryViewHolder holder = new NewSpotCheckScanHistoryViewHolder(view);

        return holder;
    }

    @Override
    public void onBindViewHolder(@NonNull final NewSpotCheckScanHistoryViewHolder viewHolder, int position) {

        int index = viewHolder.getAdapterPosition();

        try
        {
            JSONObject json = lines.getJSONObject(position);
            final String barcode = json.getString("barcode");
            String qty = json.getString("qtyCounted");

            viewHolder.barcode_text.setText(barcode);
            viewHolder.qty_text.setText(qty);
            viewHolder.delete_btn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {

                    AlertDialog.Builder builder = new AlertDialog.Builder(context);
                    builder.setTitle("Confirmation");
                    builder.setMessage("Do you want to delete - " + barcode + "?");
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
                                    removeItem(viewHolder.getAdapterPosition());
                                }
                            });

                    AlertDialog alert = builder.create();
                    alert.show();

                    DialogUtil.beepConfirm();

                }
            });
        }
        catch(Exception e){

        }

    }

    @Override
    public int getItemCount() {
        return lines.length();
    }

    public void onAttachedToRecyclerView(RecyclerView recyclerView)
    {
        super.onAttachedToRecyclerView(recyclerView);
    }

    public void removeItem(int position) {
        lines.remove(position);
        notifyItemRemoved(position);
    }
}
