package org.posterita.app.inventoryspotcheck.model;

import java.util.List;

public class Store {

    private int ad_org_id;
    private String name;

    private List<Warehouse> warehouseList;

    public int getAd_org_id() {
        return ad_org_id;
    }

    public void setAd_org_id(int ad_org_id) {
        this.ad_org_id = ad_org_id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Warehouse> getWarehouseList() {
        return warehouseList;
    }

    public void setWarehouseList(List<Warehouse> warehouseList) {
        this.warehouseList = warehouseList;
    }
}
