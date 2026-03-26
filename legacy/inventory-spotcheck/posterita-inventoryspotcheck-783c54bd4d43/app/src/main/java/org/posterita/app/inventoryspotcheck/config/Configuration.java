package org.posterita.app.inventoryspotcheck.config;

import android.content.Context;
import android.content.SharedPreferences;

public class Configuration {

    private SharedPreferences preferences;
    private SharedPreferences.Editor editor;
    private Context context;

    private String PREFERENCE_FILE_NAME = "org.posterita.app.inventoryspotcheck.settings";
    private String SERVER_ENDPOINT = "SERVER_ENDPOINT";
    private String DOMAIN = "DOMAIN";
    private String AD_CLIENT_ID = "AD_CLIENT_ID";
    private String AD_ORG_ID = "AD_ORG_ID";
    private String AD_ORG_NAME = "AD_ORG_NAME";
    private String TERMINAL_ID = "TERMINAL_ID";
    private String AD_USER_ID = "AD_USER_ID";
    private String AD_USER_NAME = "AD_USER_NAME";
    private String M_WAREHOUSE_ID = "M_WAREHOUSE_ID";
    private String M_WAREHOUSE_NAME = "M_WAREHOUSE_NAME";
    private String USER_JSON = "USER_JSON";

    public Configuration(Context context){
        this.context = context;
        preferences = context.getSharedPreferences(PREFERENCE_FILE_NAME, Context.MODE_PRIVATE);
        editor = preferences.edit();
    }

    public String getServerEndpoint(){
        return preferences.getString(SERVER_ENDPOINT, "https://my.posterita.com");
    }

    public void setServerEndpoint(String serverEndpoint){
        editor.putString(SERVER_ENDPOINT, serverEndpoint);
        editor.commit();
    }

    public String getDomain(){
        return preferences.getString(DOMAIN, null);
    }

    public void setDomain(String domain){
        editor.putString(DOMAIN, domain);
        editor.commit();
    }

    public int getClientId(){
        return preferences.getInt(AD_CLIENT_ID, -1);
    }

    public void setClientId(int clientId){
        editor.putInt(AD_CLIENT_ID, clientId);
        editor.commit();
    }

    public String getStoreName(){
        return preferences.getString(AD_ORG_NAME, null);
    }

    public void setStoreName(String storeName){
        editor.putString(AD_ORG_NAME, storeName);
        editor.commit();
    }

    public int getStoreId(){
        return preferences.getInt(AD_ORG_ID, -1);
    }

    public void setStoreId(int storeId){
        editor.putInt(AD_ORG_ID, storeId);
        editor.commit();
    }

    public String getWarehouseName(){
        return preferences.getString(M_WAREHOUSE_NAME, null);
    }

    public void setWarehouseName(String warehouseName){
        editor.putString(M_WAREHOUSE_NAME, warehouseName);
        editor.commit();
    }

    public int getWarehouseId(){
        return preferences.getInt(M_WAREHOUSE_ID, -1);
    }

    public void setWarehouseId(int warehouseId){
        editor.putInt(M_WAREHOUSE_ID, warehouseId);
        editor.commit();
    }

    public String getUserName(){
        return preferences.getString(AD_USER_NAME, null);
    }

    public void setUserName(String userName){
        editor.putString(AD_USER_NAME, userName);
        editor.commit();
    }

    public int getUserId(){
        return preferences.getInt(AD_USER_ID, -1);
    }

    public void setUserId(int userId){
        editor.putInt(AD_USER_ID, userId);
        editor.commit();
    }

    public String getUserJson(){
        return preferences.getString(USER_JSON, null);
    }

    public void setUserJon(String userJson){
        editor.putString(USER_JSON, userJson);
        editor.commit();
    }

    public void reset(){
        editor.clear();
        editor.commit();
    }

    public void resetUser(){
        editor.remove(AD_USER_NAME);
        editor.remove(AD_USER_ID);
        editor.remove(USER_JSON);
        editor.commit();
    }

    public void resetStore(){
        editor.remove(AD_ORG_NAME);
        editor.remove(AD_ORG_ID);
        editor.remove(M_WAREHOUSE_NAME);
        editor.remove(M_WAREHOUSE_ID);
        editor.commit();
    }

}
