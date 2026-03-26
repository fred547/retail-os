package org.posterita.app.inventoryspotcheck.service;

import org.json.JSONObject;
import org.posterita.app.inventoryspotcheck.model.LogInResult;
import org.posterita.app.inventoryspotcheck.model.StoreAndWarehouseResult;
import org.posterita.app.inventoryspotcheck.model.UsersResult;
import org.posterita.app.inventoryspotcheck.model.ValidateDomainResult;
import org.posterita.app.inventoryspotcheck.util.HTTPUtil;

public class LogInService {

    /**
     *
     * @param server_address
     * @param domain
     * @return
     * @throws Exception
     *
     * {"found":false}
     *
     * {"found":true,"ad_client_id":10005349}
     */
    public static ValidateDomainResult validateDomain(String server_address, String domain){

        String url = server_address + "/service/LogIn/validateDomain?json={'merchantKey':0,'terminalKey':0, 'domain':'" + domain + "'}";

        ValidateDomainResult result = new ValidateDomainResult();

        try
        {
            JSONObject json = HTTPUtil.getResponseAsJson(url);
            result.setJson(json);

            result.setFound(json.getBoolean("found"));

            if(result.isFound()){
                result.setAd_client_id(json.getInt("ad_client_id"));
            }
        }
        catch (Exception e)
        {
            e.printStackTrace();
            result.setError(e.getMessage());
        }



        return result;

    }



    //{"list":[{"ad_org_id":10001098,"name":"JamieKnight","warehouses":[{"name":"JamieKnight","m_warehouse_id":10001400}]}]}
    public static StoreAndWarehouseResult storeAndWarehouse(String server_address, int ad_client_id){

        String url = server_address + "/service/LogIn/storeAndWarehouse?json={'merchantKey':" + ad_client_id + ",'terminalKey':0}";

        StoreAndWarehouseResult result = new StoreAndWarehouseResult();

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


    //{"list":[{"name":"Admin"},{"name":"User"},{"name":"User1"}]}
    public static UsersResult users(String server_address, int ad_client_id){

        String url = server_address + "/service/LogIn/users?json={'merchantKey':" + ad_client_id + ",'terminalKey':0}";

        UsersResult result = new UsersResult();

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

    //{"found":false}
    /*
    {"found":true,"user":{"role":{"allow_info_cashjournal":"Y","allow_update_price":"Y","updatedby":10126496,"supervisor_id":"","isshowacct":"N","allow_info_bpartner":"Y","overwritepricelimit":"Y","isdiscountuptolimitprice":"N","allow_pick_item":"Y","isaccessallorgs":"Y","createdby":100,"preferencetype":"O","allow_info_product":"Y","allow_info_invoice":"Y","allow_info_order":"Y","ad_client_id":10005349,"allow_info_account":"Y","ad_tree_menu_id":"","ispersonalaccess":"Y","confirmqueryrecords":0,"amtapproval":0,"c_currency_id":"","ismanual":"N","ischangelog":"N","allow_complete_inventorycount":"N","userdiscount":100.00,"allow_order_void":"Y","created":"2015-10-27 11:15:17.0","allow_view_stock":"Y","allow_cycle_count":"Y","connectionprofile":"","iscanexport":"Y","allow_info_asset":"Y","savestocktransfer":"N","allow_stocktransfer_void":"Y","viewpurchaseprice":"Y","allow_upsell":"N","allow_info_schedule":"Y","editattendance":"Y","name":"Administrator","allow_reorder_level":"Y","allow_info_payment":"Y","updated":"2022-05-10 09:46:20.0","allow_info_inout":"Y","ad_org_id":10006331,"isactive":"Y","allow_place_item":"Y","description":"","saveorders":"Y","iscanapproveowndoc":"Y","allow_void_purchase":"N","discountoncurrentprice":"N","allow_order_backdate":"Y","allow_payment_void":"Y","isdiscountallowedontotal":"Y","iscanreport":"Y","ad_role_id":10016437,"isuseuserorgaccess":"N","ad_tree_org_id":"","allow_save_shipment":"N","allow_order_exchange":"Y","allow_order_refund":"Y","allow_order_split":"Y","allow_info_resource":"Y","allow_inventory_void":"Y","allow_complete_send_stock":"N","ispersonallock":"N","maxqueryrecords":0,"allow_reset_mappings":"N","allow_change_terminal":"Y","userlevel":"  O","allow_move_item":"Y","enablesignupverification":"N"},"isactive":true,"name":"Admin","ad_user_id":10126496}}
     */
    public static LogInResult logIn(String server_address, int ad_client_id, String username, String pin){

        String url = server_address + "/service/LogIn/logIn?json={'merchantKey':" + ad_client_id + ",'terminalKey':0, 'username':'" + username + "', 'pin':'" + pin + "', 'password':''}";

        LogInResult result = new LogInResult();

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


}
