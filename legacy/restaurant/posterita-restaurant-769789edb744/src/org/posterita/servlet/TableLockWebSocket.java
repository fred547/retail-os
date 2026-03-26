package org.posterita.servlet;

import java.io.IOException;

import org.apache.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketError;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.json.JSONObject;
import org.posterita.model.TableLock;

@WebSocket(maxIdleTime = Integer.MAX_VALUE)
public class TableLockWebSocket {
	
	private static Logger log = Logger.getLogger(TableLockWebSocket.class);
	
	private Session session;
	private String identifier;
 
    // called when the socket connection with the browser is established
    @OnWebSocketConnect
    public void handleConnect(Session session) {    	
    	this.session = session;    	
        log.info("Connected.");
    }
 
    // called when the connection closed
    @OnWebSocketClose
    public void handleClose(int statusCode, String reason) {
    	
    	if(identifier != null) {  
    		
    		log.info(String.format("Releasing locks for %s", identifier));
    		
    		TableLock.releaseLock(identifier);    		
    	}
    	
        log.info("Connection closed with statusCode=" + statusCode + ", reason=" + reason + ", identifier=" + identifier); 
        this.session = null;
    }
 
    // called when a message received from the browser
    @OnWebSocketMessage
    public void handleMessage(String message) {
    	try 
    	{    		
    		log.info(message);
    		
    		JSONObject json = new JSONObject(message);
    		
    		String action = json.getString("action");
    		
    		switch (action) {
			case "register": register(json);				
				break;

			default:
				break;
			}   		
    		
    	} 
    	catch (Exception e) {
			log.error(e);
		}
    }    

	// called in case of an error
    @OnWebSocketError
    public void handleError(Throwable error) {
        log.error(error);  
    } 
        
    /*
     	{
			"identifier" : uuid,
			"action" : "register"
		}
     */
    private void register(JSONObject json) throws Exception {
		
    	String identifier = json.getString("identifier");
    	this.identifier = identifier;
    	
    	log.info(String.format("New registration: %s", identifier));
    	
    	sendResponse(new JSONObject().put("registered", true).put("identifier", identifier));
		
	}
	
	private void sendResponse(JSONObject json) throws IOException {
	    	
    	if(this.session.isOpen()) {
    		this.session.getRemote().sendString(json.toString()); 
    	}
    }
    
}