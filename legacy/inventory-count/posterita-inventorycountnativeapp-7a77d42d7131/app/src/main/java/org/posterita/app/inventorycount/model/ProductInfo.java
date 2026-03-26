package org.posterita.app.inventorycount.model;

public class ProductInfo {

    private String location, barcode;
    private float qty;
    private boolean isHeader = false;

    public ProductInfo(){}

    public ProductInfo(String location, String barcode, float qty){
        this.location = location;
        this.barcode = barcode;
        this.qty = qty;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public float getQty() {
        return qty;
    }

    public void setQty(float qty) {
        this.qty = qty;
    }

    public boolean isHeader() {
        return isHeader;
    }

    public void setHeader(boolean header) {
        isHeader = header;
    }

    public boolean match(String s){

        if(s.length() == 0) return true;

        if( location.toLowerCase().indexOf(s.toLowerCase()) >= 0 || barcode.toLowerCase().indexOf(s.toLowerCase()) >= 0 ){
            return true;
        }

        return false;
    }
}
