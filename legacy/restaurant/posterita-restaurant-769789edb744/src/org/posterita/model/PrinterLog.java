package org.posterita.model;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.client.printing.Base64;
import org.posterita.database.Database;
import org.posterita.util.UUIDGenerator;

public class PrinterLog 
{
	private static Logger log = Logger.getLogger(PrinterLog.class);
	
	public static JSONObject log( Timestamp date_logged, String order_type, String printer_name, String receipt, String raw_receipt, String printed ) throws Exception
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into printer_log( uuid, date_logged, order_type, printer_name, receipt, raw_receipt, printed ) values ( ?, ?, ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setTimestamp(2, date_logged);
			pstmt.setString(3, order_type);
			pstmt.setString(4, printer_name);			
			
			//need to decode receipt
			String s = new String(Base64.decode(receipt));			
			pstmt.setString(5, s);
			
			pstmt.setString(6, new String(Base64.decode(raw_receipt)));
			pstmt.setString(7, printed);
			
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_logged", date_logged);
			result.put("order_type", order_type);
			result.put("printer_name", printer_name);
			result.put("receipt", receipt);
			result.put("raw_receipt", raw_receipt);
			result.put("printed", printed);
			
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
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select uuid, date_logged, order_type, printer_name, receipt from printer_log where date_logged between ? and ? order by date_logged ");
			
			stmt.setTimestamp(1, date_from);
			stmt.setTimestamp(2, date_to);
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_logged = rs.getTimestamp(2);
				String order_type = rs.getString(3);
				String printer_name = rs.getString(4);
				String receipt = rs.getString(5);
				
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("order_type", order_type)
					.put("date_logged", date_logged)
					.put("printer_name", printer_name)
					.put("receipt", receipt)
										
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
