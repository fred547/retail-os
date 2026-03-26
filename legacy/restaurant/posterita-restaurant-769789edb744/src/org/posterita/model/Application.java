package org.posterita.model;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.Properties;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.database.Database;
import org.posterita.database.DatabaseSynchronizer;
import org.posterita.util.NetworkUtils;
import org.posterita.util.OnlineServerMonitor;
import org.posterita.util.SendInBlueBuilder;
import org.posterita.util.Zipper;

public class Application 
{
	private static Logger log = Logger.getLogger(Application.class);
	
	private static OnlineServerMonitor monitor = null;
	
	public static String POS_VERSION = null;
	public static String POS_BUILT = null;
	public static String JAVA_VERSION = null;
	public static String JAVA_VENDOR = null;
	
	static {		
		
		try {
			
			Properties properties = new Properties();
			properties.load(ClassLoader.getSystemResourceAsStream("org/posterita/posterita.properties"));
			
			POS_VERSION = Optional.ofNullable(properties.getProperty("version")).orElse("1.0");
			POS_BUILT = Optional.ofNullable(properties.getProperty("date")).orElse("Unkown");
			
			properties = System.getProperties();
			
			JAVA_VERSION =  Optional.ofNullable(properties.getProperty("java.version")).orElse("Unkown");
			JAVA_VENDOR = Optional.ofNullable(properties.getProperty("java.vendor")).orElse("Unkown");
			
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	/**
	 * Send error logs to posterita for diagnosis
	 * @return true if sent
	 */
	
	public static boolean sendErrorLog()
	{
		File dir = new File("logs");
		
		if(dir.exists())
		{
			// compress file
			
			CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
			
			try 
			{
				ByteArrayOutputStream bos = new ByteArrayOutputStream();
				ZipOutputStream zos = new ZipOutputStream(bos);
				
				File[] files = dir.listFiles(new FileFilter() {					
					@Override
					public boolean accept(File f) {
						return f.getName().startsWith("error.log");
					}
				});
				
				for(File f : files) {
					
					ZipEntry entry = new ZipEntry(f.getName());
					zos.putNextEntry(entry);
					
					byte[] b = new byte[1024];
					int length = 0;
					
					FileInputStream fis = new FileInputStream(f);
					
					while ((length = fis.read(b)) != -1)
					{
						zos.write(b, 0, length);
					}
					
					fis.close();
					zos.closeEntry();
					
				}				
				
				zos.close();
				
				byte[] zipData = bos.toByteArray();	
				
				//encode file to base64 
				String encodedLogFile = Base64.getEncoder().encodeToString(zipData);
				
				bos.close();
				bos = null;
				
				// construct email message
				Configuration config = Configuration.get(true);
				
				StringBuffer msg = new StringBuffer();
		        msg.append("<H3>Offline Error Log</H3>");
		        msg.append("<br>");
		        msg.append("<br>Domain : " + config.getDomain());
		        msg.append("<br>Merchant Key : " + config.getMerchantKey());
		        msg.append("<br>Terminal Key : " + config.getTerminalKey());
		        msg.append("<br>Server URL : " + config.getServerAddress());		        
		        msg.append("<br><br>");
		        msg.append("<br><br>Please see error log attached.<br><br>");
		        
		        final String API_KEY = "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";
		        
		        return SendInBlueBuilder.getInstance()
		        .apiKey(API_KEY)
		        .subject("Offline Error Log " + config.getDomain() + ":" + config.getTerminalKey())
		        .sender("no-reply@posterita.com", "no-reply")
		        .to("support@posterita.com", "support")
		        .htmlContent(msg.toString())
		        .attachContent("log.zip", encodedLogFile)
		        .build().sendTransactionalEmail();
			} 
			catch (Exception e) 
			{
				log.error(e);
			} 
			finally
			{
				try {
					httpClient.close();
				} catch (IOException e) {
					log.error(e);
				}
			}
			
		}
		
		return false;
	}
	
	/**
	 * Send error logs to posterita for diagnosis
	 * @return true if sent
	 */
	
	public static boolean sendDB()
	{
		String path = Database.getDatabasePath();
		
		File dir = new File(path);
		
		
		if(dir.exists())
		{
			byte[] zipData = null;
			
			// compress file
			try 
			{
				File tmp = File.createTempFile("offline-db", ".zip");
				Zipper.zipDirectory(path, tmp.getAbsolutePath());
				
				zipData = Files.readAllBytes(Paths.get(tmp.getAbsolutePath()));
				
				
			} catch (IOException e1) 
			{
				log.error(e1);
				return false;
			}
			
			CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
			
			try 
			{				
				//encode file to base64 
				String encodeDBFile = Base64.getEncoder().encodeToString(zipData);
				
				// construct email message
				Configuration config = Configuration.get(true);
				
				StringBuffer msg = new StringBuffer();
		        msg.append("<H3>Offline DB</H3>");
		        msg.append("<br>");
		        msg.append("<br>Domain : " + config.getDomain());
		        msg.append("<br>Merchant Key : " + config.getMerchantKey());
		        msg.append("<br>Terminal Key : " + config.getTerminalKey());
		        msg.append("<br>Server URL : " + config.getServerAddress());		        
		        msg.append("<br><br>");
		        msg.append("<br><br>Please see db attached.<br><br>");
		        
		        final String API_KEY = "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";
		        
		        return SendInBlueBuilder.getInstance()
		        .apiKey(API_KEY)
		        .subject("Offline DB " + config.getDomain() + ":" + config.getTerminalKey())
		        .sender("no-reply@posterita.com", "no-reply")
		        .to("support@posterita.com", "support")
		        .htmlContent(msg.toString())
		        .attachContent("db.zip", encodeDBFile)
		        .build().sendTransactionalEmail();
			} 
			catch (Exception e) 
			{
				log.error(e);
			} 
			finally
			{
				try {
					httpClient.close();
				} catch (IOException e) {
					log.error(e);
				}
			}
			
		}
		
		return false;
	}	
	
	
	public static JSONObject getSystemInfo()
	{
		JSONObject info = new JSONObject();
		
		Configuration config = Configuration.get(true);
		
		try 
		{
			// account settings
			info.put("server-address", config.getServerAddress());
			info.put("domain", config.getDomain());
			info.put("merchant-key", config.getMerchantKey());
			info.put("terminal-key", config.getTerminalKey());
			
			info.put("pull-data", config.getPullData());
			info.put("push-data", config.getPushData());
			
			// load version from posterita properties 
			Properties properties = new Properties();
			properties.load(ClassLoader.getSystemResourceAsStream("org/posterita/posterita.properties"));
			
						
			info.put("version", POS_VERSION);
			info.put("built", POS_BUILT);
			
			info.put("java-version", JAVA_VERSION);
			info.put("java-vendor", JAVA_VENDOR);
			
			SimpleDateFormat sdf = new SimpleDateFormat("EEE, d MMM yyyy HH:mm a");
			
			String systemSyncDate = sdf.format(new Date(getSynchronizationDate(DatabaseSynchronizer.SYSTEM).getTime()));
			String ordersSyncDate = sdf.format(new Date(getSynchronizationDate(DatabaseSynchronizer.ORDERS).getTime()));
			
			info.put("system-sync-date", systemSyncDate);
			info.put("orders-sync-date", ordersSyncDate);
			
			String documentno_sequence = Database.getSqlValue("select sequence_no from terminal where id = ? ", new Object[]{config.getTerminalKey()});
			
			info.put("documentno_sequence", documentno_sequence);
		} 
		catch (Exception e) {
			log.error(e);
		}
		
		return info;
	}
	
	public static Timestamp getSynchronizationDate(String event)
	{
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		Timestamp date = null;
		
		try {
			conn = Database.getConnection();
			
			stmt = conn.createStatement();
			rs = stmt.executeQuery(" select EVENTDATE from SYNC_DATE where EVENT = '" + event + "' ");
			
			if(rs.next())
			{
				date = rs.getTimestamp(1);
			}
		} 
		catch (Exception e) 
		{
			log.error(e);
		} 
		
		return date;
	}
	
	public static void startServerMonitoring()
	{
		if(monitor == null)
		{
			//monitor = new OnlineServerMonitor();			
			//monitor.start();
		}
		
	}
	
	public static void stopServerMonitoring()
	{
		if(monitor != null)
		{
			monitor.stop();
		}
	}
	
	public static boolean isServerUp()
	{
		if(monitor == null)
		{
			return false;
		}
		
		return monitor.isServerUp();
	}
	
	public static JSONObject getServerStatus()
	{
		JSONObject info = new JSONObject();
		
		try 
		{
			info.put("up", false);
		} 
		catch (JSONException e) 
		{
			log.error(e);
		}
		
		return info;
	}

}
