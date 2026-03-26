package org.posterita.util;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.logging.Logger;

import org.apache.http.HttpEntity;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.exception.EmailException;

public class SendInBlueBuilder {
	
	private Logger log = Logger.getLogger(SendInBlueBuilder.class.getName());
	
	private String apiKey;
	private String subject, htmlContent;
	private Pair sender;
	private ArrayList<Pair> to = new ArrayList<Pair>();
	private ArrayList<Pair> bcc = new ArrayList<Pair>();
	private ArrayList<Pair> cc = new ArrayList<Pair>();
	private String payload;
	private String response;
	private int responseCode;
	private ArrayList<Param> params = new ArrayList<Param>();
	private ArrayList<Attachment> attachments = new ArrayList<Attachment>();
	
	private SendInBlueBuilder(){		
	}
	
	public static SendInBlueBuilder getInstance(){
		return new SendInBlueBuilder();
	}
		
	public SendInBlueBuilder apiKey(String apiKey) {
		
		this.apiKey = apiKey;
		
		return this;
	}
	
	public SendInBlueBuilder subject(String subject) {
		
		this.subject = subject;
		
		return this;
	}
	
	public SendInBlueBuilder htmlContent(String htmlContent) {
		
		this.htmlContent = htmlContent;
		
		return this;
	}

	public SendInBlueBuilder sender(String email, String name) throws EmailException {
		
		if(!EmailValidator.isValidEmail(email)) {
			throw new EmailException(String.format("Invalid email - %s", email));
		}
		
		this.sender = new Pair(email, name);
		
		return this;
	}

	public SendInBlueBuilder to(String email, String name) throws EmailException {
		
		if(!EmailValidator.isValidEmail(email)) {
			throw new EmailException(String.format("Invalid email - %s", email));
		}
		
		this.to.add(new Pair(email, name));
		
		return this;
	}
	
	public SendInBlueBuilder to(String email) throws EmailException {
		
		return to(email, email);
	}
	
	public SendInBlueBuilder bcc(String email, String name) throws EmailException {
		
		if(!EmailValidator.isValidEmail(email)) {
			throw new EmailException(String.format("Invalid email - %s", email));
		}
		
		this.bcc.add(new Pair(email, name));
		
		return this;
	}

	public SendInBlueBuilder cc(String email, String name) throws EmailException {
	
		if(!EmailValidator.isValidEmail(email)) {
			throw new EmailException(String.format("Invalid email - %s", email));
		}
		
		this.cc.add(new Pair(email, name));
		
		return this;
	}
	
	public SendInBlueBuilder param(String name, String value) throws EmailException {
		
		this.params.add(new Param(name, value));
		
		return this;
	}
	
	public SendInBlueBuilder attachUrl(String name, String url) throws EmailException {
		
		this.attachments.add(new Attachment(name, url, null));
		
		return this;
	}

	public SendInBlueBuilder attachContent(String name, String content) throws EmailException {
	
		this.attachments.add(new Attachment(name, null, content));
		
		return this;
	}
	
	public SendInBlueBuilder build() throws EmailException {
		
		try 
		{
			if(apiKey == null) throw new EmailException("API KEY is required!");
			if(subject == null) throw new EmailException("Subject is required!");
			if(sender == null) throw new EmailException("Sender is required!");
			if(htmlContent == null) throw new EmailException("Html content is required!");
			if(to.size() == 0) throw new EmailException("To is required!");
				
			JSONObject senderJson = new JSONObject();
			senderJson.put("email", sender.email);
			if(sender.name != null) senderJson.put("name", sender.name);
			
			JSONArray toJsonArray = new JSONArray();
			JSONObject toJson;
			for(Pair p : to) {
				toJson = new JSONObject();
				toJson.put("email", p.email);
				if(p.name != null) toJson.put("name", p.name);
				toJsonArray.put(toJson);
			}			
			
			JSONObject payloadJson = new JSONObject();			
			payloadJson.put("subject", this.subject);
			payloadJson.put("htmlContent", this.htmlContent);						
			payloadJson.put("sender", senderJson);
			payloadJson.put("to", toJsonArray);
			
			//add bcc if any
			if(bcc.size() > 0) {				
				JSONArray bccJsonArray = new JSONArray();
				JSONObject bccJson;
				for(Pair p : bcc) {
					bccJson = new JSONObject();
					bccJson.put("email", p.email);
					if(p.name != null) bccJson.put("name", p.name);
					bccJsonArray.put(bccJson);
				}
				
				payloadJson.put("bcc", bccJsonArray);
			}
			
			//add cc if any
			if(cc.size() > 0) {				
				JSONArray ccJsonArray = new JSONArray();
				JSONObject ccJson;
				for(Pair p : cc) {
					ccJson = new JSONObject();
					ccJson.put("email", p.email);
					if(p.name != null) ccJson.put("name", p.name);
					ccJsonArray.put(ccJson);
				}	
				
				payloadJson.put("cc", ccJsonArray);
			}
			
			//add params if any
			if(params.size() > 0){
				
				JSONObject paramsJson = new JSONObject();
				
				for(Param p : params) {
					paramsJson.put(p.name, p.value);
				}
				
				payloadJson.put("params", paramsJson);
				
			}
			
			//add attachments if any
			if(attachments.size() > 0){
				
				JSONArray attachmentJsonArray = new JSONArray();
				JSONObject attachmentJson;
				
				for(Attachment a : attachments) {
					
					attachmentJson = new JSONObject();
					attachmentJson.put("name", a.name);
					
					if(a.content != null) {
						attachmentJson.put("content", a.content);
					}
					
					if(a.url != null) {
						attachmentJson.put("url", a.url);
					}
					
					attachmentJsonArray.put(attachmentJson);
				}
				
				payloadJson.put("attachment", attachmentJsonArray);
				
			}
			
			this.payload = payloadJson.toString();
			
		} catch (JSONException e) 
		{
			throw new EmailException(e);
		}
		
		return this;
	}
	
	public boolean sendTransactionalEmail() throws EmailException {
		
		CloseableHttpClient httpClient = NetworkUtils.getHttpClientInstance();
		
		int statusCode;
		String responseStr;
		
		try 
		{
			HttpPost post = new HttpPost("https://api.sendinblue.com/v3/smtp/email");			
			post.addHeader("Accept", "application/json");
			post.addHeader("Api-Key", this.apiKey);
			post.addHeader("Content-Type", "application/json");
			post.setEntity(new StringEntity(this.payload));
			
			log.info(String.format("Payload: %s", this.payload));

			CloseableHttpResponse  resp = httpClient.execute(post);
	        
	        StatusLine status = resp.getStatusLine();
	        statusCode = status.getStatusCode();
			log.info(String.format("Status Code: %d", statusCode));
			
			HttpEntity entity = resp.getEntity();
	        responseStr = EntityUtils.toString(entity);	
			EntityUtils.consume(entity);
			
			log.info(String.format("Response: %s", responseStr));
			
			this.response = responseStr;
			this.responseCode = statusCode;			
			
			
			if(!Arrays.asList(200, 201, 202, 204).contains(statusCode)) {
				throw new EmailException(responseStr);
			}
			
		} catch (Exception e) {
			throw new EmailException("Failed to send email", e);
		}
		
		return true;
	}	
	
	public String getResponse() {
		return response;
	}
	
	public int getResponseCode() {
		return responseCode;
	}

	class Pair {
		String email, name;
		
		Pair(String email, String name) {
			this.email = email;
			this.name = name;
		}
	}
	
	class Param {
		String name, value;
		
		Param(String name, String value) {
			this.name = name;
			this.value = value;
		}
	}
	
	class Attachment {
		String name, url, content;
		
		Attachment(String name, String url, String content) {
			this.name = name;
			this.url = url;
			this.content = content;
		}
	}


}
