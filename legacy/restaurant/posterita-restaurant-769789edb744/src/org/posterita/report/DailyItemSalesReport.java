package org.posterita.report;

import java.io.File;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.SimpleDateFormat;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.TreeMap;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;

public class DailyItemSalesReport extends AReport {
	
	private static Logger log = Logger.getLogger(DailyItemSalesReport.class);
	
	public DailyItemSalesReport(HttpServletRequest request, HttpServletResponse response) {
		super(request, response);
	}

	@Override
	public File getReport() {
		
		String sql = "select ordertype, value from orders where docstatus = 'CO' and date(date_ordered) = date(CURRENT_TIMESTAMP)";
		
		//ordertype - Customer Returned Order / POS Order
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		TreeMap<String, DailyItemSalesReportBean> map = new TreeMap<String, DailyItemSalesReportBean>();		
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery(sql);
			
			String orderType = null , value = null, productName = null;
			int negate = 1;
			JSONObject order = null, line = null, product = null;
			JSONArray lines = null;
			int i = 0, m_product_id = 0;
			double qty = 0.0d;			
			
			while(rs.next()){
				
				orderType = rs.getString(1);
				
				if("POS Order".equalsIgnoreCase(orderType)) {
					negate = 1;
				}
				else
				{
					negate = -1;
				}
				
				value = rs.getString(2);
				
				order = new JSONObject(value);
				
				lines = order.getJSONArray("lines");
				
				DailyItemSalesReportBean bean = null;
				
				for(i=0; i<lines.length(); i++) {
					
					line = lines.getJSONObject(i);					
					m_product_id = line.getInt("id");
					qty = line.getDouble("qtyEntered") * negate;
					productName = line.getString("productName");
					
					bean = map.get(productName);
					
					if(bean == null) {
						
						bean = new DailyItemSalesReportBean();
						
						product = new JSONObject( Database.get("PRODUCT", "" + m_product_id) );
						
						bean.name = product.getString("name");
						bean.description = product.getString("description");
						bean.barcode = product.getString("upc");
						bean.primarygroup = product.getString("primarygroup");
						bean.group1 = product.getString("group1");
						bean.group2 = product.getString("group2");
						bean.group3 = product.getString("group3");
						bean.group4 = product.getString("group4");
						bean.group5 = product.getString("group5");
						bean.group6 = product.getString("group6");
						bean.group7 = product.getString("group7");
						bean.group8 = product.getString("group8");
						
						map.put(productName, bean);
					}
					
					bean.qty += qty;
					
				} //for
			}
		} 
		catch (Exception e) {
			log.error(e);
		}
		finally
		{			
			Database.close(conn, stmt, rs);
		}
		
		
		//build report
		String[] headers = new String[]{"barcode", "item", "description", "qty", "primarygroup", "group1", "group2", "group3", "group4", "group5", "group6", "group7", "group8"};	
		
		try 
		{
			File file = File.createTempFile("DailyItemSalesReport", format );
			PrintWriter writer = new PrintWriter(file);
			
			Collection<DailyItemSalesReportBean> values = map.values();
			
			if("csv".equals(format)) {
				
				for(int i=0; i<headers.length; i++){
					
					writer.write("\"" + headers[i] + "\",");
					
				}
				
				writer.write("\n");
				
				for(DailyItemSalesReportBean bean : values) {
					
					writer.write("\"" + bean.barcode + "\",");
					writer.write("\"" + bean.name + "\",");
					writer.write("\"" + bean.description + "\",");
					writer.write("\"" + bean.qty + "\",");
					writer.write("\"" + bean.primarygroup + "\",");
					writer.write("\"" + bean.group1 + "\",");
					writer.write("\"" + bean.group2 + "\",");
					writer.write("\"" + bean.group3 + "\",");
					writer.write("\"" + bean.group4 + "\",");
					writer.write("\"" + bean.group5 + "\",");
					writer.write("\"" + bean.group6 + "\",");
					writer.write("\"" + bean.group7 + "\",");
					writer.write("\"" + bean.group8 + "\",");
					
					writer.write("\n");
				}		
				
			}else if("html".equals(format)) {
				
				writer.write("<table>");				
				writer.write("<tr>");
				
				for(int i=0; i<headers.length; i++){					
					writer.write("<th>" + headers[i] + "</th>");					
				}
				
				writer.write("</tr>");
				
				for(DailyItemSalesReportBean bean : values) {
					
					writer.write("<tr>");
					
					writer.write("<td>" + bean.barcode + "<td>");
					writer.write("<td>" + bean.name + "<td>");
					writer.write("<td>" + bean.description + "<td>");
					writer.write("<td>" + bean.qty + "<td>");
					writer.write("<td>" + bean.primarygroup + "<td>");
					writer.write("<td>" + bean.group1 + "<td>");
					writer.write("<td>" + bean.group2 + "<td>");
					writer.write("<td>" + bean.group3 + "<td>");
					writer.write("<td>" + bean.group4 + "<td>");
					writer.write("<td>" + bean.group5 + "<td>");
					writer.write("<td>" + bean.group6 + "<td>");
					writer.write("<td>" + bean.group7 + "<td>");
					writer.write("<td>" + bean.group8 + "<td>");
					
					writer.write("</tr>");;
				}
				
				writer.write("</table>");
				
			}
			else if("json".equals(format)) {
				
				JSONArray array = new JSONArray();
				JSONObject json = null;
				
				for(DailyItemSalesReportBean bean : values) {
					
					json = new JSONObject();
					
					json.put("barcode", bean.barcode);
					json.put("item", bean.name);
					json.put("description", bean.description);
					json.put("qty", bean.qty);
					json.put("primarygroup", bean.primarygroup);
					json.put("group1", bean.group1);
					json.put("group2", bean.group2);
					json.put("group3", bean.group3);
					json.put("group4", bean.group4);
					json.put("group5", bean.group5);
					json.put("group6", bean.group6);
					json.put("group7", bean.group7);
					json.put("group8", bean.group8);
					
					array.put(json);
				}
				
				writer.write(array.toString());
				
			}			
			
						
			writer.close();
			
			return file;
			
		} 
		catch (Exception e) {
			log.error(e);
		}
		
		return null;
	}
	
	class DailyItemSalesReportBean implements Comparable<DailyItemSalesReportBean>
	{
		String name;
		String barcode;
		String description;
		String primarygroup;
		String group1;
		String group2;
		String group3;
		String group4;
		String group5;
		String group6;
		String group7;
		String group8;
		double qty;
		
		@Override
		public int compareTo(DailyItemSalesReportBean o) {
			// TODO Auto-generated method stub
			return this.name.compareTo(o.name);
		}
	}

}
