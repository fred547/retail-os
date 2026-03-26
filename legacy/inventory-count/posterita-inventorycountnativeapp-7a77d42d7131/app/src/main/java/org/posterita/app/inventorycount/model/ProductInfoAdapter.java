package org.posterita.app.inventorycount.model;

import android.content.Context;
import android.support.annotation.NonNull;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Filter;
import android.widget.Filterable;
import android.widget.TextView;


import org.posterita.app.inventorycount.R;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class ProductInfoAdapter extends RecyclerView.Adapter implements Filterable {

    Context context;
    List<ProductInfo> productInfoList;
    List<ProductInfo> productInfoListAll;

    public ProductInfoAdapter(Context context, List<ProductInfo> productInfoList){
        this.context = context;
        this.productInfoList = productInfoList;
        this.productInfoListAll = new ArrayList<>(productInfoList);
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup viewGroup, int i) {

        boolean isHeader = i == 0;


        View view = LayoutInflater.from(context).inflate( isHeader ? R.layout.history_header_layout : R.layout.history_details_layout, viewGroup, false);


        return  isHeader ? new HeaderViewHolder(view) : new DetailsViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder viewHolder, int i) {

        if(productInfoList == null || productInfoList.isEmpty()) return;

        ProductInfo info = productInfoList.get(i); //show in reverse order

        if(viewHolder instanceof HeaderViewHolder){
            HeaderViewHolder holder = (HeaderViewHolder)viewHolder;
            holder.location_tv.setText(info.getLocation());
        }
        else
        {
            DetailsViewHolder holder = (DetailsViewHolder)viewHolder;
            holder.barcode_tv.setText(info.getBarcode());
            holder.qty_tv.setText("" + info.getQty());
        }

    }

    @Override
    public int getItemCount() {

        return productInfoList.size();
    }

    @Override
    public int getItemViewType(int position) {
        return productInfoList.get(position).isHeader() ? 0 : 1;
    }

    final Filter filter = new Filter() {
        @Override
        protected FilterResults performFiltering(CharSequence charSequence) {

            ArrayList<ProductInfo> list = new ArrayList<ProductInfo>();

            if(charSequence.length() == 0){
                list.addAll(productInfoList);
            }
            else
            {
                StringBuffer sb = new StringBuffer(charSequence);
                String s = sb.toString();

                for(ProductInfo info : productInfoListAll){

                    if(info.match(s)){
                        list.add(info);
                    }
                }
            }

            FilterResults results = new FilterResults();
            results.values = list;

            return results;
        }

        @Override
        protected void publishResults(CharSequence charSequence, FilterResults filterResults) {
            productInfoList.clear();
            productInfoList.addAll((Collection<? extends ProductInfo>) filterResults.values);
            //notifyDataSetChanged();
        }
    };

    @Override
    public Filter getFilter() {
        return filter;
    }

    public class HeaderViewHolder extends RecyclerView.ViewHolder {

        TextView location_tv;

        public HeaderViewHolder(View itemView){
            super(itemView);

            location_tv = itemView.findViewById(R.id.location_tv);
        }
    }

    public class DetailsViewHolder extends RecyclerView.ViewHolder {

        TextView barcode_tv, qty_tv;

        public DetailsViewHolder(View itemView){
            super(itemView);

            barcode_tv = itemView.findViewById(R.id.barcode_tv);
            qty_tv = itemView.findViewById(R.id.qty_tv);
        }
    }

}
