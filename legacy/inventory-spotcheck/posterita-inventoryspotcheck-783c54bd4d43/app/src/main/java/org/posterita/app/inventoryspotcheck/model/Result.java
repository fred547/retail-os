package org.posterita.app.inventoryspotcheck.model;

import org.json.JSONObject;

public class Result {

    private String error;
    private JSONObject json;

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public JSONObject getJson() {
        return json;
    }

    public void setJson(JSONObject json) {
        this.json = json;
    }
}
