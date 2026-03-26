package org.posterita.report;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;

public class ItemsOrderedReport extends AReport {

	private static Logger log = Logger.getLogger(ItemsOrderedReport.class);
	
	private String format = "json";
	private String dateFrom, dateTo = null;

	public ItemsOrderedReport(HttpServletRequest request, HttpServletResponse response) {
		super(request, response);
		
		dateFrom = request.getParameter("dateFrom");
		dateTo = request.getParameter("dateTo");
	}

	@Override
	public File getReport() {

		StringBuffer sql = new StringBuffer(" select value from orders ");
		
		if(dateFrom != null && dateTo != null && dateFrom.length() > 0 && dateTo.length() > 0) {
			
			sql.append(" WHERE ");
			sql.append(" DATE(DATE_ORDERED) between ");
			sql.append(" DATE('").append(dateFrom).append("')");
			sql.append(" and ");
			sql.append(" DATE('").append(dateTo).append("') ");
		}
		else
		{
			if(dateFrom != null && dateFrom.length() > 0){				
				
				sql.append(" WHERE ");
				sql.append(" DATE(DATE_ORDERED) >= ");
				sql.append(" DATE('").append(dateFrom).append("')");
			}
			else if(dateTo != null && dateTo.length() > 0)
			{	
				sql.append(" WHERE ");
				sql.append(" DATE(DATE_ORDERED) <= ");
				sql.append(" DATE('").append(dateTo).append("')");
			}
		}

		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		JSONArray records = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();

			rs = stmt.executeQuery(sql.toString());			
			
			JSONObject row, order = null;
			
			JSONObject orderJson, commandInfo, orderline;			
			
			String terminal, store, documentNo, dateOrdered, type, bpName, docAction, uuid;
			String product, qtyEntered, lineNetAmt, discountAmt, timestamp;
			
			int cashier;
			int waiter;
			
			JSONArray orderlines;
			
			while(rs.next()) 
			{
				order = new JSONObject(rs.getString(1));
				
				documentNo = order.getString("documentNo");
				bpName = order.getString("bpName");
				docAction = order.getString("docAction");
				
				cashier = order.getInt("salesRepId");			
				dateOrdered = order.optString("timestamp", "0");
				uuid = order.getString("uuid");
				
								
				commandInfo = null;
				if(order.has("commandInfo")) {
					commandInfo = order.getJSONObject("commandInfo");
				}
				
				orderlines = order.getJSONArray("lines");
				
				for(int j=0; j< orderlines.length(); j++) {
					orderline = orderlines.getJSONObject(j);
					
					waiter = orderline.optInt("salesrep_id", 0);
					product = orderline.getString("productName");
					qtyEntered = orderline.getString("qtyEntered");
					lineNetAmt = orderline.getString("lineNetAmt");
					discountAmt = orderline.getString("discountAmt");					
					timestamp = orderline.optString("timestamp", dateOrdered);
					
					row = new JSONObject();
					
					row.put("dateOrdered", timestamp);
					row.put("commandInfo", commandInfo);
					row.put("documentNo", documentNo);
					row.put("bpName", bpName);
					row.put("docAction", docAction);
					row.put("cashier", cashier);
					row.put("waiter", waiter);
					row.put("product", product);
					row.put("qty", qtyEntered);
					row.put("price", lineNetAmt);
					row.put("discount", discountAmt);
					row.put("uuid", uuid);
					
					records.put(row);
				}				
				
			}
			
			JSONObject j = new JSONObject();
			j.put("data", records);
			
			File file = File.createTempFile("ItemsOrderedReport", ".json");
			BufferedWriter writer = new BufferedWriter(new FileWriter(file));
			
			writer.write(j.toString());
			
			writer.flush();
			writer.close();
			
			return file;

		} catch (Exception e) {
			log.error(e);
		} finally {
			Database.close(conn, stmt, rs);
		}

		return null;
	}

}
