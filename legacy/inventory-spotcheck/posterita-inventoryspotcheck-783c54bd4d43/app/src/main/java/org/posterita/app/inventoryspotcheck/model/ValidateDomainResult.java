package org.posterita.app.inventoryspotcheck.model;

public class ValidateDomainResult extends Result {

    private boolean found = false;
    private int ad_client_id = 0;

    public ValidateDomainResult() {
    }

    public boolean isFound() {
        return found;
    }

    public void setFound(boolean found) {
        this.found = found;
    }

    public int getAd_client_id() {
        return ad_client_id;
    }

    public void setAd_client_id(int ad_client_id) {
        this.ad_client_id = ad_client_id;
    }
}
