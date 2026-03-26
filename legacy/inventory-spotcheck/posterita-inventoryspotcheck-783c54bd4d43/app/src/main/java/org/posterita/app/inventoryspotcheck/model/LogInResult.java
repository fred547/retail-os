package org.posterita.app.inventoryspotcheck.model;

import org.json.JSONObject;

public class LogInResult extends Result {

    private boolean found;
    private boolean isActive;
    private JSONObject userJson;
    private int ad_user_id;

    @Override
    public void setJson(JSONObject json) {
        super.setJson(json);

        try
        {
            found = json.getBoolean("found");

            if(found){
                userJson = json.getJSONObject("user");
                isActive = userJson.getBoolean("isactive");
                ad_user_id = userJson.getInt("ad_user_id");
            }
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    public boolean isFound() {
        return found;
    }

    public void setFound(boolean found) {
        this.found = found;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public JSONObject getUserJson() {
        return userJson;
    }

    public void setUserJson(JSONObject userJson) {
        this.userJson = userJson;
    }

    public int getAd_user_id() {
        return ad_user_id;
    }

    public void setAd_user_id(int ad_user_id) {
        this.ad_user_id = ad_user_id;
    }
}
