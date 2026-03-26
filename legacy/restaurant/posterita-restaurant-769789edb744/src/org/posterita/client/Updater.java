package org.posterita.client;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.apache.log4j.Logger;
import org.posterita.config.Configuration;
import org.posterita.exception.UpdaterException;
import org.posterita.util.NetworkUtils;

public class Updater 
{
	protected static Logger log = Logger.getLogger(Updater.class);
	
	protected Configuration config;
	protected String serverAddress;
	protected String updateDir = "updates/";
	
	protected String remoteUpdateDirectoryUrl;
	
	public static String RESTART_FLAG = "restart.flag";
	
	public Updater()
	{		
		config = Configuration.get(true);
		serverAddress = config.getServerAddress();
		remoteUpdateDirectoryUrl = serverAddress + "/restaurant-client";
	}
	
	public void start() throws UpdaterException
	{
		log.info("Starting updater ..");
		log.info("Remote update directory ==> " + remoteUpdateDirectoryUrl);
		
		// clear restart flag
		// no need to check for update after restart
		File flag = new File(RESTART_FLAG);
		if(flag.exists()){
			flag.delete();
			return;
		}
		
		if( ! NetworkUtils.isServerReachable(serverAddress) )
		{
			return;
		}
		
		CloseableHttpClient client = NetworkUtils.getHttpClientInstance();
		
		HttpGet get = new HttpGet( remoteUpdateDirectoryUrl + "/checksum.txt");
		
		ArrayList<UpdateFileEntry> filesToUpdate = new ArrayList<UpdateFileEntry>();
		
		try 
		{
			HttpResponse response = client.execute(get);
			int statusCode = response.getStatusLine().getStatusCode();
			
			if(statusCode >= 400) {
				
				log.error("Failed to request checksum.txt. Response code -> " + statusCode);
				return;
			}
			
			String responseText = EntityUtils.toString(response.getEntity());		
			
			String[] lines = responseText.split("\n");
			
			for(String line : lines)
			{
				line = line.trim();
				
				if(line.length() == 0){
					continue;
				}
				
				String[] parts = line.split(" ");
				
				
				String resource = parts[0];
				String md5 = parts[1];
				long length = -1;				
				try {
					length = Long.parseLong(parts[2]);
				} catch (Exception e) {
					// TODO Auto-generated catch block
					log.error(e);
				}
				
				UpdateFileEntry entry = new UpdateFileEntry(resource, md5, length);				
				
				
				File file = new File(updateDir + resource);
				
				if(!file.exists())
				{
					//check for entry
					file = new File(resource);
					if(!file.exists()){
						filesToUpdate.add(entry);
						continue;
					}					
					
				}
				
				
				FileInputStream fis = new FileInputStream(file);
				String checksum = DigestUtils.md5Hex(fis);
				
				log.info(String.format("Checking resource %s calculate checksum %s server checksum %s", resource, checksum, md5));
				
				if(!checksum.equals(md5))
				{
					filesToUpdate.add(entry);
				}				
			}
			
			if(filesToUpdate.isEmpty())
			{
				log.info("No updates found!");
				return;
			}
			
			//confirm download
			if(!beforeUpdate())
			{
				return;
			}
			
			downloadFiles(filesToUpdate);					
			
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw new UpdaterException(e);
		} 
		finally
		{
			try {
				client.close();
			} catch (IOException e) {
				log.error(e);
			}
			
			log.info("Stopping updater ..");
		}		
		
	}
	
	public boolean beforeUpdate()
	{
		return true;
	}
	
	public boolean afterUpdate()
	{
		return true;
	}
	
	public void downloadFiles(ArrayList<UpdateFileEntry> entries)
	{
		CloseableHttpClient client = NetworkUtils.getHttpClientInstance();
		HttpGet get = null;
		HttpResponse response = null;
		
		try 
		{
			// download and apply updates
			for(UpdateFileEntry entry : entries)
			{
				log.info(String.format("Downloading %s ..", entry.getFilename()));
				
				get = new HttpGet( remoteUpdateDirectoryUrl + "/" + entry.getFilename());				
				response = client.execute(get);
							
				HttpEntity entity = response.getEntity();
				if (entity != null) {
				    
					InputStream inputStream = entity.getContent();
					
					File file = new File(updateDir + entry.getFilename());
					file.getParentFile().mkdirs();  
				    
				    BufferedInputStream bis = new BufferedInputStream(inputStream);
				    BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file));
				    int inByte;
				    while ((inByte = bis.read()) != -1 ) {
				    	bos.write(inByte);
				    }
				    
				    bis.close();
				    bos.close();
				}
				
				log.info(String.format("Successfully updated %s", entry.getFilename()));
				
				afterUpdate();	
			}
		} 
		catch (Exception e) 
		{
			log.error(e);
		} 
		finally
		{
			try {
				client.close();
			} catch (IOException e) {
				log.error(e);
			}
		}
	}
	
	public void setRestartFlag()
	{
		try 
		{
			FileWriter fw = new FileWriter(RESTART_FLAG);
			fw.write("Restart");
			fw.close();
		} 
		catch (IOException e) 
		{
			log.error(e);
		}
	}
	
	public void removeRestartFlag()
	{
		File flag = new File(RESTART_FLAG);
		if(flag.exists()){
			flag.delete();
		}
	}
	
	public static void main(String[] args) throws UpdaterException
	{
		Updater updater = new Updater();
		updater.start();
	}
	
	class UpdateFileEntry
	{
		private String filename;
		private String md5;
		private long length;
		
		public UpdateFileEntry(String filename, String md5, long length)
		{
			this.filename = filename;
			this.md5 = md5;
			this.length = length;
		}

		public String getFilename() {
			return filename;
		}

		public void setFilename(String filename) {
			this.filename = filename;
		}

		public long getLength() {
			return length;
		}

		public void setLength(long length) {
			this.length = length;
		}

		public String getMd5() {
			return md5;
		}

		public void setMd5(String md5) {
			this.md5 = md5;
		}		
		
	}

	public String getServerAddress() {
		return serverAddress;
	}

	public void setServerAddress(String serverAddress) {
		this.serverAddress = serverAddress;
	}

	public String getUpdateDir() {
		return updateDir;
	}

	public void setUpdateDir(String updateDir) {
		this.updateDir = updateDir;
	}

	public String getRemoteUpdateDirectoryUrl() {
		return remoteUpdateDirectoryUrl;
	}

	public void setRemoteUpdateDirectoryUrl(String remoteUpdateDirectoryUrl) {
		this.remoteUpdateDirectoryUrl = remoteUpdateDirectoryUrl;
	}	

}
