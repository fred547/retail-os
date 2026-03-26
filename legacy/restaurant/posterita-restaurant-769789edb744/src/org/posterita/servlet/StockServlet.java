package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.util.NetworkUtils;

public class StockServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(StockServlet.class);
			
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	execute(request, response);
    }
    
    private void execute(HttpServletRequest request, HttpServletResponse response)
    {
    	String action = request.getParameter("action");
    	
    	if("inventoryAvailableReport".equalsIgnoreCase(action)){
    		
    		Configuration configuration = Configuration.get();
    		
    		boolean isServerReachable = NetworkUtils.isServerReachable();
        	if(!isServerReachable)
        	{
        		return;
        	}
        	
    		String serviceURL = configuration.getServerAddress() + "/service/Stock/inventoryAvailableReport?format=csv&json="; 
    		
    		String merchantKey = configuration.getMerchantKey();
    		String terminalKey = configuration.getTerminalKey();
    		
    		JSONObject post = new JSONObject();
    		try 
    		{
				post.put("merchantKey", merchantKey);
				post.put("terminalKey", terminalKey);
				
				serviceURL = serviceURL + post.toString();
				
				response.sendRedirect(serviceURL);
			} 
    		catch ( Exception e) 
    		{
				log.error(e);
			}
    		
    			
    		
    	}
    }

}
