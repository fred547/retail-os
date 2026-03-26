package org.posterita.servlet;

import java.io.IOException;
import java.sql.Timestamp;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.exception.ClockInOutException;
import org.posterita.model.ClockInOut;

public class ClockInOutServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(ClockInOutServlet.class);
	
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
			
			if(!params.has("terminal_id")){
				return "{\"error\" : \"Invalid Request. Missing parameter terminal_id\"}";
			}
			
			int terminal_id = params.getInt("terminal_id");
			
			if("clockIn".equals(action) || "clockOut".equals(action)){
				
				if(!params.has("user_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter user_id\"}";
				}
				
				int user_id = params.getInt("user_id");
				
				JSONObject result;
				
				try 
				{
					if("clockIn".equals(action)){
						// clock in
						if(!params.has("time_in")){
							return "{\"error\" : \"Invalid Request. Missing parameter time_in\"}";
						}
						
						Timestamp time_in = Timestamp.valueOf(params.getString("time_in"));
						
						result = ClockInOut.clockIn(terminal_id, user_id, time_in);
					}
					else
					{
						// clock out
						if(!params.has("time_out")){
							return "{\"error\" : \"Invalid Request. Missing parameter time_out\"}";
						}
						
						Timestamp time_out = Timestamp.valueOf(params.getString("time_out"));
						
						result = ClockInOut.clockOut(terminal_id, user_id, time_out);
					}
					
					JSONArray list = ClockInOut.getClockedInUsers(terminal_id);					
					result.put("clockedInUserList", list);
					
					return result.toString();
				} 
				catch (ClockInOutException e) 
				{
					log.error(e);
					// TODO Auto-generated catch block
					return "{\"error\" : \"" + e.getMessage() + "\"}";
				}
				
			}			
			else if("getClockedInUsers".equals(action)){
				//get clockedin user list
				JSONArray array = ClockInOut.getClockedInUsers(terminal_id);
				return array.toString();
			}
			else if("clockOutAll".equals(action)){
				//clock out all clocked in users
				if(!params.has("time_out")){
					return "{\"error\" : \"Invalid Request. Missing parameter time_out\"}";
				}
				
				Timestamp time_out = Timestamp.valueOf(params.getString("time_out"));
				
				JSONArray array = ClockInOut.clockOutAll(terminal_id, time_out);				
				return array.toString();
			}
			else
			{
				return "{\"error\" : \"Invalid Request\"}";
			}
		} 
    	catch (Exception e) {
			log.error(e);
		}
    	
    	return "{\"error\" : \"Server Error\"}";
    }

}
