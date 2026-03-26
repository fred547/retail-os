package org.posterita.app.inventoryspotcheck.model;

import java.math.BigDecimal;

public class CountBean {

    String barcode;
    BigDecimal qtyCounted;

    public CountBean(){}

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public BigDecimal getQtyCounted() {
        return qtyCounted;
    }

    public void setQtyCounted(BigDecimal qtyCounted) {
        this.qtyCounted = qtyCounted;
    }
}
