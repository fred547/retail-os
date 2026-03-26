package org.posterita.report;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;

public class KitchenOrderReport extends AReport{
	
	private static Logger log = Logger.getLogger(KitchenOrderReport.class);

	private String format = "json";
	private String dateFrom, dateTo = null;
	
	public KitchenOrderReport(HttpServletRequest request, HttpServletResponse response) {
		super(request, response);
		
		dateFrom = request.getParameter("dateFrom");
		dateTo = request.getParameter("dateTo");
	}

	@Override
	public File getReport() {

		StringBuffer sql = new StringBuffer(" select DATE_LOGGED, PRINTER_NAME, RECEIPT from PRINTER_LOG ");
		
		if(dateFrom != null && dateTo != null && dateFrom.length() > 0 && dateTo.length() > 0) {
			
			sql.append(" WHERE ");
			sql.append(" DATE(DATE_LOGGED) between ");
			sql.append(" DATE('").append(dateFrom).append("')");
			sql.append(" and ");
			sql.append(" DATE('").append(dateTo).append("') ");
		}
		else
		{
			if(dateFrom != null && dateFrom.length() > 0){				
				
				sql.append(" WHERE ");
				sql.append(" DATE(DATE_LOGGED) >= ");
				sql.append(" DATE('").append(dateFrom).append("')");
			}
			else if(dateTo != null && dateTo.length() > 0)
			{	
				sql.append(" WHERE ");
				sql.append(" DATE(DATE_LOGGED) <= ");
				sql.append(" DATE('").append(dateTo).append("')");
			}
		}
		
		sql.append(" ORDER BY DATE_LOGGED ");

		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		JSONArray records = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();

			rs = stmt.executeQuery(sql.toString());
			
			Timestamp dateLogged = null;
			String receipt, printer, table, waiter, product, qty = null;
			
			JSONObject row;
			String[] chunks;
			
			int index;
			
			while(rs.next()) 
			{
				dateLogged = rs.getTimestamp(1);
				printer = rs.getString(2);
				receipt = rs.getString(3);
				
				chunks = receipt.split("\\r?\\n"); 			
				
				table = chunks[6];
				table = table.substring(4, table.length()-4);
				
				waiter = chunks[9].substring(8).trim();
				
				for(int j=12; j<chunks.length; j++) {
					
					product = chunks[j].trim();
					
					if(product.length() == 0) continue;
					
					index = product.indexOf('X');
					
					if(index > 0) {
						
						row = new JSONObject();
						row.put("dateLogged", dateLogged.getTime());
						row.put("printer", printer);
						row.put("table", table);
						row.put("waiter", waiter);
						row.put("qty", product.substring(0, index));
						row.put("product", product.substring(index + 2));
						
						
						records.put(row);
					}				
				}							
				
			}
			
			JSONObject j = new JSONObject();
			j.put("data", records);
			
			File file = File.createTempFile("KitchenOrderReport", ".json");
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
