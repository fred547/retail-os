package org.posterita.online;

import java.util.ArrayList;
import java.util.List;

import org.apache.http.HttpEntity;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.exception.ServerUnavailableException;
import org.posterita.util.NetworkUtils;

public class OnlineServiceExecutor 
{
	private static Logger log = Logger.getLogger(OnlineServiceExecutor.class);
			
	private String serviceURI;
	private Configuration configuration;
	
	public OnlineServiceExecutor(String serviceURI)
	{
		this.serviceURI = serviceURI;
		this.configuration = Configuration.get(false);
	}
	
	public String excecute(String json) throws ServerUnavailableException, Exception
	{
		if(json == null || json.trim().length() == 0)
		{
			throw new Exception("Invalid request");
		}
		
		log.info("Online service [" + serviceURI + "]: " + json);
		
    	//1. check server availability
    	boolean isServerReachable = NetworkUtils.isServerReachable();
    	if(!isServerReachable)
    	{
    		throw new ServerUnavailableException("Server is unreachable");
    	}
    	
		String serviceURL = configuration.getServerAddress() + serviceURI;    	
		
		String merchantKey = configuration.getMerchantKey();
		String terminalKey = configuration.getTerminalKey();
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
		
		try 
		{	
			
			JSONObject jsonObj = new JSONObject(json);
			
			if( ! jsonObj.has("merchantKey"))
			{
				jsonObj.put("merchantKey", merchantKey);
			}
			
			if( ! jsonObj.has("terminalKey"))
			{
				jsonObj.put("terminalKey", terminalKey);	
			}
						
			List <NameValuePair> nvps = new ArrayList <NameValuePair>();
			nvps.add(new BasicNameValuePair("json", jsonObj.toString()));
			
			HttpPost post = new HttpPost(serviceURL);
	        post.setEntity(new UrlEncodedFormEntity(nvps));
			
	        CloseableHttpResponse  resp = httpClient.execute(post);
	        HttpEntity entity = resp.getEntity();
	        
			String responseText = EntityUtils.toString(entity);
			
			EntityUtils.consume(entity);
			
			resp.close();
			
			return responseText;
		} 
		catch (Exception e) 
		{
			log.error(e);
			
			throw e;
		}
		finally
		{
			try {
				httpClient.close();
			} catch (Exception e) {
				log.error(e);
			}
		}
	}
	
	public static void main(String[] args) 
	{
		
	}

}
