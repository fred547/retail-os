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

public class CartLog 
{
	private static Logger log = Logger.getLogger(CartLog.class);
	
	public static JSONObject log( Timestamp date_logged, int user_id, int terminal_id, String action, double qty, double amount, String description ) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into cart_log( uuid, date_logged, user_id, terminal_id, action, qty, amount, description ) values ( ?, ?, ?, ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setTimestamp(2, date_logged);
			pstmt.setInt(3, user_id);
			pstmt.setInt(4, terminal_id);
			pstmt.setString(5, action);
			pstmt.setDouble(6, qty);
			pstmt.setDouble(7, amount);
			pstmt.setString(8, description);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_logged", date_logged);
			result.put("user_id", user_id);
			result.put("terminal_id", terminal_id);
			result.put("action", action);
			result.put("qty", qty);
			result.put("amount", amount);
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
	
	public static JSONArray getAll(Timestamp date_from, Timestamp date_to, int terminal_id) throws Exception
	{
		Connection conn = null;
		PreparedStatement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select uuid, date_logged, user_id, action, qty, amount, description from cart_log where terminal_id = ? and date_logged between ? and ? order by date_logged ");
			
			stmt.setInt(1, terminal_id);
			stmt.setTimestamp(2, date_from);
			stmt.setTimestamp(3, date_to);
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_logged = rs.getTimestamp(2);
				int user_id = rs.getInt(3);				
				String action = rs.getString(4);
				double qty = rs.getDouble(5);
				double amount = rs.getDouble(6);
				String description = rs.getString(7);
				
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("user_id", user_id)
					//.put("terminal_id", terminal_id)
					.put("date_logged", date_logged)
					.put("action", action)
					.put("qty", qty)
					.put("amount", amount)
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
