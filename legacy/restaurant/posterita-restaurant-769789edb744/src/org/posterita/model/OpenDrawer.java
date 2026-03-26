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

public class OpenDrawer 
{
	private static Logger log = Logger.getLogger(OpenDrawer.class);
	
	public static JSONObject open( Timestamp date_opened, int user_id, int terminal_id, String reason ) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into open_drawer( uuid, date_opened, user_id, terminal_id, reason ) values ( ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setTimestamp(2, date_opened);
			pstmt.setInt(3, user_id);
			pstmt.setInt(4, terminal_id);
			pstmt.setString(5, reason);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_opened", date_opened);
			result.put("user_id", user_id);
			result.put("terminal_id", terminal_id);
			result.put("reason", reason);
			
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
			stmt = conn.prepareStatement("select uuid, date_opened, user_id, reason from open_drawer where terminal_id = ? and date_opened between ? and ? order by date_opened ");
			
			stmt.setInt(1, terminal_id);
			stmt.setTimestamp(2, date_from);
			stmt.setTimestamp(3, date_to);
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_opened = rs.getTimestamp(2);
				int user_id = rs.getInt(3);				
				String reason = rs.getString(4);
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("user_id", user_id)
					//.put("terminal_id", terminal_id)
					.put("date_opened", date_opened)
					.put("reason", reason)
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
