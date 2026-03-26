package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.ServerUnavailableException;
import org.posterita.online.OnlineServiceExecutor;
import org.posterita.translation.I18n;

public class OnlineServlet extends HttpServlet 
{
	private static Logger log = Logger.getLogger(OnlineServlet.class);
	
	private static final long serialVersionUID = 1L;
	protected Configuration configuration;
	
	public void init()
	{
		this.configuration = Configuration.get(false);
	}

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	String json = request.getParameter("json");		
    	
    	//1. get service
    	String serviceURI = request.getRequestURI();
    	
    	OnlineServiceExecutor executor = new OnlineServiceExecutor(serviceURI);
    	
    	try 
    	{
			String result = executor.excecute(json);			
			filterResult(serviceURI, result);
			
			sendMessage(result, response);
		} 
    	catch (ServerUnavailableException e) 
    	{
    		log.error(e);
    		
    		String msg = I18n.t("online.server.unreachable.message");
    		String error = errorMessage( msg );
    		sendMessage(error, response);
		}
    	catch (Exception e) 
    	{
    		log.error(e);
    		
    		String error = errorMessage("Server Error - " + e.getMessage());
    		sendMessage(error, response);
		} 
    }
    
    private void sendMessage(String message, HttpServletResponse response) throws IOException
    {
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(message);
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
    
    private void filterResult(String requestURI, String response) throws JSONException, DatabaseException
    {
    	if(response.startsWith("{"))
    	{
    		JSONObject json = new JSONObject(response);
    		
    		String error = null;
        	if(json.has("error"))
        	{
        		error = json.getString("error");
        	}
        	
        	if("/service/BP/create".equals(requestURI))
        	{
        		if(error == null)
        		{
        			Database.put("bp", response, "id");
        		}
        	}
        	else if("/service/v2/Order/synchronizeDraftOrder".equals(requestURI))
        	{
        		int result = -1;
        		
        		if(error == null)
        		{
        			result = Database.executeUpdate("update orders set status='CO', value = ?, error_message=null where id = ?", new Object[]{ response, json.getString("uuid") });
        		}
        		else
        		{
        			result = Database.executeUpdate("update orders set status='ER', error_message=? where id = ?", new Object[]{ error, json.getString("uuid") });
        		}
        		
        		log.info("synchronizeDraftOrder -> update order status -> " + result);
        	}
    	}
    	
    	
    }

}
