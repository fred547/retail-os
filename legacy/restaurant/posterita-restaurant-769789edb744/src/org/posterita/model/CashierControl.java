package org.posterita.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.database.DatabaseSynchronizer;
import org.posterita.exception.CashierControlSynchronizationException;
import org.posterita.exception.TillException;
import org.posterita.util.UUIDGenerator;

public class CashierControl 
{
	private static Logger log = Logger.getLogger(CashierControl.class);
	
	public static JSONObject save(Timestamp date_logged, int user_id, int terminal_id, BigDecimal cash_amount_entered, BigDecimal externalcard_amount_entered) throws Exception {
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
						
			
			stmt = conn.createStatement();
			rs = stmt.executeQuery("select time_open, opening_amt from close_till where terminal_id = " + terminal_id + " and time_close is null order by time_open desc");
			
			if(!rs.next()){
				throw new TillException("Till is already close!");
			}
			
			Timestamp time_open = rs.getTimestamp(1);
			BigDecimal opening_amt = rs.getBigDecimal(2);
			
			// get current money in terminal			
			JSONObject payments = Till.getCurrentMoneyInTill(terminal_id, time_open);	
			BigDecimal cash = new BigDecimal(payments.getDouble("cash")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal ext_card = new BigDecimal(payments.getDouble("ext_card")).setScale(2, RoundingMode.HALF_UP);
						
						
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into cashier_control( uuid, user_id, terminal_id, date_logged, beginningbalance, cashamount, cashamountentered, externalamount, externalamountentered ) values ( ?, ?, ?, ?, ?, ?, ?, ?, ? )");
			pstmt.setString(1, uuid);
			pstmt.setInt(2, user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setTimestamp(4, date_logged);
			pstmt.setBigDecimal(5, opening_amt);
			pstmt.setBigDecimal(6, cash);
			pstmt.setBigDecimal(7, cash_amount_entered);
			pstmt.setBigDecimal(8, ext_card);
			pstmt.setBigDecimal(9, externalcard_amount_entered);
			
			int count = pstmt.executeUpdate();
			
			JSONObject result = new JSONObject();
			result.put("uuid", uuid);
			result.put("date_logged", date_logged);
			result.put("user_id", user_id);
			result.put("terminal_id", terminal_id);
			result.put("opening_amt", opening_amt);
			result.put("cash_amount_entered", cash_amount_entered);
			result.put("cash_amount", cash);
			result.put("externalcard_amount_entered", externalcard_amount_entered);
			result.put("externalcard_amount", ext_card);
			
			//sync cashier control
			new Thread(new Runnable() {
				
				@Override
				public void run() {
					// TODO Auto-generated method stub
					try 
					{
						DatabaseSynchronizer ds = new DatabaseSynchronizer();
						ds.synchronizeCashierControl(result);
					} 
					catch (CashierControlSynchronizationException e) 
					{
						// TODO Auto-generated catch block
						log.error(e);
					}					
				}
				
			}).start();
			
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
			stmt = conn.prepareStatement("select uuid, date_logged, user_id, beginningbalance, cashamount, cashamountentered, externalamount, externalamountentered from cashier_control where terminal_id = ? and date_logged between ? and ? and synchronized = 'N' order by date_logged ");
			
			stmt.setInt(1, terminal_id);
			stmt.setTimestamp(2, date_from);
			stmt.setTimestamp(3, date_to);
			
			rs = stmt.executeQuery();
			
			while(rs.next())
			{
				String uuid = rs.getString(1);
				Timestamp date_logged = rs.getTimestamp(2);
				int user_id = rs.getInt(3);				
				BigDecimal beginningbalance = rs.getBigDecimal(4);
				BigDecimal cashamount = rs.getBigDecimal(5);
				BigDecimal cashamountentered = rs.getBigDecimal(6);
				BigDecimal externalamount = rs.getBigDecimal(7);
				BigDecimal externalamountentered = rs.getBigDecimal(8);
				
				
				jsonArray.put(new JSONObject()
					//.put("uuid", uuid)
					.put("user_id", user_id)
					//.put("terminal_id", terminal_id)
					.put("date_logged", date_logged)
					.put("beginningbalance", beginningbalance)
					.put("cashamount", cashamount)
					.put("cashamountentered", cashamountentered)
					.put("externalamount", externalamount)
					.put("externalamountentered", externalamountentered)
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
