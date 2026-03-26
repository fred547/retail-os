package org.posterita.util;

import java.io.IOException;

import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.log4j.Logger;
import org.posterita.config.Configuration;

public class OnlineServerMonitor
{
	private static Logger log = Logger.getLogger(OnlineServerMonitor.class);
	
	private int interval = 30 * 1000; // 30 secs
	private boolean stop = false; // flag to stop
	
	private boolean up = false;
	
	public OnlineServerMonitor()
	{
		
	}
	
	public void start1()
	{
		log.info("Starting server monitoring ...");
		
		Runnable r = new Runnable() {
			
			public void run() 
			{
				String serverAddress = Configuration.get(false).getServerAddress();
				String terminal = Configuration.get(false).getTerminalKey();
				
				//Note: always request a static resource
				
				serverAddress = serverAddress + "/version.txt?terminal=" + terminal + "&time=" + System.currentTimeMillis();
				
				int TIMEOUT = 10;
				
				HttpHead headMethod = null;					
				headMethod = new HttpHead(serverAddress);
				
				CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
				
				HttpResponse httpResponse = null;
				int statusCode = 0;
				
				boolean previousValue = false;
				
				
				do {
					
					try 
					{
						httpResponse = httpClient.execute(headMethod);
						statusCode = httpResponse.getStatusLine().getStatusCode();
  
						if (statusCode == HttpStatus.SC_OK) {
							
							up = true;
						}
					} 
					catch (Exception e) 
					{
						up = false;
					}
					finally
					{
						try {
							httpClient.close();
						} catch (IOException e) {
							log.error(e);
						}
					}
					
					if(previousValue != up)
					{						
						
						if(up)
						{
							log.info("Server is online ...");
						}
						else
						{
							log.info("Server went offline ...");
						}
						
						//notify state change
						serverStateChange(previousValue, up);
					}
					
					previousValue = up;
										
					try 
					{
						Thread.sleep(interval);
					} 
					catch (InterruptedException e) 
					{
						log.error(e);
					}
					
					
				} while(!stop);				
				
			}
		};
		
		Thread t = new Thread(r);
		t.start();		
		
	}
	
	public void stop()
	{
		this.stop = true;
		
		log.info("Stopping server monitoring ...");
	}
	
	public boolean isServerUp()
	{
		return up;
	}
	
	public void serverStateChange(boolean oldState, boolean newState)
	{
		
	}
		

}
