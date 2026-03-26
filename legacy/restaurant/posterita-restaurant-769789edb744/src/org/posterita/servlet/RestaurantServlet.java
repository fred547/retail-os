package org.posterita.servlet;

import java.io.IOException;
import java.sql.Timestamp;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.RestaurantException;
import org.posterita.model.PrinterLog;
import org.posterita.model.Restaurant;
import org.posterita.model.TableLock;

public class RestaurantServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(RestaurantServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	String result = execute(request, response);
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    private String execute(HttpServletRequest request, HttpServletResponse response)
    {
    	String json = request.getParameter("json");
    	
    	try 
    	{
			if(json == null){
				return "{\"error\" : \"Invalid Request\"}";
			}
			
			
			JSONObject params = new JSONObject(json);
			
			if(!params.has("action")){
				return "{\"error\" : \"Invalid Request. Missing parameter action\"}";
			}
			
			String action = params.getString("action");
			
			int ad_user_id = 0;
			int terminal_id = 0;
			
			if(params.has("ad_user_id")) {
				ad_user_id = params.getInt("ad_user_id");
			}			
			
			if(params.has("terminal_id")) {
				terminal_id = params.getInt("terminal_id");
			}
			
			if("get-tables".equalsIgnoreCase(action)) {
				
				return Restaurant.getAllTables().toString();
			}
			
			if("available-tables".equalsIgnoreCase(action)) {
				
				return Restaurant.getAvailableTables().toString();
			}
			
			if("get-take-away-no".equalsIgnoreCase(action)) {
				
				return Restaurant.getTakeAwayNo() + "";
				
			}
			
			if("get-dine-in-no".equalsIgnoreCase(action)) {
				
				return Restaurant.getDineInNo() + "";
				
			}
			
			if("get-take-aways".equalsIgnoreCase(action)) {
				
				return Restaurant.getTakeAways();
				
			}
			
			if("printer-log".equals(action)){
				
				if(!params.has("date_logged")){
					return "{\"error\" : \"Invalid Request. Missing parameter date_logged\"}";
				}
				
				Timestamp date_logged = Timestamp.valueOf(params.getString("date_logged"));
				String order_type = params.getString("order_type");
				String printer_name = params.getString("printer_name");
				String receipt = params.getString("receipt");
				String raw_receipt = params.getString("raw_receipt");
				String printed = params.getString("printed");
				
				JSONObject log = PrinterLog.log(date_logged, order_type, printer_name, receipt, raw_receipt, printed);
				return log.toString();
			}	
			
			if("update-printer-log".equals(action)) {
				
				if(!params.has("uuid")){
					return "{\"error\" : \"Invalid Request. Missing parameter uuid\"}";
				}
				
				String uuid = params.getString("uuid");
				
				Database.executeUpdate("update printer_log set printed='Y' where uuid = ?", new Object[] {uuid});
				
				return "{\"updated\":true}";
			}
			
			
			if(!params.has("table_id")){
				return "{\"error\" : \"Invalid Request. Missing parameter table_id\"}";
			}				
			
			
			int table_id = params.getInt("table_id");
			String identifier = params.optString("identifier", "0");
			
			if("void-order".equals(action)) {
				
				if(!params.has("order_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter order_id\"}";
				}
				
				String order_id = params.getString("order_id");
				
				return Restaurant.voidOrder(order_id, table_id, ad_user_id, terminal_id, identifier).toString();
				
			}
			
			if("get-table".equalsIgnoreCase(action)) {
				
				return Restaurant.getTable(table_id).toString();
				
			}
			else if("lock-table".equalsIgnoreCase(action) || ("unlock-table".equalsIgnoreCase(action))) {
				
				/*
				Restaurant.unlockTable(table_id);
				return "{\"unlock\" : \"true\"}";
				*/
				
				String tableId = Integer.toString(table_id);				
				
				if("lock-table".equalsIgnoreCase(action)) {
					
					boolean locked = TableLock.lockTable(tableId, identifier);
					return "{\"lock\" : " + locked + "}";
				}
				else 
				{
					boolean unLocked = TableLock.unLockTable(tableId, identifier);
					return "{\"unlock\" : " + unLocked + "}";
				}
				
			}
			else if("reserve-table".equalsIgnoreCase(action)) {
				
				return Restaurant.reserveTable(table_id, ad_user_id, terminal_id, identifier).toString();				
			}
			else if("send-to-kitchen".equalsIgnoreCase(action)) {
				Restaurant.logSendToKitchen(table_id, ad_user_id, terminal_id);
				return "{\"sent\" : \"true\"}";
				
			}
			else if ("checkout-table".equalsIgnoreCase(action)) {
				Restaurant.checkoutTable(table_id, ad_user_id, terminal_id);
				return "{\"sent\" : \"true\"}";
				
			}
			else if("cancel-reservation".equalsIgnoreCase(action)) {
				
				return Restaurant.cancelReservation(table_id, ad_user_id, terminal_id, identifier).toString();
			}
			else if("switch-table".equalsIgnoreCase(action)) {
				
				if(!params.has("to_table_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter to_table_id\"}";
				}
				
				int to_table_id = params.getInt("to_table_id");
				
				return Restaurant.switchTable(table_id, to_table_id, ad_user_id, terminal_id, identifier).toString();
				
			}
			else if("merge-tables".equalsIgnoreCase(action)) {
				
				if(!params.has("child_table_ids")){
					return "{\"error\" : \"Invalid Request. Missing parameter child_table_ids\"}";
				}
				
				String s = params.getString("child_table_ids");
				
				
				return Restaurant.mergeTables(table_id, s, ad_user_id, terminal_id, identifier).toString();
			}
			else if("clear-table".equalsIgnoreCase(action)) {
				
				return Restaurant.clearTable(table_id, ad_user_id, terminal_id, identifier).toString();
			}
			else if("update-table-status".equalsIgnoreCase(action)) {
				
				if(!params.has("status")){
					return "{\"error\" : \"Invalid Request. Missing parameter status\"}";
				}
				
				String status = params.getString("status");
				
				return Restaurant.updateTableStatus(table_id, status, ad_user_id, terminal_id, identifier).toString();
			}
			else if("assign-order".equalsIgnoreCase(action)) {
				
				if(!params.has("order_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter order_id\"}";
				}
				
				String order_id = params.getString("order_id");
				
				return Restaurant.assignOrder(table_id, order_id, ad_user_id, terminal_id, identifier).toString();
				
			}				
			else
			{
				return "{\"error\" : \"Invalid Request\"}";
			}
			
		} 
    	catch (RestaurantException e1) {
			log.error(e1);
			return "{\"error\" : \"" + e1.getMessage() + "\"}";
		}
    	catch (Exception e) {
			log.error(e);
			e.printStackTrace();
			return "{\"error\" : \"Error: " + e.getMessage() + "\"}";
		}
    }

}
