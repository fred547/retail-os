package org.posterita.util;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;

import javax.net.ssl.SSLException;

import org.apache.http.Header;
import org.apache.http.HttpEntityEnclosingRequest;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpRequest;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.HttpRequestRetryHandler;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicHeader;
import org.apache.http.protocol.HttpContext;
import org.apache.log4j.Logger;
import org.posterita.config.Configuration;

public class NetworkUtils 
{
	private static Logger log = Logger.getLogger(NetworkUtils.class);
	
	public static boolean validateURL(String url)
	{
		try 
		{
			new URL(url);
			
			return true;
		} 
		catch (MalformedURLException e) 
		{
			log.error(String.format("Invalid URL: %s.", url));
		}
		
		return false;
	}
	
	public static boolean isServerReachable(String serverAddress)
	{			
		HttpHead headMethod = null;					
		headMethod = new HttpHead(serverAddress);
		
		Configuration config = Configuration.get(false);
		
		String terminal = config.getTerminalKey();
		
		//Note: always request a static resource
		serverAddress = serverAddress + "/version.txt?terminal=" + terminal + "&time=" + System.currentTimeMillis();
						
		CloseableHttpClient httpClient = getHttpClientInstance( 20, 2 );
		
		try 
		{
			HttpResponse httpResponse = httpClient.execute(headMethod);
			int statusCode = httpResponse.getStatusLine().getStatusCode();
  
			if (statusCode == HttpStatus.SC_OK) {
				
				log.info("Server returned --> " + statusCode);
			    
			    return true;
			}
			
			headMethod.releaseConnection();
		} 
		catch (Exception e) {
			log.error(String.format("Failed to connect to server %s.", serverAddress));
		}
		finally
		{
			try {
				httpClient.close();
			} catch (IOException e) {
				log.error(e);
			}
		}		
    	
    	return false;    	
	  
	}
	
	public static boolean isServerReachable()
	{
		String serverAddress = Configuration.get(false).getServerAddress();
		
		return isServerReachable(serverAddress);
	}
	
	public static CloseableHttpClient getHttpClientInstance()
	{
		// 5 mins and 3 retires
		return getHttpClientInstance( 5 * 60 , 3 );
	}
	
	private static CloseableHttpClient getHttpClientInstance(int timeout, int retries ) {
		
		RequestConfig requestConfig = RequestConfig.custom()
				.setSocketTimeout(timeout * 1000)
				.setConnectTimeout(timeout * 1000)				
				.setConnectionRequestTimeout(timeout * 1000)
				.build();
		
		HttpRequestRetryHandler retryHandler = new HttpRequestRetryHandler(){
			
			public boolean retryRequest(IOException exception, int executionCount, HttpContext context) {				

	            if (executionCount >= retries) {
	                // Do not retry if over max retry count
	                return false;
	            }
	            if (exception instanceof InterruptedIOException) {
	                // Timeout
	                return false;
	            }
	            if (exception instanceof UnknownHostException) {
	                // Unknown host
	                return false;
	            }
	            if (exception instanceof SSLException) {
	                // SSL handshake exception
	                return false;
	            }
	            
	            HttpClientContext clientContext = HttpClientContext.adapt(context);
	            HttpRequest request = clientContext.getRequest();
	            
	            log.info("try request: " + executionCount + " " + request);
	            
	            boolean idempotent = !(request instanceof HttpEntityEnclosingRequest);
	            
	            if (idempotent) {
	                // Retry if the request is considered idempotent
	                return true;
	            }
	           
				return false;
			}};
			
		
			// close connections after request
			// https://doc.nuxeo.com/blog/using-httpclient-properly-avoid-closewait-tcp-connections/
			// https://aspnetmonsters.com/2016/08/2016-08-27-httpclientwrong/
			Header header = new BasicHeader(HttpHeaders.CONNECTION, "close");
			List<Header> defaultHeaders = Arrays.asList(header);
			
			CloseableHttpClient httpClient = HttpClients.custom()
                .setRetryHandler(retryHandler)
                .setDefaultRequestConfig(requestConfig)
                .setDefaultHeaders(defaultHeaders)
                .build();
		
		return httpClient;
	}

}
