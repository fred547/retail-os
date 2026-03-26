package org.posterita.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.TillException;
import org.posterita.util.SendInBlueBuilder;
import org.posterita.util.UUIDGenerator;

public class Till 
{
	private static Logger log = Logger.getLogger(Till.class);
	
	public static boolean isOpen(int terminalId) throws TillException
	{	
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery("select uuid from close_till where terminal_id = " + terminalId + " and time_close is null order by time_open desc");
			
			if(rs.next())
			{
				return true;
			}			
			
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException("Failed to query till status!");
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
		
		return false;
	}
	
	public static boolean isClose(int terminalId) throws TillException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();			
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery("select time_close from close_till where terminal_id = " + terminalId + " order by time_open desc");
			
			if(rs.next())
			{
				BigDecimal time_close = rs.getBigDecimal(1);
				
				if(time_close != null)
				{
					// has been closed
					return true;
				}
			}
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException("Failed to query till status!");
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
		
		return false;
	}
	
	public static JSONObject open(int terminalId, int userId, BigDecimal floatAmt, Timestamp time) throws TillException
	{
		if(isOpen(terminalId))
		{
			throw new TillException("Till is already open!");
		}
		
		Connection conn = null;
		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = Database.getConnection();
			
			// open it
			String uuid = UUIDGenerator.getId();
			
			pstmt = conn.prepareStatement("insert into close_till(uuid, terminal_id, open_user_id, time_open, opening_amt) values (?, ?, ?, ?, ?) ");
			
			pstmt.setString(1, uuid);
			pstmt.setInt(2, terminalId);
			pstmt.setInt(3, userId);
			pstmt.setTimestamp(4, time);
			pstmt.setBigDecimal(5, floatAmt);
			
			pstmt.executeUpdate();
			
			JSONObject json = new JSONObject();
			json.put("uuid", uuid);
			json.put("terminal_id", terminalId);
			json.put("open_user_id", userId);
			json.put("time_open", time);
			json.put("opening_amt", floatAmt);			
			
			return json;
			
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException(e);
		}
		finally
		{
			Database.close(conn, pstmt, rs);
		}	
		
	}
	
	public static JSONObject close(int terminalId, int userId, BigDecimal closingAmt, BigDecimal extCardAmount, Timestamp time, boolean syncDraftAndOpenOrders) throws TillException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		try 
		{		
			conn = Database.getConnection();
			
			stmt = conn.createStatement();
			rs = stmt.executeQuery("select uuid, open_user_id, time_open, opening_amt from close_till where terminal_id = " + terminalId + " and time_close is null order by time_open desc");
			
			if(!rs.next()){
				throw new TillException("Till is already close!");
			}
			
			String uuid = rs.getString(1);
			int open_user_id = rs.getInt(2);
			Timestamp time_open = rs.getTimestamp(3);
			BigDecimal opening_amt = rs.getBigDecimal(4);
			
			Database.close(rs);
			Database.close(stmt);
			
			// get current money in terminal			
			JSONObject payments = getCurrentMoneyInTill(terminalId, time_open);	
			
			JSONObject timeClose = getLastTimeCloseTill(terminalId);
			
			Timestamp last_time_close_till =  null;
			
			if( timeClose.has("time_close") ){
				last_time_close_till = (Timestamp) timeClose.get("time_close");
			}
			else
			{
				last_time_close_till = time_open;
			}
			
			// get logs
			JSONArray openDrawerLogs = OpenDrawer.getAll(last_time_close_till, time, terminalId);/*time_open*/
			JSONArray rePrintLogs = RePrint.getAll(time_open, time, terminalId);
			JSONArray cartLogs = CartLog.getAll(time_open, time, terminalId);
			JSONArray cashierControls = CashierControl.getAll(time_open, time, terminalId);
			
			//bug fix enjoy 
			Configuration config = Configuration.get(true);
			if( config.getMerchantKey().equals("10004778")){
				rePrintLogs = new JSONArray();
			}
			
			BigDecimal cash = new BigDecimal(payments.getDouble("cash")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal card = new BigDecimal(payments.getDouble("card")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal cheque = new BigDecimal(payments.getDouble("cheque")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal gift = new BigDecimal(payments.getDouble("gift")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal voucher = new BigDecimal(payments.getDouble("voucher")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal ext_card = new BigDecimal(payments.getDouble("ext_card")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal loyalty = new BigDecimal(payments.getDouble("loyalty")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal coupon = new BigDecimal(payments.getDouble("coupon")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal deposit = new BigDecimal(payments.getDouble("deposit")).setScale(2, RoundingMode.HALF_UP);
			
			/* mobile payments */
			BigDecimal mcb_juice = new BigDecimal(payments.getDouble("mcbJuice")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal myt_money = new BigDecimal(payments.getDouble("mytMoney")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal emtel_money = new BigDecimal(payments.getDouble("emtelMoney")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal gifts_mu = new BigDecimal(payments.getDouble("giftsMu")).setScale(2, RoundingMode.HALF_UP);
			BigDecimal mips = new BigDecimal(payments.getDouble("mips")).setScale(2, RoundingMode.HALF_UP);
			
			//validate closing amount == cash + opening amount			
			
			JSONObject json = payments;	
			
			json.put("uuid", uuid);
			json.put("terminal_id", terminalId);
			json.put("open_user_id", open_user_id);
			json.put("time_open", time_open);
			json.put("opening_amt", opening_amt);
			
			json.put("close_user_id", userId);
			json.put("time_close", time);
			json.put("closing_amt", closingAmt);
			
			json.put("openDrawers", openDrawerLogs);
			json.put("rePrints", rePrintLogs);
			json.put("cartLogs", cartLogs);			
			json.put("cashierControls", cashierControls);
			json.put("ext_card_amount_entered", extCardAmount);
			
			/* get draft and open orders */
			JSONArray draftOrders = json.getJSONArray("draftOrders");
			JSONArray openOrders = json.getJSONArray("openOrders");
			
			//mark draft and open orders for synchronization
			if( syncDraftAndOpenOrders ) {
				
				String ids = "'0'";
				
				for(int i=0; i< draftOrders.length(); i++) {
					ids += ",'" + draftOrders.getString(i) + "'";
				}
				
				for(int i=0; i< openOrders.length(); i++) {
					ids += ",'" + openOrders.getString(i) + "'";
				}
				
				String s = Database.getAllFrom("ORDERS", " id in (" + ids + ")");
				
				JSONArray orders = new JSONArray(s);
				
				JSONObject order;
				
				for(int i=0; i< orders.length(); i++) {
					
					order = orders.getJSONObject(i);
					
					order.put("pushDraftAndOpenOrders", true);
					
					Database.put("ORDERS", order.toString(), "uuid");
				}
				
			}
			
			int draftOrderCount = draftOrders.length();
			int openOrderCount = openOrders.length();
			
			//send an email if open or draft orders
			if((draftOrderCount + openOrderCount) > 0) {
				
				StringBuffer sb = new StringBuffer();					
				
				String order_uuid;
				
				if(draftOrderCount > 0) {
					sb.append("<h1>Draft Orders - ").append(draftOrderCount).append(" </h1>");
				}
				
				for(int i=0; i<draftOrderCount; i++) {
					
					order_uuid = draftOrders.getString(i);					
					sb.append(_getOrderInfo(order_uuid));
				}
				
				if(openOrderCount > 0) {
					sb.append("<h1>Open Orders - ").append(openOrderCount).append(" </h1>");
				}
				
				for(int i=0; i<openOrderCount; i++) {
					
					order_uuid = openOrders.getString(i);
					sb.append(_getOrderInfo(order_uuid));
				}
				
				
				JSONObject terminal = new JSONObject(Database.get("TERMINAL", "" + terminalId));
				
				if(config.getServerAddress().equalsIgnoreCase("https://my.posterita.com")) {
					
					//send email
					final String API_KEY = "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";
					
					SendInBlueBuilder.getInstance()
			        .apiKey(API_KEY)
			        .subject(terminal.getString("ad_org_name") + " - Draft/Open Orders")
			        .sender("no-reply@posterita.com", "no-reply")
			        .to("indranee.ramneehorah@tamak.com")
			        .to("accounts2@tamak.com")
			        .to("yan@tamakgroup.com")
			        .to("operation2@tamakgroup.com")
			        .to("accounts3@tamak.com")
			        .to("taslim@posterita.com")
			        .htmlContent(sb.toString())
			        .build().sendTransactionalEmail();
					
				}
				else
				{
					//send email
					final String API_KEY = "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";
					
					SendInBlueBuilder.getInstance()
			        .apiKey(API_KEY)
			        .subject(terminal.getString("ad_org_name") + " - Draft/Open Orders")
			        .sender("no-reply@posterita.com", "no-reply")
			        .to("support@posterita.com", "support")
			        .htmlContent(sb.toString())
			        .build().sendTransactionalEmail();
				}
				
				
			}
			
						
			pstmt = conn.prepareStatement("update close_till set close_user_id = ?  ,time_close = ?  , closing_amt = ?  , cash = ?  , "
					+ "card = ?  , cheque = ?  , gift = ?  , voucher = ?  , ext_card = ?  , loyalty = ?, coupon = ?, deposit = ?, "
					+ " mcbJuice = ?, mytMoney = ?, emtelMoney = ?, giftsMu = ?, mips = ?, "
					+ "json = ?  where uuid = ?");
			
			pstmt.setInt(1, userId);
			pstmt.setTimestamp(2, time);
			pstmt.setBigDecimal(3, closingAmt);
			
			pstmt.setBigDecimal(4, cash);
			pstmt.setBigDecimal(5, card);
			pstmt.setBigDecimal(6, cheque);
			pstmt.setBigDecimal(7, gift);
			pstmt.setBigDecimal(8, voucher);
			pstmt.setBigDecimal(9, ext_card);
			pstmt.setBigDecimal(10, loyalty);
			pstmt.setBigDecimal(11, coupon);
			pstmt.setBigDecimal(12, deposit);
			
			/* mobile payments */
			pstmt.setBigDecimal(13, mcb_juice);
			pstmt.setBigDecimal(14, myt_money);
			pstmt.setBigDecimal(15, emtel_money);
			pstmt.setBigDecimal(16, gifts_mu);
			pstmt.setBigDecimal(17, mips);
			
			pstmt.setString(18, json.toString()); // save a copy of receipt in json format		
			pstmt.setString(19, uuid);			
			
			pstmt.executeUpdate();		
						
			return json;
			
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException(e);
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}	
	}
	
	private static String _getOrderInfo(String order_uuid) throws Exception {
		
		StringBuffer sb = new StringBuffer();		
		
		JSONObject order, commandInfo;
		String command_type, salesRep, documentNo, dateOrdered;
		double order_total;
		
		order = new JSONObject(Database.get("ORDERS", order_uuid));
		
		documentNo = order.getString("documentNo");
		dateOrdered = order.getString("dateOrdered");
		salesRep = order.getString("salesRep");
		order_total = order.getDouble("grandTotal");
		commandInfo = order.getJSONObject("commandInfo");
		command_type = commandInfo.getString("type");
		
		
		if("D".equalsIgnoreCase(command_type)) {
			
			sb.append("<div>").append("Table #").append(commandInfo.getString("tableId")).append("</div>");
		}
		else 
		{
			sb.append("<div>Take-Away #").append(commandInfo.get("takeAwayId")).append("</div>");
		}
		
		sb.append("<div>Sales Rep: ").append(salesRep).append("</div>");
		sb.append("<div>Order #").append(documentNo).append("</div>");
		sb.append("<div>Date: ").append(dateOrdered).append("</div>");
		sb.append("<div>Total: ").append(order_total).append("</div>");
		sb.append("<br>");
		
		return sb.toString();
		
	}
	
	public static JSONObject getCurrentMoneyInTill(int terminal_id, Timestamp time_open) throws TillException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		BigDecimal cash = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal card = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal cheque = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal gift = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal voucher = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal ext_card = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal loyalty = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal coupon = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal deposit = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		
		/* mobile payments */
		BigDecimal mcbJuice = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal mytMoney = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal emtelMoney = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal giftsMu = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal mips = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		
		BigDecimal grandTotal = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal taxTotal = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		BigDecimal discountTotal = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		
		BigDecimal userDiscountTotal = new BigDecimal(0).setScale(2, RoundingMode.HALF_UP);
		
		int noOfOrders = 0;
		int noOfReturns = 0;
		
		int qtySold = 0;
		int qtyReturned = 0;
		
		int qtyServicesSold = 0;
		int qtyServicesReturned = 0;
		
		JSONArray splitSalesReps = null;
		JSONObject splitSalesRep = null;
		
		BigDecimal salesRepSalesTotal = null;
		
		HashMap<Double, JSONObject> discountCodeMap = new HashMap<Double, JSONObject>();		
		TreeMap<String, BigDecimal> employeeSalesMap = new TreeMap<String, BigDecimal>();		
		HashMap<Integer, JSONObject> taxMap = new HashMap<Integer, JSONObject>();
		
		TreeMap<String, BigDecimal> tenderTypeMap = new TreeMap<String, BigDecimal>();
		
		BigDecimal orderTotal;
		
		try 
		{
			conn = Database.getConnection();
			
			pstmt = conn.prepareStatement("select value from orders where terminal_id = ? and date_ordered >= ? ");
			pstmt.setInt(1, terminal_id);
			pstmt.setTimestamp(2, time_open);
			
			rs = pstmt.executeQuery();			
			
			while(rs.next())
			{				
				String json = rs.getString(1);
				JSONObject order = new JSONObject(json);
				
				String docStatus = order.getString("docAction");
								
				if(!"CO".equalsIgnoreCase(docStatus) )
				{
					continue;
				}
				
				double negate = -1;				
				
				String orderType = order.getString("orderType");
				if("POS Order".endsWith(orderType))
				{
					negate = 1;
					noOfOrders ++;
				}
				else
				{
					noOfReturns ++;
				}
				
				
				
				double amt = 0;
				double userDiscount = 0;
				int qty = 0;
				
				
				amt = order.getDouble("taxTotal") * negate;
				taxTotal = taxTotal.add(new BigDecimal(amt).setScale(2, RoundingMode.HALF_UP));
				
				amt = order.getDouble("grandTotal") * negate;
				
				orderTotal = new BigDecimal(amt).setScale(2, RoundingMode.HALF_UP);
				grandTotal = grandTotal.add(orderTotal);
				
				//employee sales
				splitSalesReps = order.getJSONArray("splitSalesReps"); //order.splitSalesReps
				
				String splitSalesRepName = null;
				Double splitSalesAmount = 0.0d;
				
				for(int i = 0; i < splitSalesReps.length(); i++) 
				{
					splitSalesRep = splitSalesReps.getJSONObject(i);
					
					splitSalesRepName = splitSalesRep.getString("name");
					splitSalesAmount = splitSalesRep.getDouble("amount") * negate;
					
					if(employeeSalesMap.containsKey(splitSalesRepName))
					{
						salesRepSalesTotal = employeeSalesMap.get(splitSalesRepName);
						
					}
					else
					{
						salesRepSalesTotal = new BigDecimal(0);
					}
					
					salesRepSalesTotal = salesRepSalesTotal.add( new BigDecimal( splitSalesAmount ) );
					employeeSalesMap.put(splitSalesRepName, salesRepSalesTotal);	
				}
				
				
				String tenderType = order.getString("tenderType");
				/*
				if("Credit".equalsIgnoreCase(tenderType))
				{
					continue;
				}
				*/	
								
				JSONArray lines = order.getJSONArray("lines");
				JSONObject line = null;				
				
				JSONObject discountCodeMapEntry;
				
				boolean isService = false;
				
				double priceEntered = 0.0;
				
				JSONObject taxEntry;
				int taxId;
				BigDecimal taxAmt, lineNetAmt, taxBaseAmt;
				
				String s = Database.get("TERMINAL", Integer.toString(terminal_id));
				JSONObject terminal = new JSONObject(s);
				
				boolean priceListIncludesTax = "Y".equals(terminal.getString("istaxincluded"));
				
				boolean isTaxIncluded = order.optBoolean("isTaxIncluded", priceListIncludesTax); //fallback take from "terminal.istaxincluded"
											
				for(int i=0; i<lines.length(); i++)
				{
					line = lines.getJSONObject(i);
					
					//----------------------------------------										
					taxId = line.getInt("taxId");
					taxAmt = new BigDecimal(line.optDouble("taxAmt", 0) * negate).setScale(2, RoundingMode.HALF_UP);
					lineNetAmt = new BigDecimal(line.optDouble("lineNetAmt", 0) * negate).setScale(2, RoundingMode.HALF_UP);
					
					taxBaseAmt = lineNetAmt;
					
					if(!isTaxIncluded) {
						lineNetAmt = lineNetAmt.add(taxAmt);						
					}
					
					if(!taxMap.containsKey(taxId)) 
					{
						taxEntry = new JSONObject().put("taxId", taxId).put("taxAmt", taxAmt).put("lineNetAmt", lineNetAmt).put("taxBaseAmt", taxBaseAmt);
						taxMap.put(taxId, taxEntry);
					}
					else
					{
						taxEntry = taxMap.get(taxId);
						taxEntry.put("taxAmt", new BigDecimal(taxEntry.getDouble("taxAmt")).add(taxAmt).setScale(2, RoundingMode.HALF_UP));
						taxEntry.put("lineNetAmt", new BigDecimal(taxEntry.getDouble("lineNetAmt")).add(lineNetAmt).setScale(2, RoundingMode.HALF_UP));
						taxEntry.put("taxBaseAmt", new BigDecimal(taxEntry.getDouble("taxBaseAmt")).add(taxBaseAmt).setScale(2, RoundingMode.HALF_UP));
					}
					//----------------------------------------
					
					String description = null;
					
					description = line.optString("description", "");
					priceEntered = line.getDouble("priceEntered");
					
					if(description.startsWith("Redeem Gift Card - ")) 
					{
						gift = gift.add(new BigDecimal(priceEntered).setScale(2, RoundingMode.HALF_UP).negate());
						continue;
					}
					else if(description.startsWith("Coupon - ")) {
						
						coupon = coupon.add(new BigDecimal(priceEntered).setScale(2, RoundingMode.HALF_UP));
						continue;
					}
					else if(description.startsWith("Issue Gift Card - ") || description.startsWith("Reload Gift Card - ")) {
						continue;
					}
					else if(description.startsWith("Issue Deposit")) {
						continue;
					}
					else if(line.getString("productName").equalsIgnoreCase("Redeem Promotion")) {
						continue;
					}
					else if(description.startsWith("Redeem Deposit - ")) {
						
						deposit = deposit.add(new BigDecimal(priceEntered).setScale(2, RoundingMode.HALF_UP).negate());
						continue;
					}
					
					amt = line.getDouble("discountAmt") * negate;
					discountTotal = discountTotal.add(new BigDecimal(amt).setScale(2, RoundingMode.HALF_UP));
					
					// qty sold & returned
					qty = line.getInt("qtyEntered");
					
					isService = false;
							
					if(line.has("producttype")){
						
						if( "S".equalsIgnoreCase( line.getString("producttype") )){
							isService = true;
						}
						
					}
					
					if( line.has("u_pos_discountcode_id") && line.getDouble("u_pos_discountcode_id") > 0 )
					{
						//do nothing
						double discountAmt = line.getDouble("discountAmt");
						
						discountCodeMapEntry = discountCodeMap.get(line.getDouble("u_pos_discountcode_id"));
						
						if( discountCodeMapEntry == null ) 
						{
							discountCodeMapEntry = new JSONObject();	
							discountCodeMapEntry.put("qty", 1);
							discountCodeMapEntry.put("amt", discountAmt);
							discountCodeMapEntry.put("u_pos_discountcode_id", line.getDouble("u_pos_discountcode_id"));
							
						}
						else
						{
							discountCodeMapEntry.put("qty", discountCodeMapEntry.getInt("qty") + 1 );
							discountCodeMapEntry.put("amt", discountCodeMapEntry.getDouble("amt") + discountAmt );
						}
						
						discountCodeMap.put(line.getDouble("u_pos_discountcode_id"), discountCodeMapEntry);
					}
					else
					{
						if( "POS Order".equalsIgnoreCase(orderType) && line.has("priceStd")								
								&& line.getDouble("priceStd") != line.getDouble("priceEntered") ){
							
							userDiscount = ( line.getDouble("priceStd") - line.getDouble("priceEntered") ) * qty;	
							userDiscountTotal = userDiscountTotal.add(new BigDecimal(userDiscount).setScale(2, RoundingMode.HALF_UP));
							
							System.out.println(order.getString("documentno") + " " +  line.optString("description", "xxxx") + " ==> " + line.getDouble("priceStd") + " -> " + line.getDouble("priceEntered"));
						}
					}					
					
					
					if(negate == 1)
					{						
						if(qty > 0)
						{
							qtySold = qtySold + qty;
							
							if(isService)
							{
								qtyServicesSold = qtyServicesSold + qty;
							}
						}
						else
						{
							qtyReturned = qtyReturned + (qty * -1);
							
							if(isService)
							{
								qtyServicesReturned = qtyServicesReturned + (qty * -1);
							}
						}						
					}
					else
					{
						if(qty > 0)
						{
							qtyReturned = qtyReturned + qty;
							
							if(isService)
							{
								qtyServicesReturned = qtyServicesReturned + qty;
							}
						}
						else
						{
							qtySold = qtySold + (qty * -1);
							
							if(isService)
							{
								qtyServicesSold = qtyServicesSold + (qty * -1);
							}
						}
					}	
					
					
				}//for
				
				
				JSONArray payments = order.getJSONArray("payments");
				
				for(int i=0; i<payments.length(); i++)
				{
					try 
					{
						JSONObject payment = payments.getJSONObject(i);
						tenderType = payment.getString("tenderType");
						
						if("Cash".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							cash = cash.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Card".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							card = card.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Cheque".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							cheque = cheque.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Gift Card".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							gift = gift.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Voucher".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							voucher = voucher.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);							
							
						}
						else if("Ext Card".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							ext_card = ext_card.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Loyalty".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							loyalty = loyalty.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						
						/* mobile payments */
						else if("MCB Juice".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							mcbJuice = mcbJuice.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("MY.T Money".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							mytMoney = mytMoney.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Emtel Money".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							emtelMoney = emtelMoney.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("Gifts.mu".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							giftsMu = giftsMu.add(new BigDecimal(amt)).setScale(2, BigDecimal.ROUND_HALF_EVEN);
						}
						else if("MIPS".equalsIgnoreCase(tenderType))
						{
							amt = payment.getDouble("payAmt") * negate;
							mips = mips.add(new BigDecimal(amt));
						}
						
						if(tenderTypeMap.containsKey(tenderType)) {
							BigDecimal total = tenderTypeMap.get(tenderType);
							total = total.add(new BigDecimal(amt));
							tenderTypeMap.put(tenderType, total);
						}
						else 
						{
							tenderTypeMap.put(tenderType, new BigDecimal(amt));
						}
					} 
					catch (Exception e) 
					{
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}				
			
			}
			
			JSONObject json = new JSONObject();
			json.put("cash", cash);
			json.put("card", card);
			json.put("cheque", cheque);
			json.put("ext_card", ext_card);
			json.put("voucher", voucher);
			json.put("gift", gift);
			json.put("loyalty", loyalty);
			json.put("coupon", coupon.negate());
			json.put("deposit", deposit);
			
			/* mobile payments */
			json.put("mcbJuice", mcbJuice);
			json.put("mytMoney", mytMoney);
			json.put("emtelMoney", emtelMoney);
			json.put("giftsMu", giftsMu);
			json.put("mips", mips);
			
			json.put("taxTotal", taxTotal);
			json.put("grandTotal", grandTotal);
			json.put("subTotal", grandTotal.subtract(taxTotal));
			json.put("discountTotal", discountTotal);
			json.put("userDiscountTotal", userDiscountTotal);
			
			json.put("noOfOrders", noOfOrders);
			json.put("noOfReturns", noOfReturns);
			
			json.put("qtySold", qtySold);
			json.put("qtyReturned", qtyReturned);
			
			json.put("qtyItemsSold", qtySold - qtyServicesSold );
			json.put("qtyItemsReturned", qtyReturned - qtyServicesReturned );
			
			json.put("qtyServicesSold", qtyServicesSold );
			json.put("qtyServicesReturned", qtyServicesReturned );
			
			//put discount codes
			JSONArray discountCodes = new JSONArray();
			
			for( JSONObject code : discountCodeMap.values() )
			{
				discountCodes.put(code);
			}
			
			json.put("discountCodes", discountCodes );
			
			//put employee sales
			JSONArray employeeSales = new JSONArray();
			
			for( String name : employeeSalesMap.keySet() ) {
				
				employeeSales.put(new JSONObject()
						.put("name", name)
						.put("amt", employeeSalesMap.get(name).setScale(2, BigDecimal.ROUND_HALF_EVEN).doubleValue())
				);
				
			}
			
			json.put("employeeSales", employeeSales );
			
			//draft orders
			JSONArray draftOrders = getDraftOrders(terminal_id);
			json.put("draftOrders", draftOrders );
			
			//open orders
			JSONArray openOrders = getOpenOrders(terminal_id);
			json.put("openOrders", openOrders );
			
			//put taxes
			JSONArray taxes = new JSONArray();
			
			for( JSONObject tax : taxMap.values() )
			{
				taxes.put(tax);
			}
			
			json.put("taxes", taxes );
			
			//put tenderTypeSummary
			JSONArray tenderTypes = new JSONArray();
			
			Map<String, String> tenderTypeCodeMap = new HashMap<>();
			tenderTypeCodeMap.put("Cash", "B");
			tenderTypeCodeMap.put("Card", "K");
			tenderTypeCodeMap.put("Cheque", "S");
			tenderTypeCodeMap.put("Voucher", "V");
			tenderTypeCodeMap.put("Ext Card", "E");
			tenderTypeCodeMap.put("Loyalty", "L");
			tenderTypeCodeMap.put("MCB Juice", "J");
			tenderTypeCodeMap.put("MY.T Money", "Y");
			tenderTypeCodeMap.put("Emtel Money", "T");
			tenderTypeCodeMap.put("Gifts.mu", "U");
			tenderTypeCodeMap.put("MIPS", "I");
			
			for( String name : tenderTypeMap.keySet() ) {
				
				tenderTypes.put(new JSONObject()
						.put("name", name)
						.put("code", tenderTypeCodeMap.get(name))
						.put("amt", tenderTypeMap.get(name).setScale(2, BigDecimal.ROUND_HALF_EVEN).doubleValue())
				);
				
			}
			
			json.put("tenderTypes", tenderTypes );
			
			return json;
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException(e);
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
	}
	
	public static boolean validateCashAmount(int terminal_id, BigDecimal cashAmountEntered) throws TillException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		Timestamp time_open = null;
		BigDecimal opening_amt = null;
		
		try 
		{
			conn = Database.getConnection();			
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery("select time_open, opening_amt from close_till where terminal_id = " + terminal_id + " and time_close is null order by time_open desc");
			
			if(rs.next())
			{
				time_open = rs.getTimestamp(1);	
				opening_amt = rs.getBigDecimal(2);
			}			
			
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException("Failed to validate cash amount!", e);
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
		
		try 
		{
			JSONObject payments = getCurrentMoneyInTill(terminal_id, time_open);
			
			double cash = payments.getDouble("cash");
			
			BigDecimal expectedCashAmount = new BigDecimal(cash);
			expectedCashAmount = expectedCashAmount.add(opening_amt);
			
			System.out.println(String.format("Validating till balance. Entered : %1f, Expected : %2f", cashAmountEntered.doubleValue(), expectedCashAmount.doubleValue()));
			
			if(cashAmountEntered.doubleValue() == expectedCashAmount.doubleValue()){
				return true;
			}
	
		} 
		catch (JSONException e) 
		{
			log.error(e);
			
			throw new TillException("Failed to validate cash amount!", e);
		}
		
		return false;
	}
	
	public static JSONObject getTenderAmounts(int terminal_id) throws TillException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		Statement stmt = null;
		ResultSet rs = null;
		
		Timestamp time_open = null;
		
		try 
		{
			conn = Database.getConnection();			
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery("select time_open, opening_amt from close_till where terminal_id = " + terminal_id + " and time_close is null order by time_open desc");
			
			if(rs.next())
			{
				time_open = rs.getTimestamp(1);	
			}			
			
		}
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException("Failed to query till!", e);
		}
		finally
		{
			Database.close(conn, pstmt, rs);
			Database.close(stmt);
		}
		
		JSONObject payments = getCurrentMoneyInTill(terminal_id, time_open);
		
		// remove cash amount
		//payments.remove("cash");
		
		return payments;
	}
	
	public static JSONObject getLastTimeCloseTill(int terminal_id) throws TillException
	{
		Connection conn = null;
		PreparedStatement stmt = null;
		ResultSet rs = null;
		
		JSONObject json = new JSONObject();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select uuid, time_close from close_till where time_close=( select max(time_close) from close_till where terminal_id = ? ) and terminal_id = ?");
			//stmt = conn.prepareStatement("select uuid, max(time_close) from close_till where terminal_id = ?");
			
			stmt.setInt(1, terminal_id);
			stmt.setInt(2, terminal_id);
			
			rs = stmt.executeQuery();					
			
			while(rs.next())
			{
				String uuid = rs.getString(1);				
				Timestamp time_close = rs.getTimestamp(2);		
				
				json.put("uuid", uuid);
				json.put("time_close", time_close);				
			}
			
			return json;
		} 
		catch (Exception e) 
		{
			log.error(e);
			
			throw new TillException(e);
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
	}
	
	/* draft orders that have not been synchronized */
	public static JSONArray getDraftOrders(int terminal_id) throws Exception
	{
		Connection conn = null;
		PreparedStatement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select value from orders where status in ('', 'DR','IP', 'RP') and docstatus = 'DR' and terminal_id = ?");			
			stmt.setInt(1, terminal_id);
			
			rs = stmt.executeQuery();
			
			String value = null;
			JSONObject order = null;
			
			while(rs.next())
			{
				value = rs.getString(1);				
				order = new JSONObject(value);
				
				if(order.has("pushDraftAndOpenOrders")) {
					continue;
				}
				
				jsonArray.put(order.get("uuid"));
				
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
	
	/* get open orders */
	public static JSONArray getOpenOrders(int terminal_id) throws Exception
	{
		Connection conn = null;
		PreparedStatement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.prepareStatement("select value from orders where status in ('', 'DR','IP', 'RP') and tendertype = 'Mixed' and terminal_id = ?");			
			stmt.setInt(1, terminal_id);
			
			rs = stmt.executeQuery();
			
			String value = null;
			JSONObject order = null;
			
			JSONObject payment;
			BigDecimal payAmt, openAmt;
			
			JSONArray payments;
			
			while(rs.next())
			{
				value = rs.getString(1);
				order = new JSONObject(value);
				
				if(order.has("pushDraftAndOpenOrders")) {
					continue;
				}
				
				//check for open amt
				openAmt = new BigDecimal(order.getDouble("grandTotal")).setScale(2, RoundingMode.HALF_EVEN);
				
				payments = order.getJSONArray("payments");				
				
				for( int i = 0; i < payments.length(); i++ )
				{
					payment = payments.getJSONObject(i);
					payAmt = new BigDecimal(payment.getDouble("payAmt")).setScale(2, RoundingMode.HALF_EVEN);
					
					openAmt = openAmt.subtract(payAmt).setScale(2, RoundingMode.HALF_EVEN);
				}
				
				if( openAmt.doubleValue() != 0 )
				{
					log.info("Found open order ...");
					jsonArray.put(order.getString("uuid"));
				}				
				
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
