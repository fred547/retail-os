package org.posterita.app.inventorycount;

import android.content.Context;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.inputmethod.EditorInfo;
import android.widget.SearchView;

import org.posterita.app.inventorycount.model.ProductInfo;
import org.posterita.app.inventorycount.model.ProductInfoAdapter;
import org.posterita.app.inventorycount.model.ScannedProduct;

import java.util.ArrayList;
import java.util.List;

public class ScanListActivity extends AppCompatActivity {

    private RecyclerView recycler_view;
    private ProductInfoAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan_list);

        recycler_view = findViewById(R.id.recycler_view);
        setRecyclerView();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {

        final Context ctx = this.getApplicationContext();

        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.scan_list_menu, menu);
        MenuItem searchItem = menu.findItem(R.id.action_search);
        final SearchView searchView = (SearchView) searchItem.getActionView();
        searchView.setImeOptions(EditorInfo.IME_ACTION_NONE);

        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {

                searchView.clearFocus();

                Log.d("newText1",query);
                //adapter.getFilter().filter(query);



                return false;
            }
            @Override
            public boolean onQueryTextChange(String query) {
                Log.d("newText",query);

                List<ProductInfo> list = filterList(query);
                adapter = new ProductInfoAdapter(ctx, list);
                recycler_view.setAdapter(adapter);

                return false;
            }
        });
        return true;
    }

    public void setRecyclerView() {

        recycler_view.setHasFixedSize(true);
        recycler_view.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ProductInfoAdapter(this, getList());
        recycler_view.setAdapter(adapter);

    }

    public List<ProductInfo> getList() {

        return transformList(ScannedProduct.getList());
    }


    public List<ProductInfo> filterList(String term) {

        List<ProductInfo> src = ScannedProduct.getList();
        List<ProductInfo> list = new ArrayList<>();

        if(term.length() == 0){
            list.addAll(src);
        }
        else
        {
            for(ProductInfo info : src){

                if(info.match(term)){
                    list.add(info);
                }
            }
        }

        return transformList(list);
    }



    public List<ProductInfo> transformList(List<ProductInfo> src){

        ArrayList<ProductInfo> list = new ArrayList<>();

        int size = src.size();

        String previousLocation = null, location = null;
        ProductInfo info = null, header = null;

        for(int i=size - 1; i>=0; i--){

            info = src.get(i);

            location = info.getLocation();

            if(!location.equalsIgnoreCase(previousLocation)){
                previousLocation = location;
                header = new ProductInfo();
                header.setHeader(true);
                header.setLocation(location);
                list.add(header);
            }

            list.add(info);
        }

        return list;
    }
}
