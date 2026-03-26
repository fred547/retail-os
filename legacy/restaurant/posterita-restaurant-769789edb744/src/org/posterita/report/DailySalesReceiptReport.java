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

public class DailySalesReceiptReport extends AReport {
	
	private static Logger log = Logger.getLogger(DailySalesReceiptReport.class);
	
	private String dateFrom, dateTo = null;

	public DailySalesReceiptReport(HttpServletRequest request, HttpServletResponse response) {
		super(request, response);
		
		dateFrom = request.getParameter("dateFrom");
		dateTo = request.getParameter("dateTo");
		
		format = "json";
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
			
			JSONObject order, record = null;			
			
			String documentNo, dateOrdered, docAction, uuid, orderType, tenderType;
			
			/* c_order.dateordered, 
			 * c_order.documentno,
			 * c_order.ordertype, 
			 * ad_user.name as salesrep, 
			 * c_bpartner.name as customer, 
			 * c_order.paymentrule , 
			 * c_order.docstatus, 
			 * c_order.c_order_id*/
			
			int salesRepId, bpartnerId;
			
			while(rs.next()) 
			{
				order = new JSONObject(rs.getString(1));
								
				records.put(order);
				
			}
			
			JSONObject j = new JSONObject();
			j.put("data", records);
			
			File file = File.createTempFile("DailySalesReceiptReport", ".json");
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
