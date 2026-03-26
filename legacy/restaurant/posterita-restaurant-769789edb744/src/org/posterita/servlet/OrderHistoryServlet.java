package org.posterita.servlet;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;

public class OrderHistoryServlet extends HttpServlet {
	
	private static Logger log = Logger.getLogger(OrderHistoryServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	int displaystart = Integer.parseInt(request.getParameter("iDisplayStart"));
		int displaylength = Integer.parseInt(request.getParameter("iDisplayLength"));
		int sEcho = Integer.parseInt(request.getParameter("sEcho"));
		
		String searchTerm = "";
		
		if(request.getParameter("sSearch") != null) {
			searchTerm = request.getParameter("sSearch");
			searchTerm = searchTerm.trim();
		}
		
		StringBuffer whereClause = new StringBuffer();
		
		String dateFrom = request.getParameter("dateFrom");
		String dateTo = request.getParameter("dateTo");
		
		if(dateFrom != null && dateTo != null && dateFrom.length() > 0 && dateTo.length() > 0) {
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("DATE(DATE_ORDERED) between ");
			whereClause.append("DATE('").append(dateFrom).append("')");
			whereClause.append(" and ");
			whereClause.append("DATE('").append(dateTo).append("') ");
		}
		else
		{
			if(dateFrom != null && dateFrom.length() > 0){
				
				if(whereClause.length() == 0){
					whereClause.append(" where ");
				}
				else{
					whereClause.append(" and ");
				}
				
				whereClause.append("DATE(DATE_ORDERED) >= ");
				whereClause.append("DATE('").append(dateFrom).append("')");
			}
			else if(dateTo != null && dateTo.length() > 0)
			{
				if(whereClause.length() == 0){
					whereClause.append(" where ");
				}
				else{
					whereClause.append(" and ");
				}
				
				whereClause.append("DATE(DATE_ORDERED) <= ");
				whereClause.append("DATE('").append(dateTo).append("')");
			}
		}
		
		String docStatus = request.getParameter("docStatus");
		if(docStatus != null && docStatus.length() > 0){
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("DOCSTATUS = '" + docStatus + "'");
		}
		
		String documentNo = request.getParameter("documentNo");
		if(documentNo != null && documentNo.length() > 0){
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("DOCUMENTNO = '" + documentNo + "'");
		}
		
		String paymentRule = request.getParameter("paymentRule");
		if(paymentRule != null && paymentRule.length() > 0){
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("TENDERTYPE = '" + paymentRule + "'");
		}
		
		String customerId = request.getParameter("customerId");
		if(customerId != null && customerId.length() > 0){
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("CUSTOMER_ID = " + customerId);
		}
		
		String salesRepId = request.getParameter("salesRepId");
		if(salesRepId != null && salesRepId.length() > 0){
			
			if(whereClause.length() == 0){
				whereClause.append(" where ");
			}
			else{
				whereClause.append(" and ");
			}
			
			whereClause.append("USER_ID = " + salesRepId);
		}
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		int count = 0;
		
		JSONObject json = new JSONObject();
		JSONArray jsonArray = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();			
			stmt = conn.createStatement();
			
			//get order count
			rs = stmt.executeQuery("select count(1) from orders " + whereClause.toString());
			if(rs.next()){
				count = rs.getInt(1);
			}
			rs.close();
			
			rs = stmt.executeQuery("select value from orders " + whereClause.toString() +  " order by date_ordered desc OFFSET " + displaystart + " ROWS FETCH NEXT " + displaylength + " ROWS ONLY");
			
			while(rs.next())
			{
				jsonArray.put(new JSONObject(rs.getString(1)));
			}
			
			
			json.put("sEcho", sEcho);
			json.put("data", jsonArray);
			json.put("draw", 1);
			json.put("recordsTotal", count);
			json.put("recordsFiltered", count);
			
			response.setContentType("text/javascript");
	        response.setStatus(HttpServletResponse.SC_OK);
	        response.getWriter().print(json.toString());
			
		} 
		catch (Exception e) 
		{
			log.error(e);
			
			try 
			{
				JSONObject error = new JSONObject();
				error.put("error", e.getMessage());
				response.getWriter().write(error.toString());
			} 
			catch (Exception e1) 
			{
				log.error(e1);
			}
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
		
    	
    	
    }

}

// select * from orders where DATE(DATE_ORDERED) between DATE('2015-12-07') and DATE('2015-12-07')
