package org.posterita.model;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.util.UUIDGenerator;

public class RestaurantLog {
	
	private static Logger log = Logger.getLogger(RestaurantLog.class);
	
	public static JSONObject log( Timestamp date_logged, int terminal_id, int user_id, String action, String description ) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into restaurant_log( uuid, date_logged, terminal_id, user_id, action, description ) values ( ?, ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setTimestamp(2, date_logged);
			pstmt.setInt(3, terminal_id);
			pstmt.setInt(4, user_id);
			pstmt.setString(5, action);
			pstmt.setString(6, description);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_logged", date_logged);
			result.put("terminal_id", terminal_id);
			result.put("user_id", user_id);
			result.put("action", action);
			result.put("description", description);
			
			return result;
			
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw e;
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
	}
	
	public static JSONArray getAll(Timestamp date_from, Timestamp date_to) throws Exception
	{
		Connection conn = null;
		PreparedStatement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		StringBuffer sql = new StringBuffer("select uuid, date_logged, terminal_id, user_id, action, description from printer_log ");
		
		if(date_from != null && date_to != null) {
			sql.append(" where date_logged between ? and ? ");
		}
		else if(date_from != null) {
			sql.append(" where date_logged >= ? ");
		}
		else if(date_to != null) {
			sql.append(" where date_logged <= ? ");
		}		
		
		sql.append(" order by date_logged desc ");
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select uuid, date_logged, terminal_id, user_id, action, description from printer_log where date_logged between ? and ? order by date_logged desc ");
			
			if(date_from != null && date_to != null) {
				stmt.setTimestamp(1, date_from);
				stmt.setTimestamp(2, date_to);
			}
			else if(date_from != null) {
				stmt.setTimestamp(1, date_from);
			}
			else if(date_to != null) {
				stmt.setTimestamp(1, date_to);
			}			
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_logged = rs.getTimestamp(2);
				int terminal_id = rs.getInt(3);
				int user_id = rs.getInt(4);
				String action = rs.getString(5);
				String description = rs.getString(6);
				
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("date_logged", date_logged)
					.put("terminal_id", terminal_id)
					.put("user_id", user_id)
					.put("action", action)
					.put("description", description)
										
					);
				
			}
			
			return jsonArray;
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw e;
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
	}
	

}
