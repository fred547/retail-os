package org.posterita.model;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;

import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.util.UUIDGenerator;

public class OrderLog {
	
	private static Logger log = Logger.getLogger(OrderLog.class);
	
	public static boolean log( String id, String json, String documentno, String action, Timestamp date_logged, int store_id, int user_id, int terminal_id) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();
			
			pstmt = conn.prepareStatement("insert into order_log( id, value, documentno, action, date_logged, store_id, user_id, terminal_id ) values ( ?, ?, ?, ?, ?, ?, ?, ? )");
			pstmt.setString(1, id);
			pstmt.setString(2, json);
			pstmt.setString(3, documentno);
			pstmt.setString(4, action);			
			pstmt.setTimestamp(5, date_logged);
			pstmt.setInt(6, store_id);
			pstmt.setInt(7, user_id);
			pstmt.setInt(8, terminal_id);
			
			int count = pstmt.executeUpdate();
			
			return count > 0;
			
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
}
