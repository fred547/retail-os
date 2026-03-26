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

public class OrderServlet extends HttpServlet {
	
	HttpServletRequest request;
	HttpServletResponse response;
	
	private static Logger log = Logger.getLogger(OrderServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
		this.request = request;
		this.response = response;
		
		String action = request.getParameter("action");
		
		if("exportPDF".equalsIgnoreCase(action)) {
			exportPDF();
		}
		
		this.request = null;
		this.response = null;
    }
	
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
		doGet(request, response);
    }
	
	private void exportPDF()
	{
		int id = Integer.parseInt(request.getParameter("id"));
		
		Configuration configuration = Configuration.get();
		
		boolean isServerReachable = NetworkUtils.isServerReachable();
    	if(!isServerReachable)
    	{
    		return;
    	}
    	
		String serviceURL = configuration.getServerAddress() + "/service/v2/Order/exportPDF?json="; 
		
		String merchantKey = configuration.getMerchantKey();
		String terminalKey = configuration.getTerminalKey();
		
		JSONObject post = new JSONObject();		
		
		try 
		{
			post.put("id", id);
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
