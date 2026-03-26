package org.posterita.model;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Date;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.OrderException;
import org.posterita.exception.OrderSynchronizationException;
import org.posterita.online.OnlineServiceExecutor;

public class Order {

	private static Logger log = Logger.getLogger(Order.class);

	public static String saveOrder(String json) throws OrderException
	{
		// set document no if none
		try 
		{	
			JSONObject order = new JSONObject(json);
			
			order.put("posVersion", Application.POS_BUILT);
			order.put("javaVersion", Application.JAVA_VERSION);
			order.put("javaVendor", Application.JAVA_VENDOR);

			// saving an online order
			// order may not have uuid
			int orderId = order.optInt("orderId", 0);
			
			if(orderId > 0) {
				if(!order.has("uuid")){
					order.put("uuid", order.getString("orderId"));
				}
			}
			
			String uuid = order.getString("uuid");			

			String docAction = order.getString("docAction");			
			String terminalId = order.getString("terminalId");

			// add columns to help query
			int terminal_id = Integer.valueOf(terminalId);
			Timestamp dateOrdered = Timestamp.valueOf(order.getString("dateOrdered"));

			//fix date bug
			if(order.has("backdate")){
				//do nothing
			}
			else if(order.has("timestamp"))
			{
				//validate dateOrdered
				//difference between 2 dates due to javafx javascript date bug
				Date t = new Date(order.getLong("timestamp"));
				SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

				String x = sdf.format(t);

				if( !x.equals(order.getString("dateOrdered"))){

					//correct dateordered
					order.put("dateOrdered", x);
					order.put("dateCorrected", true);
				}    					
			}

			/* need to assign documentno for new orders */
			boolean isNewOrder = true;

			String previousOrder = Database.get("ORDERS", uuid);
			if( previousOrder != null) {
				isNewOrder = false;
				
				//fix missing documentno
				JSONObject previous = new JSONObject(previousOrder);
				order.put("documentNo", previous.getString("documentNo"));
				
				
				
				//perform validation of table_id being overwritten
				//table_id can only be overwritten when switching table
				//see Restaurant.java line 351
				
				JSONObject commandInfo = null;
				int previous_table_id = -1;
				int current_table_id = -1;				
				
				if(previous.has("commandInfo")){					
					commandInfo = previous.getJSONObject("commandInfo");					
					previous_table_id = commandInfo.optInt("tableId", -1);					
				}
				
				if(order.has("commandInfo")){					
					commandInfo = order.getJSONObject("commandInfo");					
					current_table_id = commandInfo.optInt("tableId", -1);	
					
					if(previous_table_id != current_table_id) {
						throw new OrderException(String.format("Cannot overwrite order tableId! Previous: %d -> Current: %d", previous_table_id, current_table_id));
					}
				}
				else
				{
					//PaymentService clears commandInfo
					//fix missing commandInfo
					log.info("Fixing commandInfo");
					order.put("commandInfo", commandInfo);
				}				
				
			}

			/* flag for online processing */				
			boolean processOnline = false;

			//process online only completed orders			
			if("CO".equalsIgnoreCase(docAction)) {

				String tenderType = order.getString("tenderType");

				if("Card".equals(tenderType) 
						|| "Credit".equals(tenderType)
						|| "Voucher".equals(tenderType)
						|| "Loyalty".equals(tenderType)
						|| "Gift Card".equals(tenderType))
				{
					processOnline = true;
				}

				if( !processOnline )
				{
					// loop through lines

					JSONArray lines = order.getJSONArray("lines");
					JSONObject line = null;

					for( int i=0; i<lines.length(); i++ )
					{
						line = lines.getJSONObject(i);

						String productName = line.getString("productName");

						// check for coupon
						if( "Coupon".equals( productName )  

								|| "Issue Gift Card".equals( productName )
								|| "Redeem Gift Card".equals( productName )
								|| "Reload Gift Card".equals( productName )
								|| "Refund Gift Card".equals( productName ) 

								|| "Issue Deposit".equals( productName )
								|| "Redeem Deposit".equals( productName )
								|| "Refund Deposit".equals( productName )

								|| "Redeem Promotion".equals( productName )){

							processOnline = true;
							break;
						}
					}  					

				}
			}


			/* generate document no for new orders and process orders online */

			Connection conn = null;
			Statement stmt = null;
			ResultSet rs = null;

			PreparedStatement pstmt = null;

			try 
			{
				conn = Database.getConnection();
				conn.setAutoCommit(false);

				if(isNewOrder) {	

					//generate new document no
					stmt = conn.createStatement();				

					rs = stmt.executeQuery("select sequence_prefix, sequence_no from terminal where id = '" + terminalId + "' for update");
					if(!rs.next())
					{
						// error 
						throw new OrderException("Data error. Failed to load terminal!");
					}

					String sequence_prefix = rs.getString(1);
					BigDecimal sequence_no = rs.getBigDecimal(2);
					BigDecimal new_sequence_no = sequence_no.add(new BigDecimal(1));

					String mask = "00000000" + new_sequence_no;
					String documentNo = mask.substring(mask.length() - 8);

					if(sequence_prefix != null)
					{
						documentNo = sequence_prefix + documentNo;
					}	

					//update sequence number at the end
					int updated = stmt.executeUpdate("update terminal set sequence_no = " + new_sequence_no + " where id = '" + terminalId + "'");
					Database.close(stmt);
					
					if(updated == 0){
						throw new SQLException("Failed to update document sequence!");
					}

					order.put("documentNo", documentNo);
					order.put("offlineDocumentNo", documentNo);						
				}
				
				String order_sync_status = "DR";


				// process online based on tenderType						
				if(orderId == 0 && processOnline)
				{
					log.info("Processing order #" + order.getString("documentNo") + " online ...");
					
					OnlineServiceExecutor executor = null;

					executor = new OnlineServiceExecutor("/service/v2/Order/checkout");
					
					//command info is overwritten
					JSONObject commandInfo = null;
					
					if(order.has("commandInfo")) {
						commandInfo = order.getJSONObject("commandInfo");
					}

					try 
					{
						json = order.toString();
						json = executor.excecute(json);
						order = new JSONObject(json);
						
						//set command info
						if(commandInfo != null) {
							order.put("commandInfo", commandInfo);
						}
						
						if(order.has("error")) {
							throw new OrderSynchronizationException(order.getString("error"));
						}
						
						order_sync_status = "CO";
					} 
					catch (Exception e) 
					{
						throw e;
					}

					//validate returned json
					if(json.trim().startsWith("{"))
					{
						JSONObject j = new JSONObject(json);
						if(j.has("error"))
						{
							order_sync_status = "ER";
							log.error(j.getString("error"));
						}
					}
				}

				String documentno = order.getString("documentNo");
				String tendertype = order.getString("tenderType");
				String ordertype = order.getString("orderType");
				String docstatus = order.getString("docAction");

				int store_id = order.getInt("orgId");
				int customer_id = order.getInt("bpartnerId");
				int user_id = order.getInt("salesRepId");
				
				final String orderJSON = order.toString();
				
				// save order log
				boolean logged = OrderLog.log(uuid, orderJSON, documentno, isNewOrder ? "INSERT" : "UPDATE", new Timestamp(new Date().getTime()), store_id, user_id, terminal_id);
				if(!logged) {
					throw new OrderException("Failed to save order to order log!");
				}

				if(isNewOrder) {	
					
					log.info("Saving new order #" + documentno);
					
					/* restaurant */
					String COMMANDTYPE = "";
					
					if(order.has("commandInfo")){
						
						JSONObject commandInfo = order.getJSONObject("commandInfo");
						
						COMMANDTYPE = commandInfo.getString("type");
						
					}

					pstmt = conn.prepareStatement("INSERT INTO ORDERS (ID, VALUE, STATUS, TERMINAL_ID, DATE_ORDERED, STORE_ID, CUSTOMER_ID, USER_ID, DOCUMENTNO, DOCSTATUS, TENDERTYPE, ORDERTYPE, COMMANDTYPE) "
							+ " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ");
					
					int count = 0;
					pstmt.setString(++count, uuid);
					pstmt.setString(++count, orderJSON);
					pstmt.setString(++count, order_sync_status);
					pstmt.setInt(++count, terminal_id);
					pstmt.setTimestamp(++count, dateOrdered);

					pstmt.setInt(++count, store_id);
					pstmt.setInt(++count, customer_id);
					pstmt.setInt(++count, user_id);    							
					pstmt.setString(++count, documentno);
					pstmt.setString(++count, docstatus);
					pstmt.setString(++count, tendertype);
					pstmt.setString(++count, ordertype);
					pstmt.setString(++count, COMMANDTYPE);

					pstmt.executeUpdate();

				}
				else
				{
					log.info("Updating old order #" + documentno);
					
					pstmt = conn.prepareStatement("update ORDERS set STATUS = ?, VALUE = ?, DATE_ORDERED = ?, TERMINAL_ID = ?, STORE_ID = ?, CUSTOMER_ID = ?, USER_ID = ?, DOCSTATUS = ?, TENDERTYPE = ? where ID = ?");
					
					int count = 0;
					pstmt.setString(++count, order_sync_status);
					pstmt.setString(++count, orderJSON);
					pstmt.setTimestamp(++count, dateOrdered);
					pstmt.setInt(++count, terminal_id);
					pstmt.setInt(++count, store_id);
					pstmt.setInt(++count, customer_id);
					pstmt.setInt(++count, user_id); 
					pstmt.setString(++count, docstatus);
					pstmt.setString(++count, tendertype);
					pstmt.setString(++count, uuid);

					pstmt.executeUpdate();
				}
				
				return orderJSON;

			} 
			catch (Exception e) 
			{
				log.error(e);
				
				e.printStackTrace();

				if(conn != null){
					try 
					{
						conn.rollback();
					} 
					catch (SQLException e1) 
					{
						throw new OrderException(e1);
					}
				}
				
				throw new OrderException(e);
			}
			finally
			{
				if(conn != null)
				{
					try 
					{
						conn.commit();
					} 
					catch (SQLException e) 
					{
						throw new OrderException(e);
					}
				}

				Database.close(pstmt);
				Database.close(conn, stmt, rs);
			}

		}
		catch (OrderException e1) 
		{
			log.error(e1);

			throw e1;
		}
		catch (Exception e) 
		{
			log.error(e);

			throw new OrderException(e);
		}
	}
	
}
