package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.posterita.client.printing.Base64;
import org.posterita.client.printing.PosteritaBridge;

public class PrinterServlet extends HttpServlet {
	
	static PosteritaBridge bridge = new PosteritaBridge();
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	String result = null;
    	
    	String action = request.getParameter("action");
    	
    	if("getPrinters".equals(action))
    	{
    		result = bridge.getPrintersAsJSON();
    	}
    	else if("print".equals(action))
    	{
    		String job = request.getParameter("job");
    		String printer = request.getParameter("printer");
    		
    		try 
    		{
				byte[] decoded = Base64.decode(job);
				
				String printData = new String(decoded, "UTF-8");
				bridge.addJob(printer, printData);
				
				result = "{'sent':true}";
			} 
    		catch (Exception e) {
				
    			result = "{'sent':false, 'error':" + e.getMessage() + "}";
				e.printStackTrace();
			}
    	}
    	else
    	{
    		
    	}
    	
    	response.addHeader("Access-Control-Allow-Origin", "*");
    	response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    protected void doHead(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException{
    	
    	response.addHeader("Access-Control-Allow-Origin", "*");
    	response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	super.doHead(request, response);
    	
    }
    
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException{
    	
    	response.addHeader("Access-Control-Allow-Origin", "*");
    	response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	super.doOptions(request, response);
    	
    }

}
