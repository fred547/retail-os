package org.posterita.model;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.RestaurantException;
import org.posterita.servlet.SystemWebSocket;
import org.posterita.util.UUIDGenerator;

public class Restaurant {
	
	private static Logger log = Logger.getLogger(Restaurant.class);
	
	private static Map<Integer, Object> locks = Collections.synchronizedMap(new HashMap<Integer, Object>());
	private static Map<String, String> tableStatusMap = new HashMap<String, String>();
	
	static {
		
		for(int i=0; i<100; i++) {
			locks.put(i, new Object());
		}
		
		tableStatusMap.put("R", "Reserved");
		tableStatusMap.put("O", "Ordered");
		tableStatusMap.put("B", "Billed");
		tableStatusMap.put("A", "Available");
	}
	
	public static JSONObject getTable(int table_id) throws Exception {
		
		synchronized (locks.get(table_id)) {
			
			String table = Database.get("TABLES", table_id + "");
			
			return new JSONObject(table);
			
		}		
		
	}
	
	public static String getTableStatusName(String status) {
		
		String name = tableStatusMap.get(status.toUpperCase());
		
		return name == null ? status : name;
	}

	public static JSONArray getAvailableTables() throws Exception {
		
		String tables = Database.getAllFrom("TABLES", "status = 'A' and parent_table_id is null");
		
		return new JSONArray(tables);
		
	}
	
	public static void checkIfTableIsLocked(int table_id) throws RestaurantException {
		if(TableLock.isTableLocked(table_id + "")) {
			throw new RestaurantException("Table #" + table_id + " is currently locked!");
		}
	}
	
	public static JSONArray reserveTable(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		checkIfTableIsLocked(table_id);
		
		synchronized (locks.get(table_id)) {
			return _reserveTable(table_id, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static JSONArray _reserveTable(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		//check if table is available
		String status = Database.getSqlValue("select status from tables where table_id = ? ", new Object[]{table_id});
		
		if("AR".indexOf(status) < 0) {
			throw new RestaurantException("Table #" + table_id + " not available for reservation! Status:" + getTableStatusName(status));
		}
		
		if("R".equalsIgnoreCase(status)) {
			sendNotification(identifier);			
			return getAllTables();
		}
		
		String userJSON = Database.get("USERS", "" + ad_user_id);
		JSONObject user = new JSONObject(userJSON);		
		String waiter = user.getString("name");
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);			
			
			//Database.executeUpdate(" update tables set status = 'R', waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ", new Object[]{waiter, table_id});
			
			pstmt = conn.prepareStatement("update tables set status = 'R', waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ?");
			pstmt.setString(1, waiter);
			pstmt.setInt(2, table_id);		
			pstmt.execute();
			pstmt.close();		
			
			/*
			Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
					UUIDGenerator.getId(),
					ad_user_id,
					terminal_id,
					"RESERVE TABLE",
					"Table #" + table_id
			});	*/
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "RESERVE TABLE");
			pstmt.setString(5, "Table #" + table_id);			
			pstmt.execute();
			pstmt.close();		
			
			conn.commit();		
			
			sendNotification(identifier);
			
			return getAllTables();
		} 
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
	}
	
	public static JSONArray cancelReservation(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		checkIfTableIsLocked(table_id);
		
		synchronized (locks.get(table_id)) {
			return _cancelReservation(table_id, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static JSONArray _cancelReservation(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		//check if table is available
		String status = Database.getSqlValue("select status from tables where table_id = ? ", new Object[]{table_id});
		
		if(!"R".equalsIgnoreCase(status)) {
			throw new RestaurantException("Table #" + table_id + " has no reservation!");
		}
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set status = 'A', last_updated = CURRENT_TIMESTAMP, parent_table_id = null, waiter = null  where table_id = ? or parent_table_id = ?");
			pstmt.setInt(1, table_id);
			pstmt.setInt(2, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "CANCEL RESERVATION");
			pstmt.setString(5, "Table #" + table_id);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
		/*
		Database.executeUpdate(" update tables set status = 'A', last_updated = CURRENT_TIMESTAMP, parent_table_id = null, waiter = null  where table_id = ? or parent_table_id = ?", new Object[]{table_id, table_id});
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"CANCEL RESERVATION",
				"Table #" + table_id
		});	 
		 
		sendNotification(identifier);
		
		return getAllTables();
		*/
	}
	
	public static void logSendToKitchen(int table_id, int ad_user_id, int terminal_id) throws Exception {
		
		String userJSON = Database.get("USERS", "" + ad_user_id);
		JSONObject user = new JSONObject(userJSON);		
		String waiter = user.getString("name");
		
		/*
		Database.executeUpdate(" update tables set waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ", new Object[]{waiter, table_id});
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"SEND TO KITCHEN",
				"Table #" + table_id
		});	
		*/
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ");
			pstmt.setString(1, waiter);
			pstmt.setInt(2, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "SEND TO KITCHEN");
			pstmt.setString(5, "Table #" + table_id);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
		
	}
	
	public static void checkoutTable(int table_id, int ad_user_id, int terminal_id) throws Exception {
				
		boolean unLocked = TableLock.forceUnLockTable("" + table_id);
		
		if(!unLocked) {
			
			String userJSON = Database.get("USERS", "" + ad_user_id);
			JSONObject user = new JSONObject(userJSON);		
			String waiter = user.getString("name");
			
			log.info(String.format("Waiter: %s failed to unlock Table #%d after order completed!!", waiter, table_id));
		}
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"CHECKOUT TABLE",
				"Table #" + table_id
		});			
		
		clearTable(table_id, ad_user_id, terminal_id, null);
		
		
	}	
	
	public static JSONArray switchTable(int from_table_id, int to_table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		checkIfTableIsLocked(from_table_id);		
		checkIfTableIsLocked(to_table_id);
		
		synchronized (locks.get(to_table_id)) {
			return _switchTable(from_table_id, to_table_id, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static JSONArray _switchTable(int from_table_id, int to_table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		//check if table is available
		String x = Database.getSqlValue("select status from tables where table_id = ? ", new Object[]{to_table_id});
		
		if(!x.equalsIgnoreCase("A")) {
			throw new RestaurantException("Table #" + to_table_id + " is not available!");
		}
		
		String s = Database.get("TABLES", from_table_id + "");
		JSONObject table = new JSONObject(s);		
		
		String order_id = table.getString("order_id");
		String status = table.getString("status");
		
		String userJSON = Database.get("USERS", "" + ad_user_id);
		JSONObject user = new JSONObject(userJSON);		
		String waiter = user.getString("name");
		
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		conn = Database.getConnection();
		try 
		{
			conn.setAutoCommit(false);		
			
			pstmt = conn.prepareStatement(" update tables set last_updated = CURRENT_TIMESTAMP, order_id = ?, status = ?, waiter = ? where table_id = ?");
			pstmt.setString(1, order_id);
			pstmt.setString(2, status);
			pstmt.setString(3, waiter);
			pstmt.setInt(4, to_table_id);
			pstmt.execute();
			pstmt.close();
			
			//clear from table and its children
			pstmt = conn.prepareStatement(" update tables set last_updated = CURRENT_TIMESTAMP, order_id = null, status = 'A', waiter = null, parent_table_id = null where table_id = ? or parent_table_id = ?");
			pstmt.setInt(1, from_table_id);
			pstmt.setInt(2, from_table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "SWITCH TABLE");
			pstmt.setString(5, "Table #" + from_table_id + " to " + "Table #" + to_table_id);
			pstmt.execute();
			pstmt.close();
			
			String existingOrder = Database.get("ORDERS", order_id);
			if(existingOrder != null) 
			{						
				JSONObject order = new JSONObject(existingOrder);
				
				if(order.has("commandInfo")) 
				{
					JSONObject commandInfo = order.getJSONObject("commandInfo");
					
					commandInfo.put("tableId", to_table_id);
					order.put("commandInfo", commandInfo);
					
					pstmt = conn.prepareStatement("update orders set value = ? where id = ?");
					pstmt.setString(1, order.toString());
					pstmt.setString(2, order_id);
					
					pstmt.execute();
					pstmt.close();
				}			
				
			}
						
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
					
		} 
		catch (Exception e) 
		{
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(conn, pstmt, null);
		}
		
		
	}
	
	public static JSONArray assignOrder(int table_id, String order_uuid, int ad_user_id, int terminal_id, String identifier) throws Exception {	
		synchronized (locks.get(table_id)) {
			return _assignOrder(table_id, order_uuid, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static JSONArray _assignOrder(int table_id, String order_uuid, int ad_user_id, int terminal_id, String identifier) throws Exception {		
		
		String x = Database.getSqlValue("select order_id from tables where table_id = ? ", new Object[]{table_id});
		
		if(order_uuid.equalsIgnoreCase(x)) {
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		
		if(x != null && x.trim().length() > 0) {
			throw new RestaurantException("Table #" + table_id + " already has an order assigned to it!");
		}
		
		String status = Database.getSqlValue("select status from tables where table_id = ? ", new Object[]{table_id});
		if("AR".indexOf(status) == -1) {
			throw new RestaurantException("Orders can be assigned to reserved or available tables only. Table #" + table_id + " has status: " + status +"!");
		}
				
		String existingOrder = Database.get("ORDERS", order_uuid);		
		JSONObject order = new JSONObject(existingOrder);
		
		
		String userJSON = Database.get("USERS", "" + ad_user_id);
		JSONObject user = new JSONObject(userJSON);		
		String waiter = user.getString("name");
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set status = 'O', order_id = ?, waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ");
			pstmt.setString(1, order_uuid);
			pstmt.setString(2, waiter);
			pstmt.setInt(3, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "ASSIGN ORDER");
			pstmt.setString(5, "Order #" + order.getString("documentNo") + ", Table #" + table_id);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
		/*
		Database.executeUpdate(" update tables set status = 'O', order_id = ?, waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ", new Object[]{ order_uuid, waiter, table_id});
			
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"ASSIGN ORDER",
				"Order #" + order.getString("documentNo") + ", Table #" + table_id
		});
		*/		
		
	}
	
	public static JSONArray mergeTables(int table_id, String tableIdsToMerge, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		checkIfTableIsLocked(table_id);
		
		for(String s :tableIdsToMerge.split(",")) {
			checkIfTableIsLocked(Integer.valueOf(s));
		}
		
		synchronized (locks.get(table_id)) {
			return _mergeTables(table_id, tableIdsToMerge, ad_user_id, terminal_id, identifier);
		}
	}
	public static JSONArray _mergeTables(int table_id, String tableIdsToMerge, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		//validate tables that are to be merged
		int count = Database.getSqlValueAsInt("select count(1) from tables where status = 'A' and table_id in ("+ tableIdsToMerge +")", null);
		if(tableIdsToMerge.split(",").length != count) {
			throw new RestaurantException("Tables [" + tableIdsToMerge + "] may not be available!");
		}
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set status = 'R', last_updated = CURRENT_TIMESTAMP where table_id = ? and status = 'A' ");
			pstmt.setInt(1, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" update tables set status = 'R', last_updated = CURRENT_TIMESTAMP, parent_table_id = ? where table_id in (" + tableIdsToMerge + ")");
			pstmt.setInt(1, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "MERGE TABLES");
			pstmt.setString(5, "Table #" + table_id + " merged with Tables " + "#" + tableIdsToMerge);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
		/*
		Database.executeUpdate(" update tables set status = 'R', last_updated = CURRENT_TIMESTAMP where table_id = ? and status = 'A' ", new Object[]{table_id});
		Database.executeUpdate(" update tables set status = 'R', last_updated = CURRENT_TIMESTAMP, parent_table_id = ? where table_id in (" + tableIdsToMerge + ")", new Object[]{table_id});
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"MERGE TABLES",
				"Table #" + table_id + " merged with Tables " + "#" + tableIdsToMerge
		});
		*/
		
	}
	
	public static JSONArray getAllTables() throws Exception {
		
		return new JSONArray(Database.getAllFrom("TABLES"));
		
	}

	public static JSONArray clearTable(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		synchronized (locks.get(table_id)) {
			return _clearTable(table_id, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static JSONArray _clearTable(int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		TableLock.forceUnLockTable("" + table_id);
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set status = 'A', order_id = null, parent_table_id = null, waiter = null, last_updated = CURRENT_TIMESTAMP where table_id = ? or parent_table_id = ? ");
			pstmt.setInt(1, table_id);
			pstmt.setInt(2, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "CLEAR TABLE");
			pstmt.setString(5, "Table #" + table_id);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
		/*
		Database.executeUpdate(" update tables set status = 'A', order_id = null, parent_table_id = null, waiter = null, last_updated = CURRENT_TIMESTAMP where table_id = ? or parent_table_id = ? ", new Object[]{table_id, table_id});
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"CLEAR TABLE",
				"Table #" + table_id
		});
		*/	
		
	}

	public static JSONArray updateTableStatus(int table_id, String status, int ad_user_id, int terminal_id, String identifier) throws Exception {
		synchronized (locks.get(table_id)) {
			return _updateTableStatus(table_id, status, ad_user_id, terminal_id, identifier);
		}		
	}
	
	private static JSONArray _updateTableStatus(int table_id, String status, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		String previousStatus = Database.getSqlValue("select status from tables where table_id = ?", new Object[] {table_id});
		
		if(previousStatus.equalsIgnoreCase(status)) {
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		
		String userJSON = Database.get("USERS", "" + ad_user_id);
		JSONObject user = new JSONObject(userJSON);		
		String waiter = user.getString("name");
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			pstmt = conn.prepareStatement(" update tables set status = ?, waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ");
			pstmt.setString(1, status);
			pstmt.setString(2, waiter);
			pstmt.setInt(3, table_id);
			pstmt.execute();
			pstmt.close();
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "UPDATE TABLE STATUS");
			pstmt.setString(5, "Table #" + table_id + " Status: " + getTableStatusName(previousStatus) + " to " + getTableStatusName(status));
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return getAllTables();
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}		
		
		/*
		Database.executeUpdate(" update tables set status = ?, waiter = ?, last_updated = CURRENT_TIMESTAMP where table_id = ? ", new Object[]{status, waiter, table_id});
		
		Database.executeUpdate(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ", new Object[]{
				UUIDGenerator.getId(),
				ad_user_id,
				terminal_id,
				"UPDATE TABLE STATUS",
				"Table #" + table_id + " Status: " + previousStatus + " to " + status
		});
		
		sendNotification(identifier);
		
		return getAllTables();
		*/
	}
	
	public static int getTakeAwayNo() {
		return getSequenceNo("TAKE-AWAY");
	}
	
	public static int getDineInNo() {
		return getSequenceNo("DINE-IN");
	}
	
	public static synchronized int getSequenceNo( String sequence_name) {
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		int current_seq_no = -1;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);
			
			stmt = conn.createStatement();
			
			stmt.execute("update sequence set last_updated = CURRENT_TIMESTAMP, sequence_no = sequence_no + 1 where name = '" + sequence_name + "'");				
			
			rs = stmt.executeQuery("select sequence_no from sequence where name = '" + sequence_name + "'");
			
			if(rs.next()) {
				current_seq_no = rs.getInt(1);				
			}
			
			conn.commit();
		} 
		catch (Exception e) {
			try {
				conn.rollback();
			} catch (SQLException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
		
		return current_seq_no;
	}

	public static String voidOrder(String order_id, int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		synchronized (locks.get(table_id)) {
			return _voidOrder(order_id, table_id, ad_user_id, terminal_id, identifier);
		}
	}
	
	private static String _voidOrder(String order_id, int table_id, int ad_user_id, int terminal_id, String identifier) throws Exception {
		
		boolean cleanTables = false;
		
		//perform some validations
		//is table still linked to order
		String assignedOrderId = Database.getSqlValue("select order_id from tables where table_id = ?", new Object[] {table_id});
		if(order_id.equals(assignedOrderId)) {
			//need to clean table
			cleanTables = true;
		}
		
		String documentNo = Database.getSqlValue("select DOCUMENTNO from orders where id = ?", new Object[] {order_id});
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = Database.getConnection();
			conn.setAutoCommit(false);	
			
			if(cleanTables) {
				
				pstmt = conn.prepareStatement(" update tables set status = 'A', order_id = null, parent_table_id = null, waiter = null, last_updated = CURRENT_TIMESTAMP where order_id = ? ");
				pstmt.setString(1, order_id);
				pstmt.execute();
				pstmt.close();
			}
			
			
			pstmt = conn.prepareStatement(" insert into RESTAURANT_LOG(date_logged, uuid, user_id, terminal_id, action, description) values(CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) ");
			pstmt.setString(1, UUIDGenerator.getId());
			pstmt.setInt(2, ad_user_id);
			pstmt.setInt(3, terminal_id);
			pstmt.setString(4, "VOID ORDER");
			pstmt.setString(5, "Order #" + documentNo + ", Table #" + table_id);
			pstmt.execute();
			pstmt.close();
			
			conn.commit();
			
			sendNotification(identifier);
			
			return "{\"success\":true}";
		}
		catch (Exception e) {
			conn.rollback();
			throw e;
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
		
	}
	
	public static String getTakeAways() throws DatabaseException {
		
		String s  = Database.getAllFrom("ORDERS", "commandtype='T' order by date_ordered desc");
		
		return s;
	}
	
	public static void sendNotification(String identifier)
	{
		if(identifier == null) return;
		
		SystemWebSocket.broadcastMessage("{\"identifier\":\"" + identifier + "\"}");
	}
	

}
