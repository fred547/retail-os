package org.posterita.app.inventoryspotcheck.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class UsersResult extends Result {

    private List<String> userList;

    public UsersResult(){}

    @Override
    public void setJson(JSONObject json) {
        super.setJson(json);

        userList = new ArrayList<>();

        try
        {
            JSONArray list = json.getJSONArray("list");
            JSONObject user;

            for(int i=0; i<list.length(); i++){

                user = list.getJSONObject(i);

                userList.add(user.getString("name"));
            }
        }
        catch (Exception e)
        {
            e.printStackTrace();
        }

    }

    public List<String> getUserList() {
        return userList;
    }
}
