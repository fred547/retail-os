package org.posterita.app.inventoryspotcheck.model;


import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class StoreAndWarehouseResult extends Result {

    private List<Store> storeList;

    public StoreAndWarehouseResult(){}

    @Override
    public void setJson(JSONObject json) {
        super.setJson(json);

        if(json.has("error")) return;

        //{"list":[{"ad_org_id":10001098,"name":"JamieKnight","warehouses":[{"name":"JamieKnight","m_warehouse_id":10001400}]}]}

        storeList = new ArrayList<>();

        try
        {
            JSONArray list = json.getJSONArray("list");

            JSONObject storeJson, warehouseJson;
            JSONArray warehouseJsonArray;

            Store store;
            Warehouse warehouse;

            List<Warehouse> warehouseList;

            for(int i = 0; i < list.length(); i++){

                storeJson = list.getJSONObject(i);

                store = new Store();
                storeList.add(store);

                store.setAd_org_id(storeJson.getInt("ad_org_id"));
                store.setName(storeJson.getString("name"));

                warehouseList = new ArrayList<>();
                store.setWarehouseList(warehouseList);

                warehouseJsonArray = storeJson.getJSONArray("warehouses");

                for (int j=0; j<warehouseJsonArray.length(); j++){
                    warehouseJson = warehouseJsonArray.getJSONObject(j);

                    warehouse = new Warehouse();
                    warehouse.setM_warehouse_id(warehouseJson.getInt("m_warehouse_id"));
                    warehouse.setName(warehouseJson.getString("name"));

                    warehouseList.add(warehouse);
                }
            }
        }
        catch (Exception e){
            e.printStackTrace();
        }

    }

    public List<Store> getStoreList() {
        return storeList;
    }

    public void setStoreList(List<Store> storeList) {
        this.storeList = storeList;
    }
}
