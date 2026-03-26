package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.model.Order;

public class JSONServlet  extends HttpServlet {
	
	private static final Object LOCK = new Object();
	
	private static Logger log = Logger.getLogger(JSONServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
		
        String json = getJson(request, response);
        if(json == null)
        {
        	response.setContentType("text/javascript");
        	response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        	response.getWriter().print(errorMessage("Not found"));
        	return;
        }
        
        response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(json);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
    	response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	String result = processPost(request, response);
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////
    private String getJson(HttpServletRequest request, HttpServletResponse response)
    {    	
    	String requestURI = request.getRequestURI();
    	String contexPath = request.getContextPath();
    	
    	String resource = requestURI.substring(contexPath.length());
    	
    	// resource can be /table or /table/id
    	
    	String[] params = resource.split("/");
    	
    	String json = null;
    	
    	try 
    	{
			if(params.length <= 1)
			{
				json = errorMessage("Invalid request");
			}
			else if(params.length == 2)
			{
				String table = params[1];
				
				boolean allColumns = false;
				
				if(request.getParameter("full") != null) {
					
					allColumns = true;
					
				}
				
				json = Database.getAllFrom(table, null, allColumns);
			}
			else if(params.length == 3)
			{
				String table = params[1];
				String id = params[2];				
				
				json = Database.get(table, id);
			}
			else
			{
				json = errorMessage("Invalid request");
			}
		} 
    	catch (DatabaseException e) 
    	{
			log.error(e);
			json = errorMessage("Server Error - " + e.getMessage());
		}
    	
    	
    	return json;
    	
    }
    
    private String processPost(HttpServletRequest request, HttpServletResponse response)
    {
    	String json = request.getParameter("json");
    	String result = json;
    	
    	String requestURI = request.getRequestURI();
    	String contexPath = request.getContextPath();
    	
    	String resource = requestURI.substring(contexPath.length());
    	
    	// resource can be /table or /table/id
    	
    	String[] params = resource.split("/");
    	
    	if(params.length <= 1)
    	{
    		result = errorMessage("Invalid request");
    		return result;
    	}
    	
    	String table = params[1];
    	
    	if("ORDERS".equalsIgnoreCase(table))
    	{
    		synchronized (LOCK) {
    			
    			try 
    			{ 				
					json = Order.saveOrder(json);
					return json; // Skip Database.put(table, json, "id"); as it is has already been saved
					
				} catch (Exception e) {
					log.error(e);
		    		return errorMessage("Server Error - " + e.getMessage());
				}
    			
    		}
    	}
    	
    	try 
    	{
			Database.put(table, json, "id");
		} 
    	catch (DatabaseException e) 
    	{
    		log.error(e);
    		return errorMessage("Server Error - " + e.getMessage());
		}
    	
    	return json;
    }
    
    public String errorMessage(String message)
	{
		JSONObject json = new JSONObject();
		
		try 
		{
			json.put("error", message);
		} 
		catch (JSONException e) 
		{
			log.error(e);
		}
		
		return json.toString();
	}

}
