package org.posterita.database;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.apache.http.Consts;
import org.apache.http.Header;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.exception.CashierControlSynchronizationException;
import org.posterita.exception.ClockInOutSynchronizationException;
import org.posterita.exception.CloseTillSynchronizationException;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.DocumentNoSynchronizationException;
import org.posterita.exception.OrderSynchronizationException;
import org.posterita.exception.TableSynchronizationException;
import org.posterita.model.Application;
import org.posterita.util.NetworkUtils;

public class DatabaseSynchronizer
{	
	private static Logger log = Logger.getLogger(DatabaseSynchronizer.class);
	private List<DatabaseSynchronizerListener> listeners = new ArrayList<DatabaseSynchronizerListener>();
	
	private String[] tables = new String[]{
			"users",
			"role",
			"role_org_access",
			"terminal",
			"bp",
			"tax",
			"product",
			"bom",
			"modifier_group",
			"product_modifier_group",
			"store",
			"warehouse",
			"product_price",
			"attributeset_instance"
		};
	
	public DatabaseSynchronizer(){
		this.addListener((s) -> log.info(s));
	}
	
	public void notifyListeners( String notification ) {
		
		for( DatabaseSynchronizerListener listener : listeners ) {
			
			listener.notify(notification);			
		}
		
	}
	
	public void addListener( DatabaseSynchronizerListener listener ) {
		
		listeners.add(listener);
		
	}
	
	public void pullData() throws Exception
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPullData())) return;
		
		String serverAddress = config.getServerAddress();
		String apiKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		// check server
		notifyListeners("Synchronizing database ...");
		notifyListeners(String.format("Connecting to server %s ...", serverAddress));
		
		boolean reachable = NetworkUtils.isServerReachable(serverAddress);
		
		if(!reachable)
		{
			String message = "Synchronization failed! Server is unreachable!";			
			log.error(message);
			
			throw new TableSynchronizationException(message);
		}	
		
		// create product backup
		backupProducts();
		
		
		// request data
		
		notifyListeners("Pulling data ...");
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
		
		try
		{
			HttpGet get = new HttpGet(serverAddress + "/OfflineDataAction.do?action=pullData2&api-key=" 
					+ apiKey + "&terminal-key=" + terminalKey);
			
			HttpResponse  response = httpClient.execute(get);
			Header header = response.getFirstHeader("Content-Type");
			String contentType = header.getValue();
			
			
			if(contentType == null) 
			{
				log.error(String.format("Failed to pull data. Could not get content-type data"));
			}
			
			int statusCode = response.getStatusLine().getStatusCode();
			
			log.info("Status Code => " + statusCode);
			
			if( statusCode >= 400 ) 
			{
				throw new TableSynchronizationException("Failed to pull data!");
			}
			
			notifyListeners("Processing data ...");
			
			JSONObject responseJSON = null;
			String responseText = null;
			String table = null;
			
			if(contentType.startsWith("application/zip"))
			{
				byte[] data = EntityUtils.toByteArray(response.getEntity());
				ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(data));
					
				ZipEntry entry = null;
				
				while((entry = zis.getNextEntry()) != null)
				{
					table = entry.getName();
					
					BufferedInputStream bis = new BufferedInputStream(zis);					
					BufferedReader br = new BufferedReader(new InputStreamReader(bis));
					
					StringBuffer sb = new StringBuffer();
					String line = null;
					
					while((line = br.readLine())!=null)
					{
						sb.append(line);
					}
					
					responseText = sb.toString();
					
					responseJSON = new JSONObject(responseText);
					
					if(responseJSON.has("error"))
					{
						String error = responseJSON.getString("error");
						log.error(String.format("Failed to update table %s. The server return the following error: %s", table, error));
						continue;
					}
					
					JSONArray records = responseJSON.getJSONArray("records");
					
					notifyListeners(String.format("Updating table %s. %d records found.", table, records.length()));
					
					
					if(table.equalsIgnoreCase("TERMINAL"))
					{
						Database.putAll(table, records.toString(), "id");
						
						//clear previous configured terminal
						/* restaurant *///Database.executeUpdate("delete from TERMINAL where id <> ? ", new Object[]{ terminalKey } );
						
						continue;
					}
					
					if( table.equalsIgnoreCase("PRODUCT_PRICE") )
					{
						initProductPrice( records );
						
						continue;
					}
					
					if( table.equalsIgnoreCase("attributeset_instance") )
					{
						initAttributeSetInstance(records);
						
						continue;
					}
					
					JSONObject record = null;
					
					File tempFile = File.createTempFile(table + "json-data", "import");				
					BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
					
					for(int i=0; i<records.length(); i++)
					{
						record = records.getJSONObject(i);
						
						writer.write("^");
						writer.write(record.getString("id"));
						writer.write("^");
						writer.write("%");
						writer.write("^");
						writer.write(record.toString());
						writer.write("^");
						writer.write("\n");
					}
					
					writer.flush();
					writer.close();
					
					Connection conn = Database.getConnection();
					
					/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
					PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
					
				    ps.setString(1, null);
				    ps.setString(2, table.toUpperCase());
				    ps.setString(3, tempFile.getAbsolutePath());
				    ps.setString(4, "%");
				    ps.setString(5, "^");
				    ps.setString(6, null);
				    ps.setInt(7, 1); 
				    ps.execute();
					
					ps.close();		
					conn.close();
					
					tempFile.delete();
					
					
					if(table.equalsIgnoreCase("PRODUCT"))
					{					
						// build search tables
						notifyListeners("Initializing search tables ...");
						initSearchProduct( records );
						
						notifyListeners("Looking for price changes ...");
						initProductUpdate( records );
						
					}
					
					if(table.equalsIgnoreCase("USERS"))
					{
						String sql = "update clock_in_out set time_out = ?, synchronized = 'N' where user_id = ? and time_out is null";
						
						JSONObject user = null;
						
						for(int i=0; i<records.length(); i++) 
						{
							user = records.getJSONObject(i);
							
							if("N".equalsIgnoreCase(user.getString("isactive")))
							{
								int id = user.getInt("id");								
								Database.executeUpdate(sql, new Object[]{new Timestamp(System.currentTimeMillis()), id});
							}							
						}
					}
					
					//setSyncDate(table);
					Database.executeUpdate("DELETE FROM SYNC_DATE WHERE EVENT = ?", new Object[] {table.toUpperCase()});
					Database.executeUpdate("INSERT INTO SYNC_DATE(EVENT, EVENTDATE) VALUES(?,?)", new Object[] {table.toUpperCase(), new Timestamp(System.currentTimeMillis())});

				}
			}
			else
			{
				//error
				responseText = EntityUtils.toString(response.getEntity());
			}
		}
		finally
		{
			httpClient.close();
		}
		
		setSyncDate(SYSTEM);
	}
	
	/** Use pull data instead */
	@Deprecated 
	public void synchronize() throws Exception
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPullData())) return;
		
		String serverAddress = config.getServerAddress();
		String apiKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		// check server
		notifyListeners("Synchronizing database ...");
		notifyListeners(String.format("Connecting to server %s ...", serverAddress));
		
		boolean reachable = NetworkUtils.isServerReachable(serverAddress);
		
		if(!reachable)
		{
			String message = "Synchronization failed! Server is unreachable!";			
			log.error(message);
			
			throw new TableSynchronizationException(message);
		}	
		
		// create product backup
		Database.executeUpdate("DROP TABLE PRODUCT2");
		Database.executeUpdate("CREATE TABLE PRODUCT2 AS SELECT * FROM PRODUCT WITH NO DATA");
		Database.executeUpdate("INSERT INTO PRODUCT2 SELECT * FROM PRODUCT");
		
		
		// request data
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();		
		
		try 
		{
			JSONObject responseJSON = null;
			
			for(String table : this.tables)
			{
				notifyListeners(String.format("Requesting data for table %s", table));
				
				try 
				{
					String action = table;
					HttpGet get = new HttpGet(serverAddress + "/OfflineDataAction.do?action=" + action + "&api-key=" 
							+ apiKey + "&terminal-key=" + terminalKey);
					
					HttpResponse  response = httpClient.execute(get);
					Header header = response.getFirstHeader("Content-Type");
					String contentType = header.getValue();
					
					if(contentType == null){
						log.error(String.format("Failed to update table %s. Could not get content-type data", table));
						continue;
					}
					
					String responseText = null;
					
					if(contentType.startsWith("application/zip"))
					{
						byte[] data = EntityUtils.toByteArray(response.getEntity());
						ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(data));
										
						if(zis.getNextEntry() != null)
						{
							BufferedInputStream bis = new BufferedInputStream(zis);					
							BufferedReader br = new BufferedReader(new InputStreamReader(bis));
							
							StringBuffer sb = new StringBuffer();
							String line = null;
							
							while((line = br.readLine())!=null)
							{
								sb.append(line);
							}
							
							responseText = sb.toString();
						}
					}
					else
					{
						responseText = EntityUtils.toString(response.getEntity());
					}
					
					get.releaseConnection();
					
					
					responseJSON = new JSONObject(responseText);
					
					if(responseJSON.has("error"))
					{
						String error = responseJSON.getString("error");
						log.error(String.format("Failed to update table %s. The server return the following error: %s", table, error));
						continue;
					}
					
					JSONArray records = responseJSON.getJSONArray("records");
					
					notifyListeners(String.format("Updating table %s. %d records found.", table, records.length()));
					
					
					if(table.equalsIgnoreCase("TERMINAL"))
					{
						Database.putAll(table, records.toString(), "id");
						
						//clear previous configured terminal
						Database.executeUpdate("delete from TERMINAL where id <> ? ", new Object[]{ terminalKey } );
						
						continue;
					}
					
					JSONObject record = null;
					
					File tempFile = File.createTempFile(table + "json-data", "import");				
					BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
					
					for(int i=0; i<records.length(); i++)
					{
						record = records.getJSONObject(i);
						
						writer.write("^");
						writer.write(record.getString("id"));
						writer.write("^");
						writer.write("%");
						writer.write("^");
						writer.write(record.toString());
						writer.write("^");
						writer.write("\n");
					}
					
					writer.flush();
					writer.close();
					
					Connection conn = Database.getConnection();
					
					/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
					PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
					
				    ps.setString(1, null);
				    ps.setString(2, table.toUpperCase());
				    ps.setString(3, tempFile.getAbsolutePath());
				    ps.setString(4, "%");
				    ps.setString(5, "^");
				    ps.setString(6, null);
				    ps.setInt(7, 1); 
				    ps.execute();
					
					ps.close();		
					conn.close();
					
					tempFile.delete();
					
					
					if(table.equalsIgnoreCase("PRODUCT"))
					{					
						// build search tables
						notifyListeners("Initializing search product tables ...");
						initSearchProduct( records );
						
						notifyListeners("Looking for price changes ...");
						initProductUpdate( records );
						
					}
					
					//setSyncDate(table);
					Database.executeUpdate("DELETE FROM SYNC_DATE WHERE EVENT = ?", new Object[] {table.toUpperCase()});
					Database.executeUpdate("INSERT INTO SYNC_DATE(EVENT, EVENTDATE) VALUES(?,?)", new Object[] {table.toUpperCase(), new Timestamp(System.currentTimeMillis())});
					
				}
				catch (Exception e) 
				{
					log.error(e);
					throw new TableSynchronizationException(e);
				}
			}			
			
			notifyListeners("Database has successfully synchronized");
		}
		catch (Throwable t) 
		{
			httpClient.close();
			
			log.error("Fatal error", t);
			
			System.exit(1);
		}
		finally
		{
			httpClient.close();
		}
		
		setSyncDate(SYSTEM);
	}
	
	public void synchronizeDocumentNo(boolean updateDocumentNo) throws DocumentNoSynchronizationException
	{	
		notifyListeners("Synchronizing DocumentNo ...");
		
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPushData())) return;
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		JSONArray jsonArray = new JSONArray();
		
		String sql = "select ID, sequence_no from terminal";
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			rs = stmt.executeQuery(sql);
			
			while(rs.next())
			{
				String id = rs.getString(1);
				BigDecimal sequenceNo = rs.getBigDecimal(2);
				
				jsonArray.put(new JSONObject()
					.put("id", id)
					.put("posVersion", Application.POS_VERSION)
					.put("sequence", sequenceNo));
			}
			
			if(jsonArray.length() == 0)
			{
				return;
			}
			
		} 
		catch (Exception e) 
		{
			log.error("Failed to query document no", e);
			throw new DocumentNoSynchronizationException("Failed to query document no", e);
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
			
		
		String serverAddress = config.getServerAddress();
		
		boolean reachable = NetworkUtils.isServerReachable(serverAddress);
		
		if(!reachable)
		{
			String message = "Synchronization failed! Server is unreachable!";			
			log.error(message);
			
			throw new DocumentNoSynchronizationException(message);
		}
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
		
		JSONArray responseJSON = null;
		
		
		HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
		
		List <NameValuePair> nvps = new ArrayList <NameValuePair>();
        nvps.add(new BasicNameValuePair("action", "syncDocumentNo"));
        nvps.add(new BasicNameValuePair("json", jsonArray.toString()));

        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
		
        String responseText = null;
		try 
		{
			HttpResponse  response = httpClient.execute(post);
			responseText = EntityUtils.toString(response.getEntity());
			responseJSON = new JSONArray(responseText);
			
			post.releaseConnection();
			
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			for(int i=0; i<responseJSON.length(); i++)
			{
				JSONObject obj = responseJSON.getJSONObject(i);
				
				String id = obj.getString("id");
				String sequence = obj.getString("sequence");
				String sequence_on_server = obj.getString("sequence_on_server");
				String updated = obj.getString("updated");
				String sequence_prefix = "";
				
				if(obj.has("sequence_prefix")){
					sequence_prefix = obj.getString("sequence_prefix");
				}				
				
				notifyListeners(String.format("Terminal ID: %s, Sequence: %s, Sequence on server:%s, Updated:%s", id, sequence, sequence_on_server, updated));
				
				
				if( updateDocumentNo ) 
				{
					// update terminal sequence
					stmt.executeUpdate("update terminal set SEQUENCE_NO = " + sequence_on_server + " where id = '" + id + "'");
					
					if(sequence_prefix != null)
					{
						stmt.executeUpdate("update terminal set SEQUENCE_PREFIX = '" + sequence_prefix + "' where id = '" + id + "'");
					}				
					
					notifyListeners(String.format("Update, Terminal ID: %s, Sequence: %s", id, sequence_on_server));
				}
				
				
			}
		} 
		catch (JSONException e) 
		{
			log.error("Failed to parse response", e);
			log.error(responseText);
			throw new DocumentNoSynchronizationException("Failed to parse response", e);
		}
		catch (Exception e) 
		{
			log.error("Failed to push document numbers", e);
			throw new DocumentNoSynchronizationException("Failed to push document numbers", e);
			
		}
		finally
		{
			Database.close(conn, stmt, rs);
			
			try 
			{
				httpClient.close();
				
			} 
			catch (IOException e) 
			{
				log.error(e);
			}
		}
		
		setSyncDate(TERMINAL);
	}
	
	public int synchronizeOrders(boolean test, int minutes, boolean auto) throws OrderSynchronizationException
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPushData())) return 0;
		
		String serverAddress = config.getServerAddress();
		String merchantKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		notifyListeners("Synchronizing orders ...");
		
		//test connection to server first
		boolean isServerReachable = NetworkUtils.isServerReachable(serverAddress);
		if(!isServerReachable)
		{
			throw new OrderSynchronizationException(String.format("Failed to connect to server %s", serverAddress));
		}		
		
		notifyListeners("Quering orders ..");
		
		String orders = null;
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		/*
		 * Get all orders than need to be synchronized and group them in batch of 100.
		 * Need to process in batch as we can just sent all orders at once
		 * due to POST data limit.
		 */
		
		ArrayList<String> batch = new ArrayList<String>();
		int MAX_ORDERS = 100;
		int count = 0;
		
		JSONObject order = null;
		String value = null;
		
		String sql = " select value, tendertype, docstatus from orders where status in ('', 'DR','IP', 'RP') order by date_ordered desc";		
		
		try 
		{			
			conn = Database.getConnection();
			stmt = conn.createStatement();
			rs = stmt.executeQuery(sql);
			
			StringBuffer sb = new StringBuffer("[");
			
			boolean isDraftOrOpen = false;
			
			//order marked for synchronization when till is closed.
			boolean pushDraftAndOpenOrders = false;
			
			while(rs.next())
			{
				value = rs.getString(1);	
				order = new JSONObject(value);
				
				//look for flag pushDraftAndOpenOrders
				isDraftOrOpen = false;
				pushDraftAndOpenOrders = order.optBoolean("pushDraftAndOpenOrders", false);
				
				if("DR".equalsIgnoreCase(rs.getString(3)))
				{
					notifyListeners("Found drafted order ...");	
					isDraftOrOpen = true;
				}				
				else if("Mixed".equalsIgnoreCase(rs.getString(2)))
				{					
					BigDecimal openAmt = new BigDecimal(order.getDouble("grandTotal")).setScale(2, RoundingMode.HALF_EVEN);
					
					JSONArray payments = order.getJSONArray("payments");
					
					JSONObject payment;
					BigDecimal payAmt;
					
					for( int i = 0; i < payments.length(); i++ )
					{
						payment = payments.getJSONObject(i);
						payAmt = new BigDecimal(payment.getDouble("payAmt")).setScale(2, RoundingMode.HALF_EVEN);
						
						openAmt = openAmt.subtract(payAmt).setScale(2, RoundingMode.HALF_EVEN);
					}
					
					if( openAmt.doubleValue() != 0 )
					{
						log.info("Found open order ...");
						isDraftOrOpen = true;
					}
				}
				
				if( isDraftOrOpen && !pushDraftAndOpenOrders) {
					continue;
				}				
				
				count ++;
				
				
				if(count % MAX_ORDERS == 0)
				{
					sb.append("]");					
					batch.add(sb.toString());
					
					sb = new StringBuffer("[");
				}
				
				
				
				if(sb.length() > 1)
				{
					sb.append(",");
				}
				
				sb.append(value);
			}
			
			sb.append("]");
			batch.add(sb.toString());
			
		} 
		catch (Exception e) 
		{
			log.error("Failed to query orders", e);
			throw new OrderSynchronizationException("Failed to query orders", e);
			
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}
		
		if(count == 0){
			
			notifyListeners("No new order found, returning ...");	
			
			return 0;
			
		}
		
		notifyListeners(String.format("Synchronizing  %d orders", count));
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();	
		
		JSONArray responseJSON = null;		
		int batchCount = 0;
		
		try
		{
			for(String b : batch)
			{
				notifyListeners(String.format("Pushing batch  %d", ++ batchCount));
				
				HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
				
				List <NameValuePair> nvps = new ArrayList <NameValuePair>();
		        nvps.add(new BasicNameValuePair("action", test ? "testSyncOrders" : "syncOrders"));
		        nvps.add(new BasicNameValuePair("merchantKey", merchantKey));
		        nvps.add(new BasicNameValuePair("terminalKey", terminalKey));
		        nvps.add(new BasicNameValuePair("json", b));

		        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
				
		        String responseText = null;
		        
				try 
				{
					HttpResponse  response = httpClient.execute(post);
					responseText = EntityUtils.toString(response.getEntity());
					responseJSON = new JSONArray(responseText);
					
					post.releaseConnection();
					
					PreparedStatement pstmt = null;
					int[] result = null;
					
					try 
					{
						conn = Database.getConnection();;
						pstmt = conn.prepareStatement("UPDATE ORDERS SET VALUE = ?, STATUS = ?, ERROR_MESSAGE = ? WHERE ID = ?");
						
						conn.setAutoCommit(false);
						
						for(int i=0; i<responseJSON.length(); i++)
						{
							JSONObject obj = responseJSON.getJSONObject(i);
							
							String status = obj.getString("status");
							String uuid = obj.getString("uuid");
							String error = null;
							String orderId = null;
							
							//notifyListeners(String.format("%s ---> %s", uuid, status));
							
							String orderJson = Database.get("ORDERS", uuid);
							order = new JSONObject(orderJson);
							
							order.put("status", status);
							
							if("ER".equals(status))
							{
								error = obj.getString("errorMsg");
								order.put("errormsg", error);
								
								/*
								notifyListeners(String.format("Error ---> %s", error));
								
								Database.executeUpdate("UPDATE ORDERS SET VALUE = ?, STATUS = ?, ERROR_MESSAGE = ? WHERE ID = ? ", 
										new Object[]{order.toString(), status, error, uuid});
										*/
							}
							else
							{
								if(obj.has("orderId"))
								{
									orderId = obj.getString("orderId");
									order.put("orderId", orderId);
								}
								
								
								/*
								Database.executeUpdate("UPDATE ORDERS SET VALUE = ?, STATUS = ? WHERE ID = ? ", 
										new Object[]{order.toString(), status, uuid});
										*/
							}
							
							pstmt.setString(1, order.toString());
							pstmt.setString(2, status);
							pstmt.setString(3, error);
							pstmt.setString(4, uuid);
							
							pstmt.addBatch();
							
						}//for
						
						result = pstmt.executeBatch();					
						
						conn.commit();
						
					} 
					catch (SQLException e) 
					{
						conn.rollback();
						log.error(e);
						throw e;
					}
					finally
					{
						Database.close(conn);
						Database.close(pstmt);
					}
					
					
				} 		
				catch (JSONException e) 
				{
					log.error("Failed to parse response", e);
					log.error(responseText);
					throw new OrderSynchronizationException("Failed to parse response", e);
				}
				catch (Exception e) 
				{
					log.error("Failed to push orders", e);
					throw new OrderSynchronizationException("Failed to push orders", e);
				} 
				
			}//for batch
			
			notifyListeners(String.format("Synchronized ---> %d orders", count));
			
			setSyncDate(ORDERS);
			
		}
		finally
		{
			try 
			{
				httpClient.close();
				
			} 
			catch (IOException e) 
			{
				log.error(e);
			}
		}
		
		return count;	
		
		
	}	
	
	public void synchronizeClockInOut() throws ClockInOutSynchronizationException
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPushData())) return;
		
		String serverAddress = config.getServerAddress();
		String merchantKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		notifyListeners("Synchronizing clock ins and outs ...");
		
		//test connection to server first
		boolean isServerReachable = NetworkUtils.isServerReachable(serverAddress);
		if(!isServerReachable)
		{
			throw new ClockInOutSynchronizationException(String.format("Failed to connect to server %s", serverAddress));
		}		
		
		notifyListeners("Quering clockinout ..");
		
		String clockinouts = null;
		try 
		{
			clockinouts = Database.getAllFrom("clock_in_out", "synchronized = 'N'");
		} 
		catch (DatabaseException e1) 
		{
			log.error("Failed to query clockinouts", e1);
			throw new ClockInOutSynchronizationException("Failed to query clockinouts", e1);
		}
		
		if(clockinouts.length() == 0)
		{
			return;
		}
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();	
		JSONArray responseJSON = null;	
		
		try
		{
			
			HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
			
			List <NameValuePair> nvps = new ArrayList <NameValuePair>();
	        nvps.add(new BasicNameValuePair("action", "syncClockInOut"));
	        nvps.add(new BasicNameValuePair("merchantKey", merchantKey));
	        nvps.add(new BasicNameValuePair("terminalKey", terminalKey));
	        nvps.add(new BasicNameValuePair("json", clockinouts));

	        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
			
			try 
			{
				HttpResponse  response = httpClient.execute(post);
				String responseText = EntityUtils.toString(response.getEntity());
				responseJSON = new JSONArray(responseText);
				
				post.releaseConnection();
				
				String uuid = null;
				boolean synchronize = false; 
				
				for(int i=0; i<responseJSON.length(); i++)
				{
					JSONObject obj = responseJSON.getJSONObject(i);	
					//result.put(new JSONObject().put("uuid", uuid).put("synchronized", false).put("errorMsg", "Terminal not found!"));
					
					uuid = obj.getString("uuid");
					synchronize = obj.getBoolean("synchronized");
					
					log.info(String.format("CLOCK_IN_OUT %s ---> %s", uuid, synchronize));
					
					if(synchronize){
						Database.executeUpdate("UPDATE CLOCK_IN_OUT SET SYNCHRONIZED = 'Y' WHERE UUID = ? ", 
								new Object[]{uuid});
					}
					else
					{
						String errorMsg = obj.getString("errorMsg");
						log.error(String.format("Error ---> %s", errorMsg));
					}
					
				}
			} 		
			catch (JSONException e) 
			{				
				log.error("Failed to parse response. " + responseJSON, e);
				throw new ClockInOutSynchronizationException("Failed to parse response", e);
			}
			catch (Exception e) 
			{
				log.error("Failed to push clockinouts", e);
				throw new ClockInOutSynchronizationException("Failed to push clockinouts", e);
			} 
			
			setSyncDate(CLOCK_INOUT);
		        
		}
		finally
		{
			try 
	        {
	        	httpClient.close();
	                
	        } 
	        catch (IOException e) 
	        {
	        	log.error(e);
	        }
		}	
		
	}
	
	public void synchronizeCloseTill() throws CloseTillSynchronizationException
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPushData())) return;
		
		String serverAddress = config.getServerAddress();
		String merchantKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		notifyListeners("Synchronizing close tills ...");
		
		//test connection to server first
		boolean isServerReachable = NetworkUtils.isServerReachable(serverAddress);
		if(!isServerReachable)
		{
			throw new CloseTillSynchronizationException(String.format("Failed to connect to server %s", serverAddress));
		}		
		
		notifyListeners("Quering close tills ..");
		
		String closeTills = null;
		try 
		{
			closeTills = Database.getAllFrom("close_till", "synchronized = 'N' and time_close is not null");
		} 
		catch (DatabaseException e1) 
		{
			log.error("Failed to query close tills", e1);
			throw new CloseTillSynchronizationException("Failed to query close tills", e1);
		}
		
		if(closeTills.length() == 0)
		{
			return;
		}
		
		notifyListeners("Pushing close tills ..");
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();	
		JSONArray responseJSON = null;	
		
		HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
		
		List <NameValuePair> nvps = new ArrayList <NameValuePair>();
        nvps.add(new BasicNameValuePair("action", "syncCloseTill"));
        nvps.add(new BasicNameValuePair("merchantKey", merchantKey));
        nvps.add(new BasicNameValuePair("terminalKey", terminalKey));
        nvps.add(new BasicNameValuePair("json", closeTills));

        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
		
		try 
		{
			HttpResponse  response = httpClient.execute(post);
			String responseText = EntityUtils.toString(response.getEntity());
			responseJSON = new JSONArray(responseText);
			
			post.releaseConnection();
			
			String uuid = null;
			boolean synchronize = false; 
			
			for(int i=0; i<responseJSON.length(); i++)
			{
				JSONObject obj = responseJSON.getJSONObject(i);	
				//result.put(new JSONObject().put("uuid", uuid).put("synchronized", false).put("errorMsg", "Terminal not found!"));
				
				uuid = obj.getString("uuid");
				synchronize = obj.getBoolean("synchronized");
				
				log.info(String.format("CLOSE_TILL %s ---> %s", uuid, synchronize));
				
				if(synchronize){
					Database.executeUpdate("UPDATE CLOSE_TILL SET SYNCHRONIZED = 'Y' WHERE UUID = ? ", 
							new Object[]{uuid});
				}
				else
				{
					String errorMsg = obj.getString("errorMsg");
					log.error(String.format("Error ---> %s", errorMsg));
				}				
			}
		} 		
		catch (JSONException e) 
		{
			log.error("Failed to parse response. " + responseJSON , e);
			throw new CloseTillSynchronizationException("Failed to parse response", e);
		}
		catch (Exception e) 
		{
			log.error("Failed to push close tills", e);
			throw new CloseTillSynchronizationException("Failed to push close tills", e);
		} 
		finally
		{
			try {
				httpClient.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
		
		setSyncDate(CLOSE_TILL);
		
	}
	
	public void synchronizeCashierControl(JSONObject json) throws CashierControlSynchronizationException
	{
		// load configuration details
		Configuration config = Configuration.get(true);
		
		if("N".equalsIgnoreCase(config.getPushData())) return;
		
		String serverAddress = config.getServerAddress();
		String merchantKey = config.getMerchantKey();
		String terminalKey = config.getTerminalKey();
		
		notifyListeners("Synchronizing cashier control ...");
		
		//test connection to server first
		boolean isServerReachable = NetworkUtils.isServerReachable(serverAddress);
		if(!isServerReachable)
		{
			throw new CashierControlSynchronizationException(String.format("Failed to connect to server %s", serverAddress));
		}		
		
		notifyListeners("Pushing close tills ..");
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();	
		JSONObject obj = null;	
		
		HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
		
		List <NameValuePair> nvps = new ArrayList <NameValuePair>();
        nvps.add(new BasicNameValuePair("action", "syncCashierControl"));
        nvps.add(new BasicNameValuePair("merchantKey", merchantKey));
        nvps.add(new BasicNameValuePair("terminalKey", terminalKey));
        nvps.add(new BasicNameValuePair("json", json.toString()));

        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
		
        String responseText = null;
        
		try 
		{
			HttpResponse  response = httpClient.execute(post);
			
			responseText = EntityUtils.toString(response.getEntity());
			obj = new JSONObject(responseText);
			
			post.releaseConnection();
			
			String uuid = null;
			boolean synchronize = false; 
			
			uuid = obj.getString("uuid");
			synchronize = obj.getBoolean("synchronized");
			
			log.info(String.format("CASHIER_CONTROL %s ---> %s", uuid, synchronize));
			
			if(synchronize){
				Database.executeUpdate("UPDATE CASHIER_CONTROL SET SYNCHRONIZED = 'Y' WHERE UUID = ? ", 
						new Object[]{uuid});
			}
			else
			{
				String errorMsg = obj.getString("errorMsg");
				log.error(String.format("Error ---> %s", errorMsg));
			}
		} 		
		catch (JSONException e) 
		{
			log.error("Failed to parse response. " + responseText , e);
			throw new CashierControlSynchronizationException("Failed to parse response", e);
		}
		catch (Exception e) 
		{
			log.error("Failed to push cashier control", e);
			throw new CashierControlSynchronizationException("Failed to push cashier control", e);
		} 
		finally
		{
			try {
				httpClient.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
		
		setSyncDate(CLOSE_TILL);
		
	}
	
	private void initSearchProduct( JSONArray records ) throws Exception
	{
		notifyListeners("Initializing product search ...");
		
		Database.executeUpdate("TRUNCATE TABLE SEARCH_PRODUCT");
		
		JSONObject record = null;
		String name = null;
		String description = null;
		
		String primarygroup = null;
		String product_category = null;
		String group1 = null;
		String group2 = null;
		String group3 = null;
		String group4 = null;
		String group5 = null;
		String group6 = null;
		String group7 = null;
		String group8 = null;
		
		String isModifier = null;
		
		String table = "SEARCH_PRODUCT";
		
		File tempFile = File.createTempFile(table + "json-data", "import");				
		BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
		
		for(int i=0; i<records.length(); i++)
		{
			record = records.getJSONObject(i);
			
			name = record.getString("name"); //60
			description = record.getString("description"); //120
			
			primarygroup = record.getString("primarygroup");
			product_category = record.getString("product_category");
			
			isModifier = record.getString("ismodifier");
			
			group1 = record.has("group1") ? record.getString("group1") : "";
			group2 = record.has("group2") ? record.getString("group2") : "";
			group3 = record.has("group3") ? record.getString("group3") : "";
			group4 = record.has("group4") ? record.getString("group4") : "";
			group5 = record.has("group5") ? record.getString("group5") : "";
			group6 = record.has("group6") ? record.getString("group6") : "";
			group7 = record.has("group7") ? record.getString("group7") : "";
			group8 = record.has("group8") ? record.getString("group8") : "";
			
			if (name.length() > 60)
			{
				log.info("Length > 60 - truncated");
				name = name.substring(0, 60);
			}
			
			if (description.length() > 120)
			{
				log.info("Length > 120 - truncated");
				description = description.substring(0, 120);
			}
			
			if (primarygroup.length() > 60)
			{
				log.info("Length > 60 - truncated");
				primarygroup = primarygroup.substring(0, 60);
			}
			
			if (product_category.length() > 60)
			{
				log.info("Length > 60 - truncated");
				product_category = product_category.substring(0, 60);
			}
			
			if (group1.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group1 = group1.substring(0, 60);
			}
			
			if (group2.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group2 = group2.substring(0, 60);
			}
			
			if (group3.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group3 = group3.substring(0, 60);
			}
			
			if (group4.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group4 = group4.substring(0, 60);
			}
			
			if (group5.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group5 = group5.substring(0, 60);
			}
			
			if (group6.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group6 = group6.substring(0, 60);
			}
			
			if (group7.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group7 = group7.substring(0, 60);
			}
			
			if (group8.length() > 60)
			{
				log.info("Length > 60 - truncated");
				group8 = group8.substring(0, 60);
			}
			
			writer.write("^");
			writer.write(record.getString("m_product_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("m_product_parent_id").length() == 0 ? "0" : record.getString("m_product_parent_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(name);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(description);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("upc"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("sku"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(primarygroup);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(product_category);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group1);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group2);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group3);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group4);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group5);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group6);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group7);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(group8);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.toString());
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(isModifier);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.optString("extendeddescription",""));
			writer.write("^");			
			writer.write("\n");
		}
		
		writer.flush();
		writer.close();
		
		Connection conn = Database.getConnection();
		
		/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
		PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
		
	    ps.setString(1, null);
	    ps.setString(2, table.toUpperCase());
	    ps.setString(3, tempFile.getAbsolutePath());
	    ps.setString(4, "%");
	    ps.setString(5, "^");
	    ps.setString(6, null);
	    ps.setInt(7, 1); 
	    ps.execute();
		
		ps.close();		
		conn.close();
		
		tempFile.delete();
	}
	
	private void initProductUpdate( JSONArray latestProducts ) throws Exception
	{		
		notifyListeners("Initializing product update ...");
		
		String table = "PRODUCT_UPDATED";
		
		String s = Database.getAllFrom("PRODUCT2");	
		
		notifyListeners("Loaded previous products ...");
		
		JSONArray oldProducts = new JSONArray(s);
		
		notifyListeners("Comparing " + oldProducts.length() + " products");
		
		if( oldProducts.length() == 0 )
		{
			/* nothing to do */
			return;
		}
		
		JSONObject oldProduct = null;
		
		String m_product_id = null;
		
		JSONObject latestProduct = null;	
		
		notifyListeners("Building product index ...");
		
		//build an index for fast search
		HashMap<String, JSONObject> lookup = new HashMap<String, JSONObject>();
		for( int j = 0; j < oldProducts.length(); j++ )
		{
			oldProduct = oldProducts.getJSONObject(j);			
			m_product_id = oldProduct.getString("m_product_id");
			
			lookup.put(m_product_id, oldProduct);
		}
		
		notifyListeners("Product index completed...");
		
		oldProducts = null;
		s = null;
			
		
		double oldPrice, newPrice;
		
		// yyyy-mm-dd hh[:mm[:ss[.nnnnnn]]] ex. 1960-01-01 23:03:20
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");		
		String dateUpdated = sdf.format(new Date(System.currentTimeMillis()));
		
		File tempFile = File.createTempFile(table + "json-data", "import");				
		BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
		
		notifyListeners("Comparing products...");
		
		for(int i=0; i<latestProducts.length(); i++)
		{
			latestProduct = latestProducts.getJSONObject(i);
			
			m_product_id = latestProduct.getString("m_product_id");
			
			oldProduct = lookup.get(m_product_id);	
			
			newPrice = latestProduct.getDouble("pricestd");
			
			if(oldProduct == null){
				
				oldPrice = 0.0;
			}
			else
			{
				oldPrice = oldProduct.getDouble("pricestd");
				
			}			
			
			// compare prices
			if(oldPrice == newPrice) continue;
			
						
			writer.write("^");
			writer.write(m_product_id);
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(latestProduct.getString("name"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(latestProduct.getString("description"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(latestProduct.getString("upc"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(latestProduct.getString("sku"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(Double.toString(oldPrice));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(Double.toString(newPrice));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write( dateUpdated );
			writer.write("^");
			writer.write("\n");
		}
		
		writer.flush();
		writer.close();
		
		/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
		
		notifyListeners("Saving product updated");
		
		Connection conn = Database.getConnection();		
		
		PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
		
	    ps.setString(1, null);
	    ps.setString(2, table.toUpperCase());
	    ps.setString(3, tempFile.getAbsolutePath());
	    ps.setString(4, "%");
	    ps.setString(5, "^");
	    ps.setString(6, null);
	    ps.setInt(7, 0); 
	    ps.execute();
		
		ps.close();		
		conn.close();
		
		tempFile.delete();
		
		notifyListeners("Saved product updated");
		
		//Database.executeUpdate("DROP TABLE PRODUCT2");
		
	}
	
	private void initProductPrice( JSONArray records ) throws Exception
	{
		notifyListeners("Initializing product price ...");
		
		Database.executeUpdate("TRUNCATE TABLE PRODUCT_PRICE");
		
		JSONObject record = null;
		
		String table = "PRODUCT_PRICE";
		
		File tempFile = File.createTempFile(table + "json-data", "import");				
		BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
		
		for(int i=0; i<records.length(); i++)
		{
			record = records.getJSONObject(i);			
				
			writer.write("^");
			writer.write(record.getString("m_product_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("m_pricelist_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("pricelist"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("pricestd"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("pricelimit"));
			writer.write("^");	
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("m_attributesetinstance_id"));
			writer.write("^");	
			writer.write("\n");
		}
		
		writer.flush();
		writer.close();
		
		Connection conn = Database.getConnection();
		
		/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
		PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
		
	    ps.setString(1, null);
	    ps.setString(2, table.toUpperCase());
	    ps.setString(3, tempFile.getAbsolutePath());
	    ps.setString(4, "%");
	    ps.setString(5, "^");
	    ps.setString(6, null);
	    ps.setInt(7, 1); 
	    ps.execute();
		
		ps.close();		
		conn.close();
		
		tempFile.delete();
	}	
		
	private void initAttributeSetInstance( JSONArray records ) throws Exception
	{
		notifyListeners("Initializing attributeset instances ...");
		
		Database.executeUpdate("TRUNCATE TABLE ATTRIBUTESET_INSTANCE");
		
		JSONObject record = null;
		
		String table = "ATTRIBUTESET_INSTANCE";
		
		File tempFile = File.createTempFile(table + "json-data", "import");				
		BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
		
		for(int i=0; i<records.length(); i++)
		{
			record = records.getJSONObject(i);			
				
			writer.write("^");
			writer.write(record.getString("m_attributesetinstance_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("m_attributeset_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("description"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("lot"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.optString("expirydate","").length() == 0 ? "1990-01-01 00:00:00.0" : record.getString("expirydate"));
			writer.write("^");	
			writer.write("\n");
		}
		
		writer.flush();
		writer.close();
		
		Connection conn = Database.getConnection();
		
		/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
		PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
		
	    ps.setString(1, null);
	    ps.setString(2, table.toUpperCase());
	    ps.setString(3, tempFile.getAbsolutePath());
	    ps.setString(4, "%");
	    ps.setString(5, "^");
	    ps.setString(6, null);
	    ps.setInt(7, 1); 
	    ps.execute();
		
		ps.close();		
		conn.close();
		
		tempFile.delete();
		
		Database.executeUpdate("update attributeset_instance set expirydate = null where expirydate = '1990-01-01 00:00:00.0'");
	}
	
	/**
	 * Set sync datetime for particular event
	 */
	public void setSyncDate(String syncEvent) {
		
		try 
		{
			Database.executeUpdate(" update SYNC_DATE set EVENTDATE = ? where EVENT = ? ", 
					new Object[]{ new Timestamp(System.currentTimeMillis()), syncEvent });
		} 
		catch (DatabaseException e) {
			log.error(e);
		}		
	}
	
	public void backupProducts() throws DatabaseException {
		
		notifyListeners("Creating product backup ...");
		
		//Database.executeUpdate("DROP TABLE PRODUCT2");
		//Database.executeUpdate("CREATE TABLE PRODUCT2 AS SELECT * FROM PRODUCT WITH NO DATA");
		//Database.executeUpdate("INSERT INTO PRODUCT2 SELECT * FROM PRODUCT");
		
		String table = "PRODUCT2";
		
		try {
			File tempFile = File.createTempFile(table + "json-data", "import");				
			BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
			
			Connection conn = null;
			PreparedStatement ps = null;
			ResultSet rs = null;
			
			conn = Database.getConnection();
			ps = conn.prepareStatement("SELECT ID, VALUE FROM PRODUCT");
			
			rs = ps.executeQuery();
			
			while( rs.next() ) {
				
				writer.write("^");
				writer.write( rs.getString(1) );
				writer.write("^");
				writer.write("%");
				writer.write("^");
				writer.write( rs.getString(2) );
				writer.write("^");
				writer.write("\n");
				
			}
					
			writer.flush();
			writer.close();
			
			/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
			ps = conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
			
			ps.setString(1, null);
			ps.setString(2, table.toUpperCase());
			ps.setString(3, tempFile.getAbsolutePath());
			ps.setString(4, "%");
			ps.setString(5, "^");
			ps.setString(6, null);
			ps.setInt(7, 1); 
			ps.execute();
			
			ps.close();		
			conn.close();
			
			tempFile.delete();
		} 
		catch (IOException e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		} 
		catch (SQLException e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}
	
	
	public static void main(String[] args) throws Exception
	{	
		Logger.getRootLogger().setLevel(Level.INFO);
		
		Database.initialize();
		
		Database.reset();
		
		DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();
		
		//synchronizer.synchronizeOrders(false, 0, false);
		synchronizer.pullData();
		//synchronizer.synchronizeClockInOut();
		//synchronizer.synchronizeCloseTill();
		//synchronizer.synchronizeDocumentNo(true);
		
	}	

	// sync events
	public static final String SYSTEM = "SYSTEM"; // user, roles, products ...
	public static final String ORDERS = "ORDERS";
	public static final String TERMINAL = "TERMINAL";
	public static final String CLOCK_INOUT = "CLOCK_INOUT";
	public static final String CLOSE_TILL = "CLOSE_TILL";
	
}
