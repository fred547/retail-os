package org.posterita.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import org.apache.http.Consts;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.exception.ConfigurationException;
import org.posterita.exception.InvalidAccountException;
import org.posterita.exception.InvalidServerException;
import org.posterita.exception.InvalidServerResponseException;
import org.posterita.exception.ReinstallationAccountException;
import org.posterita.exception.ServerUnavailableException;
import org.posterita.util.NetworkUtils;

public class Configuration 
{
	protected static Logger log = Logger.getLogger(Configuration.class);
	
	private static Configuration instance;
	
	private static final String SERVER_ADDRESS = "server-address";
	private static final String DOMAIN = "domain";
	private static final String MERCHANT_KEY = "merchant-key";
	private static final String TERMINAL_KEY = "terminal-key";
	
	//flags for synchronizer
	private static final String PUSH_DATA = "push-data";
	private static final String PULL_DATA = "pull-data";
	
	private static final String CONFIG_FILENAME = "posterita.conf";
	private Properties config;
	
	public Configuration()
	{		
		config = new Properties();
		
		try 
		{
			File file = new File(getConfigurationFilePath());
			
			if(file.exists())
			{
				config.load(new FileInputStream(file));
			}
			
		} 
		catch (FileNotFoundException e) 
		{
			// TODO Auto-generated catch block
			log.error(e);
		} 
		catch (IOException e) {
			// TODO Auto-generated catch block
			log.error(e);
		}
	}
	
	public static boolean isConfigured()
	{
		File file = new File(getConfigurationFilePath());
		
		if(file.exists()){
			return true;
		}
		
		return false;
	}
	
	public static Configuration get()
	{
		return get(false);
	}
	
	public static Configuration get(boolean reload)
	{
		if(instance == null || reload)
		{
			instance = new Configuration();
		}
		
		return instance;
	}
	
	public void save() throws ConfigurationException
	{
		try 
		{
			FileOutputStream fos = new FileOutputStream(getConfigurationFilePath());
			this.config.store(fos, "-- Posterita Configurations --");
		} 
		catch (Exception e) {
			log.error(e);
			throw new ConfigurationException("Failed to save configuration file", e);
		}
	}
	
	public void test() throws InvalidServerException, ServerUnavailableException, InvalidServerResponseException, InvalidAccountException, ReinstallationAccountException
	{		
		String serverAddress = getServerAddress();
		
		// validate URL
		if( !NetworkUtils.validateURL(serverAddress) )
		{
			throw new InvalidServerException("Invalid Server URL : " + serverAddress + "");
		}
		
		// test connection
		if( !NetworkUtils.isServerReachable(serverAddress) )
		{
			throw new ServerUnavailableException("Unable to connect to : " + serverAddress + "");
		}
		
		// test account
		String merchantKey = getMerchantKey();
		String terminalKey = getTerminalKey();
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();	
		HttpPost post = new HttpPost(serverAddress + "/OfflineDataAction.do");
		
		List <NameValuePair> nvps = new ArrayList <NameValuePair>();
		
        nvps.add(new BasicNameValuePair("action", "testConfiguration"));
        nvps.add(new BasicNameValuePair("merchantKey", merchantKey));
        nvps.add(new BasicNameValuePair("terminalKey", terminalKey));

        post.setEntity(new UrlEncodedFormEntity(nvps, Consts.UTF_8));
        
        JSONObject responseJSON = null;
        
        try 
        {
			HttpResponse  response = httpClient.execute(post);
			String responseText = EntityUtils.toString(response.getEntity());
			
			// test response
			if(!responseText.startsWith("{"))
			{
				throw new InvalidServerResponseException("Invalid server response");
			}
			
			responseJSON = new JSONObject(responseText);
			
			String status = responseJSON.getString("status");
			if("ok".equals(status))
			{
				String domain = responseJSON.getString("domain");				
				this.setDomain(domain);
				
				//check re-installation flag
				String offline = responseJSON.getString("offline");
				if("Y".equals(offline))
				{
					throw new ReinstallationAccountException("Terminal Key already used!");
				}
				
			}
			else
			{
				String error = responseJSON.getString("error-message");
				throw new InvalidAccountException(error);
			}
		} 
        
		catch (InvalidServerResponseException e) 
		{
			throw e;
		} 
        
        catch (ReinstallationAccountException e) 
		{
        	throw e;
		} 
        
        catch (InvalidAccountException e) 
		{
        	throw e;
		} 
        
        catch (JSONException e)
		{
        	log.error(e);
			throw new InvalidServerException(e);
		}
        
        catch (Exception e)
		{
        	log.error(e);
        	throw new ServerUnavailableException(e);
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
	
	private static String getConfigurationFilePath()
	{
		String dir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");
		
		String path = dir + separator + CONFIG_FILENAME;
		
		return path;
	}
	
	public String getServerAddress()
	{
		return this.config.getProperty(SERVER_ADDRESS);
	}
	
	public void setServerAddress(String address)
	{
		this.config.setProperty(SERVER_ADDRESS, address);
	}
	
	public String getDomain()
	{
		return this.config.getProperty(DOMAIN);
	}
	
	public void setDomain(String domain)
	{
		this.config.setProperty(DOMAIN, domain);
	}
	
	public String getMerchantKey()
	{
		return this.config.getProperty(MERCHANT_KEY);
	}
	
	public void setMerchantKey(String key)
	{
		this.config.setProperty(MERCHANT_KEY, key);
	}
	
	public String getTerminalKey()
	{
		return this.config.getProperty(TERMINAL_KEY);
	}
	
	public void setTerminalKey(String key)
	{
		this.config.setProperty(TERMINAL_KEY, key);
	}
	
	public String getPullData()
	{
		String pull = this.config.getProperty(PULL_DATA);
		
		if(pull == null) pull = "Y";
		
		return pull;
	}
	
	public void setPullData(String key)
	{
		this.config.setProperty(PULL_DATA, key);
	}
	
	public String getPushData()
	{
		String push = this.config.getProperty(PUSH_DATA);
		
		if(push == null) push = "Y";
		
		return push;
	}
	
	public void setPushData(String key)
	{
		this.config.setProperty(PUSH_DATA, key);
	}
	
	public static void main(String[] args) throws Exception
	{
		Configuration conf = new Configuration();
		
		/*
		conf.setServerAddress("https://my.posterita.com");
		conf.setDomain("Endjoy");
		conf.setMerchantKey("10004778");
		conf.setTerminalKey("10005855");
		conf.setPushData("N");
		conf.setPullData("N");
		conf.save();
		*/		
		
		System.out.println(conf.getPushData());
	}

}
