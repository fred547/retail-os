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

public class RePrint 
{
	private static Logger log = Logger.getLogger(RePrint.class);
			
	public static JSONObject print( Timestamp date_printed, int user_id, int terminal_id, String order_id ) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into re_print( uuid, date_printed, user_id, terminal_id, order_id ) values ( ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setTimestamp(2, date_printed);
			pstmt.setInt(3, user_id);
			pstmt.setInt(4, terminal_id);
			pstmt.setString(5, order_id);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_printed", date_printed);
			result.put("user_id", user_id);
			result.put("terminal_id", terminal_id);
			result.put("order_id", order_id);
			
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
			stmt = conn.prepareStatement("select uuid, date_printed, user_id, order_id from re_print where terminal_id = ? and date_printed between ? and ? order by date_printed ");
			
			stmt.setInt(1, terminal_id);
			stmt.setTimestamp(2, date_from);
			stmt.setTimestamp(3, date_to);
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_printed = rs.getTimestamp(2);
				int user_id = rs.getInt(3);				
				String order_id = rs.getString(4);
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("user_id", user_id)
					//.put("terminal_id", terminal_id)
					.put("date_printed", date_printed)
					.put("order_id", order_id)
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
