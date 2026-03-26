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
import org.posterita.exception.ClockInOutException;
import org.posterita.util.UUIDGenerator;

public class ClockInOut 
{
	private static Logger log = Logger.getLogger(ClockInOut.class);
	
	/**
	 * Clock in user
	 * @param terminalId
	 * @param userId
	 * @param timeIn
	 * @return
	 * @throws ClockInOutException
	 */
	public static JSONObject clockIn(int terminalId, int userId, Timestamp timeIn) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();
			
			// get last record for user
			stmt = conn.createStatement();
			rs = stmt.executeQuery("select uuid, time_in, time_out from clock_in_out where time_out is null and user_id = " + userId + " and terminal_id = " + terminalId + " order by time_in desc");
			
			if(rs.next()){
				// check clock out time
				if(rs.getTimestamp(3) == null){
					// User has not clocked out
					JSONObject result = new JSONObject();
					result.put("uuid", rs.getString(1));
					result.put("terminalId", terminalId);
					result.put("userId", userId);
					result.put("time_in", rs.getString(2));
					
					String time_out = null;
					result.put("time_out", time_out);
					
					return result;
				}
			}
			
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into clock_in_out(user_id, terminal_id, time_in, uuid) values ( ?, ?, ?, ?)");
			pstmt.setInt(1, userId);
			pstmt.setInt(2, terminalId);
			pstmt.setTimestamp(3, timeIn);
			pstmt.setString(4, uuid);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("terminalId", terminalId);
			result.put("userId", userId);
			result.put("time_in", timeIn);
			
			String time_out = null;
			result.put("time_out", time_out);
			
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
	
	/**
	 * Clock out user
	 * @param terminalId
	 * @param userId
	 * @param timeOut
	 * @return
	 * @throws ClockInOutException
	 */
	public static JSONObject clockOut(int terminalId, int userId, Timestamp timeOut) throws Exception
	{		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			
			// get last record for user
			stmt = conn.createStatement();
			rs = stmt.executeQuery("select uuid, time_in, time_out from clock_in_out where time_out is null and user_id = " + userId + " and terminal_id = " + terminalId + " order by time_in desc");
			
			if(!rs.next()){
				// cannot clockout if not clockedIn
				throw new ClockInOutException("User has not clocked in!");
			}
			
			// user already clocked out
			if(rs.getTimestamp(3) != null){
				// User has already clocked out
				JSONObject result = new JSONObject();
				result.put("uuid", rs.getString(1));
				result.put("terminalId", terminalId);
				result.put("userId", userId);
				result.put("time_in", rs.getTimestamp(2));
				result.put("time_out", rs.getTimestamp(3));
				
				return result;
			}
			
			String uuid = rs.getString(1);
			Timestamp timeIn = rs.getTimestamp(2);
			
			pstmt = conn.prepareStatement("update clock_in_out set time_out = ?, synchronized = 'N' where uuid = ?"); // resynchronized record
			pstmt.setTimestamp(1, timeOut);
			pstmt.setString(2, uuid);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("terminalId", terminalId);
			result.put("userId", userId);
			result.put("time_in", timeIn);
			result.put("time_out", timeOut);
			
			return result;
			
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw e;
		}
		finally
		{
			Database.close(conn, stmt, rs);
			Database.close(pstmt);
		}
	}
	
	/**
	 * Get clocked in users
	 * @param terminalId
	 * @return
	 * @throws ClockInOutException
	 */
	public static JSONArray getClockedInUsers(int terminalId) throws Exception
	{
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery("select uuid, user_id, time_in from clock_in_out where terminal_id = " + terminalId + " and time_out is null order by time_in");
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				int user_id = rs.getInt(2);
				Timestamp time_in = rs.getTimestamp(3);
				
				jsonArray.put(new JSONObject()
					.put("uuid", uuid)
					.put("user_id", user_id)
					.put("time_in", time_in)
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
	
	/**
	 * Clock out all user for the given terminal
	 * @param terminalId
	 * @param timeOut
	 * @return
	 * @throws Exception
	 */
	public static JSONArray clockOutAll(int terminalId, Timestamp timeOut) throws Exception
	{
		JSONArray clockedInUsers = getClockedInUsers(terminalId);
		JSONArray clockedOutUsers = new JSONArray();
		
		JSONObject clockedInUser = null;
		JSONObject clockedOutUser = null;
		
		int userId = -1;
		
		for(int i=0; i<clockedInUsers.length(); i++)
		{
			clockedInUser = clockedInUsers.getJSONObject(i);
			userId = clockedInUser.getInt("user_id");
			
			clockedOutUser = clockOut(terminalId, userId, timeOut);
			clockedOutUsers.put(clockedOutUser);
		}
		
		return clockedOutUsers;
	}

}
