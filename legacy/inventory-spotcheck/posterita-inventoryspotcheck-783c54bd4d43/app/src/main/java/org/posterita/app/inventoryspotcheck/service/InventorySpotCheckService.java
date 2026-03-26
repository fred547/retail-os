package org.posterita.app.inventoryspotcheck.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.model.Result;
import org.posterita.app.inventoryspotcheck.util.HTTPUtil;

public class InventorySpotCheckService {

    /**
     *
     * @param server_address
     * @param ad_client_id
     * @param documentNo
     * @return {"found":true,"spotcheck":{"documentNo":"1000001","totalQtyCounted":"0.00","docStatus":"DR","inventorySpotCheckId":1000001,"warehouseId":10006734,"dateCompleted":null,"description":null,"totalQtyBook":"0.00","lines":[{"qtyDifference":"0.00","qtyCounted":"0.00","m_product_id":10938182,"qtyBook":"0.00","inventorySpotCheckLineId":1000001,"name":"1 round Tahitian pearl + shell charm - Sterling Silver","description":"1 round Tahitian pearl + shell charm - Sterling Silver","location":"","barcode":"BTTD02 - T SH"},{"qtyDifference":"0.00","qtyCounted":"0.00","m_product_id":10870420,"qtyBook":"0.00","inventorySpotCheckLineId":1000002,"name":"Blue Shirt","description":"Blue Shirt","location":"","barcode":"T0001"},{"qtyDifference":"0.00","qtyCounted":"0.00","m_product_id":10938207,"qtyBook":"0.00","inventorySpotCheckLineId":1000003,"name":"Into the Blue","description":"Into the Blue","location":"","barcode":"Liv-07"},{"qtyDifference":"0.00","qtyCounted":"0.00","m_product_id":10938204,"qtyBook":"0.00","inventorySpotCheckLineId":1000004,"name":"Pink Round Pearl - Rose Gold Vermeil","description":"Pink Round Pearl - Rose Gold Vermeil","location":"","barcode":"RMC04 - P"},{"qtyDifference":"0.00","qtyCounted":"0.00","m_product_id":10938733,"qtyBook":"0.00","inventorySpotCheckLineId":1000005,"name":"Rakesh","description":"rakesh","location":"","barcode":"rak123"}],"warehouseName":"Dummy1 Mall","totalQtyDifference":"0.00","completedBy":null}}
     */

    public static Result getDocument(String server_address, int ad_client_id, String documentNo){

        String url = server_address + "/service/InventorySpotCheck/document?json={'merchantKey':" + ad_client_id + ",'terminalKey':0, 'documentno':'" + documentNo +"'}";

        Result result = new Result();

        try
        {
            JSONObject json = HTTPUtil.getResponseAsJson(url);
            result.setJson(json);
        }
        catch (Exception e)
        {
            e.printStackTrace();
            result.setError(e.getMessage());
        }

        return result;

    }

    public static Result completeDocument(String server_address, int ad_client_id, int ad_user_id, String documentJSON){

        String url = server_address + "/service/InventorySpotCheck/complete";

        Result result = new Result();

        try
        {

            JSONObject post = new JSONObject(documentJSON);
            post.put("merchantKey", ad_client_id);
            post.put("ad_user_id", ad_client_id);
            post.put("terminalKey", 0);

            JSONObject json = HTTPUtil.getPostResponseAsJson(url, post.toString());
            result.setJson(json);
        }
        catch (Exception e)
        {
            e.printStackTrace();
            result.setError(e.getMessage());
        }

        return result;


    }

    public static Result createAndCompleteDocument(String server_address, int ad_client_id, int ad_user_id, int m_warehouse_id, JSONArray counts){

        String url = server_address + "/service/InventorySpotCheck/createAndComplete";

        Result result = new Result();

        try
        {

            JSONObject post = new JSONObject();
            post.put("merchantKey", ad_client_id);
            post.put("ad_user_id", ad_user_id);
            post.put("terminalKey", 0);
            post.put("m_warehouse_id", m_warehouse_id);

            post.put("lines", counts);

            JSONObject json = HTTPUtil.getPostResponseAsJson(url, post.toString());
            result.setJson(json);
        }
        catch (Exception e)
        {
            e.printStackTrace();
            result.setError(e.getMessage());
        }

        return result;


    }
}
