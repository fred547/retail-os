package org.posterita.servlet;

import java.io.IOException;
import java.util.HashSet;

import org.apache.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketError;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.json.JSONObject;

@WebSocket(maxIdleTime = Integer.MAX_VALUE)
public class SystemWebSocket {
	
	private static Logger log = Logger.getLogger(SystemWebSocket.class);
			
	private static HashSet<Session> sessions = new HashSet<Session>();	
    private Session session;
 
    // called when the socket connection with the browser is established
    @OnWebSocketConnect
    public void handleConnect(Session session) {
    	
        this.session = session;
        sessions.add(session);
        
        handleMessage("test");
    }
 
    // called when the connection closed
    @OnWebSocketClose
    public void handleClose(int statusCode, String reason) {
        System.out.println("Connection closed with statusCode=" 
            + statusCode + ", reason=" + reason);
        
        sessions.remove(this.session);
    }
 
    // called when a message received from the browser
    @OnWebSocketMessage
    public void handleMessage(String message) {
    	try 
    	{
    		/*
    		{
  			  "identifier" : uuid,
  			  "type" : "onopen",
  			  "data" : {},
  			  "broadcast" : true
  		  	}
  		  	*/
    		
    		if(message.startsWith("{")) {
    			
    			JSONObject json  = new JSONObject(message); 
    			if(json.has("broadcast")) {
    				if(json.getBoolean("broadcast")) {
    					broadcastMessage(message);
    				}
    			}
    		}
    		else
    		{
    			this.session.getRemote().sendString("received");
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
    
    public static void broadcastMessage(String message) {
    	
    	for(Session session : sessions){
    		
    		try 
	        {
	            if (session.isOpen()) 
	            {
	                session.getRemote().sendString(message);
	            }
	        } 
	        catch (IOException e) 
	        {
	            log.error(e);
	        }
    	}
    	
    }
 
    /*
    // sends message to browser
    private void send(String message) {
        try 
        {
            if (session.isOpen()) 
            {
                session.getRemote().sendString(message);
            }
        } 
        catch (IOException e) 
        {
            e.printStackTrace();
        }
    }
 
    // closes the socket
    private void stop() {
        try 
        {
            session.disconnect();
        } 
        catch (IOException e) 
        {
            e.printStackTrace();
        }
    }
    */
}