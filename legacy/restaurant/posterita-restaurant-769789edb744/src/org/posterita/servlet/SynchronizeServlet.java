package org.posterita.servlet;

import java.io.IOException;
import java.util.function.BiFunction;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.database.DatabaseSynchronizer;

public class SynchronizeServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(SynchronizeServlet.class);
	private static final long serialVersionUID = 1L;

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	String result = execute(request, response);
    	
    	if("SSE".equalsIgnoreCase(result)){
    		return;
    	}
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    private String execute(HttpServletRequest request, HttpServletResponse response)
    {
    	String json = request.getParameter("json");
    	boolean isSSEMode = false; // HTML5 Server-Sent Events (SSE) 
    	
    	
    	BiFunction<String, String, String> sendUpdateFn = new BiFunction<String, String, String>() {
    		
    		int count = 1;
    		
			@Override
			public String apply(String event, String data) {
				
				try 
				{
					StringBuffer sb = new StringBuffer();
					sb.append(String.format("id:%d%n", count ++));
					sb.append(String.format("event:%s%n", event));
					sb.append(String.format("data:%s%n%n", data));
					
					//log.info(String.format("Sending SSE Event: %s", sb.toString()));					
					
					response.setContentType("text/event-stream");
			        response.setCharacterEncoding("UTF-8");
			        response.setHeader("Connection", "keep-alive");
			        response.setStatus(HttpServletResponse.SC_OK);
			        
					response.getOutputStream().write(sb.toString().getBytes());
					response.getOutputStream().flush();
					
				} 
				catch (IOException e) 
				{
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				
				return null;
			}
		};
		
		if(request.getParameter("sse") != null) {
			
			log.info("***** SSE Mode *****");	        
			
    		isSSEMode = true;   
    		sendUpdateFn.apply("start", "");
    	}
    	
    	try 
    	{
			if(json == null){
				throw new Exception("Invalid Request");
			}
			
			
			JSONObject params = new JSONObject(json);
			
			if(!params.has("action")){
				throw new Exception("Invalid Request. Missing parameter action");
			}
			
			String action = params.getString("action");
			
			//initialize database
			Database.initialize();
			DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();
			
			if(isSSEMode) {
				synchronizer.addListener(s -> sendUpdateFn.apply("progress", s));
			}
						
			if("ordersAndDocumentNo".equals(action)){
				synchronizer.synchronizeDocumentNo(true);
				synchronizer.synchronizeOrders(false, 0, false);
			}
			else if("orders".equals(action)){
				synchronizer.synchronizeOrders(false, 0, false);
			}
			else if("documentNo".equals(action)){
				synchronizer.synchronizeDocumentNo(true);
			}
			else if("clockInOut".equals(action)){
				synchronizer.synchronizeClockInOut();
			}
			else if("closeTill".equals(action)){
				synchronizer.synchronizeCloseTill();
			}
			else if("data".equals(action)){
				synchronizer.pullData();
			}
			else if("pos".equals(action)){
				synchronizer.synchronizeDocumentNo(true);
				synchronizer.synchronizeOrders(false, 0, false);
				synchronizer.synchronizeClockInOut();
				synchronizer.synchronizeCloseTill();					
				synchronizer.pullData();
			}
			else
			{
				throw new Exception("Invalid Request");
			}
			
			if(isSSEMode) {
				sendUpdateFn.apply("done", "Synchronized Successfully");
				return "SSE";
			}
			
			return new JSONObject().put("synchronized", true).toString();
			
    	}
    	catch (Exception e) 
    	{    		
			log.error(e);
			
			if(isSSEMode) {
				sendUpdateFn.apply("serverError", e.getMessage());
				return "SSE";
			}
			
			try {
				return new JSONObject().put("synchronized", false).put("error", e.getMessage()).toString();
			} catch (JSONException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
				return "{\"error\" : \"Server Error\"}";
			}
		}
    }
}
