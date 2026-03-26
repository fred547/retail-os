package org.posterita.servlet;

import java.io.IOException;
import java.sql.Timestamp;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.model.Application;
import org.posterita.model.CartLog;
import org.posterita.model.OpenDrawer;
import org.posterita.model.RePrint;

public class SystemServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(SystemServlet.class);
	
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
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    private String execute(HttpServletRequest request, HttpServletResponse response)
    {
    	String json = request.getParameter("json");
    	
    	try 
    	{
			if(json == null){
				return "{\"error\" : \"Invalid Request\"}";
			}
			
			
			JSONObject params = new JSONObject(json);
			
			if(!params.has("action")){
				return "{\"error\" : \"Invalid Request. Missing parameter action\"}";
			}
			
			String action = params.getString("action");
			
			if("sendErrorLog".equals(action)){
				
				boolean sent = Application.sendErrorLog();
				
				if(sent)
				{
					return "{\"sent\" : \"true\"}";
				}
				
				return "{\"error\" : \"Failed to send error log\"}";
			}
			if("sendDB".equals(action)){
				
				boolean sent = Application.sendDB();
				
				if(sent)
				{
					return "{\"sent\" : \"true\"}";
				}
				
				return "{\"error\" : \"Failed to send DB\"}";
			}
			else if("systemInfo".equals(action)){
				
				JSONObject systemInfo = Application.getSystemInfo();
				
				return systemInfo.toString();
				
			}
			else if("serverStatus".equals(action)){
				
				JSONObject serverStatus = Application.getServerStatus();
				
				return serverStatus.toString();
				
			}
			else if( "rePrint".equals(action) || "openDrawer".equals(action) || "cartLog".equals(action)){
				
				if(!params.has("terminal_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter terminal_id\"}";
				}
				
				int terminal_id = params.getInt("terminal_id");
				
				if(!params.has("user_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter user_id\"}";
				}
				
				int user_id = params.getInt("user_id");				
								
				JSONObject result;
				
				if("rePrint".equals(action)){
					
					if(!params.has("date_printed")){
						return "{\"error\" : \"Invalid Request. Missing parameter date_printed\"}";
					}
					
					Timestamp date_printed = Timestamp.valueOf(params.getString("date_printed"));
					
					if(!params.has("order_id")){
						return "{\"error\" : \"Invalid Request. Missing parameter order_id\"}";
					}
					
					String order_id = params.getString("order_id");
					
					result = RePrint.print(date_printed, user_id, terminal_id, order_id);
					
				}
				else if("openDrawer".equals(action)){
					
					if(!params.has("date_opened")){
						return "{\"error\" : \"Invalid Request. Missing parameter date_opened\"}";
					}
					
					Timestamp date_opened = Timestamp.valueOf(params.getString("date_opened"));
					String reason = params.getString("reason");
					
					result = OpenDrawer.open(date_opened, user_id, terminal_id, reason);
				}
				else if("cartLog".equals(action)){
					
					if(!params.has("date_logged")){
						return "{\"error\" : \"Invalid Request. Missing parameter date_logged\"}";
					}
					
					Timestamp date_logged = Timestamp.valueOf(params.getString("date_logged"));
					String event = params.getString("event");
					double qty = params.getDouble("qty");
					double amount = params.getDouble("amount");
					String description = params.getString("description");
					
					result = CartLog.log(date_logged, user_id, terminal_id, event, qty, amount, description);
				}					
				else
				{
					return "{\"error\" : \"Invalid Request\"}";
				}
				
				return result.toString();
				
			}
			else if("setLogLevel".equals(action)){
				
				if(!params.has("level")){
					return "{\"error\" : \"Invalid Request. Missing parameter level\"}";
				}
				
				String level = params.getString("level");
				
				Logger l = Logger.getRootLogger();
				
				if( level.equalsIgnoreCase("debug")) {
					
					l.setLevel(Level.DEBUG);
					
				}
				else if( level.equalsIgnoreCase("info") ) {
					
					l.setLevel(Level.INFO);
					
				}
				else
				{
					l.setLevel(Level.WARN);
				}
				
				return "{\"set\" : \"true\", \"level\" : \"" + l.getLevel().toString() + "\"}";
			}
			else if("resetFailedOrders".equals(action)) {
				
				int count = Database.executeUpdate("update orders set status = '', error_message = null where status = 'ER'");
				
				return "{\"updated\" : " + count + "}";
				
			}
			else
			{
				return "{\"error\" : \"Invalid Request\"}";
			}
		} 
    	catch (Exception e) {
			log.error(e);
			
			return "{\"error\" : \"Server Error\", \"cause\" :\""+ e.getMessage() + "\"}";
		}
    }

}
