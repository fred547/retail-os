package org.posterita.servlet;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.client.printing.Base64;
import org.posterita.client.printing.PosteritaBridge;

public class PrinterServlet extends HttpServlet {
	
	private static Logger log = Logger.getLogger(PrinterServlet.class);
	static PosteritaBridge bridge = new PosteritaBridge();
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        	
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
    	response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	String result = null;
    	
    	String action = request.getParameter("action");
    	
    	if("getPrinters".equals(action))
    	{
    		bridge.loadPrintServices();
    		result = bridge.getPrintersAsJSON();
    		
    		log.info("Printers : " + result);
    	}
    	else if("print".equals(action))
    	{
    		String job = request.getParameter("job");
    		String printer = request.getParameter("printer");
    		
    		byte[] decoded = Base64.decode(job);
    		
    		String printData = new String(decoded, "UTF-8");
    		bridge.addJob(printer, printData);
    		
    		result = "{\"sent\" : true}";
    	}
    	else if("ip-print".equals(action))
    	{
    		String job = request.getParameter("job");
    		String hostname = request.getParameter("ip");
    		
    		byte[] decoded = Base64.decode(job);
    		
    		int port = 9100;    		
    		    		
    		try 
    		{
    			Socket soc = new Socket();
    			soc.connect(new InetSocketAddress(hostname, port), 1500);
    			BufferedOutputStream bos = new BufferedOutputStream(soc.getOutputStream());
    			bos.write(decoded);
    			bos.flush();
    			bos.close();
    			soc.close();
    			
    			result = "{\"sent\" : true}";
    		} 
    		catch(SocketTimeoutException se) 
    		{
    			result = "{\"sent\" : false, \"error\" : \"Failed to connect to printer - "+ hostname +"\"}";
    			log.error("Error - Connection timeout! Printer - " + hostname);    
    			
    			se.printStackTrace();
    		}
    		catch (IOException e) 
    		{
    			result = "{\"sent\" : false, \"error\" : \"Failed to send job to printer - "+ hostname +"\"}";
    			log.error(result);
    			
    			e.printStackTrace();
    			
    		}   
    		
    	}
    	else
    	{
    		
    	}
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }

}
