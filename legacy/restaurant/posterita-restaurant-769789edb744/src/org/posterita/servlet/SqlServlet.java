package org.posterita.servlet;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;

public class SqlServlet extends HttpServlet
{
	private static final long serialVersionUID = 1L;
	private static Logger log = Logger.getLogger(SqlServlet.class);
	
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
    	String sql = request.getParameter("q");
    	
    	if(sql == null) {
    		
    		return "{\"error\" : \"Invalid Request\"}";
    		
    	}
    	
    	String s = sql.toLowerCase();
    	
    	log.info("Executing:" + sql);
    	
    	
    	JSONArray columns = new JSONArray();
    	JSONArray data = new JSONArray();
    	
    	try 
    	{
			if(s.startsWith("select "))
			{
				
				Connection conn = null;
				ResultSet rs = null;
				Statement stmt = null;
				
				try 
				{			
					conn = Database.getConnection();
					stmt = conn.createStatement();
					rs = stmt.executeQuery(sql);
					
					ResultSetMetaData metaData = rs.getMetaData();
					
					//1. populate columns	
					
					String columnName = null;
					int columnCount = metaData.getColumnCount();
					
					for(int i=1; i<= columnCount; i++)
					{
						columnName = metaData.getColumnName(i);
						
						columns.put(new JSONObject().put("title", columnName));
					}
					
					//2. populate data
					
					Object rowData = null;
					JSONArray row = null;
					int j;
					
					while(rs.next()) 
					{
						row = new JSONArray();
						
						for(j=1; j<=columnCount; j++)
						{							
							rowData = rs.getObject(j);
							
							if (rowData == null)
							{
								rowData = "";
							}
							
							row.put(rowData);
							
						}
						
						data.put(row);						
						
					}
					
					
				}
				catch (Exception e) 
				{
					throw new DatabaseException(e);
					
				}
				finally
				{
					Database.close(conn, stmt, rs);
				}
				
				    		
			}
			else if(s.startsWith("update ") 
					|| s.startsWith("create ") 
					|| s.startsWith("delete ") 
					|| s.startsWith("drop ") 
					|| s.startsWith("alter ") 
					|| s.startsWith("insert "))
			{
				int count = Database.executeUpdate(sql);
				
				columns.put(new JSONObject().put("title", "Records"));
				data.put(new JSONArray().put(count));
			}
			else
			{
				return "{\"error\" : \"Invalid SQL\"}";
			}
			
			log.info("Executing:" + sql);
			
			JSONObject result = new JSONObject();
			
			result.put("columns", columns);
			result.put("data", data);
			
			return result.toString();
		} 
    	catch (DatabaseException e) 
    	{
			log.error(e);
			
			try 
			{
				JSONObject error = new JSONObject();
				error.put("error", "Failed to execute SQL. Error: " + e.getMessage());
				
				return error.toString();
			} 
			catch (JSONException e1) 
			{
				log.error(e1);
			}
		} 
    	catch (JSONException e) 
    	{
    		log.error(e);
			
			try 
			{
				JSONObject error = new JSONObject();
				error.put("error", "Error: " + e.getMessage());
				
				return error.toString();
			} 
			catch (JSONException e1) 
			{
				log.error(e1);
			}
		} 
    	
    	return null;
    }
    
}
