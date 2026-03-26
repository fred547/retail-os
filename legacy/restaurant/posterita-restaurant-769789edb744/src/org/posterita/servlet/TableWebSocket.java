package org.posterita.servlet;

import java.util.HashMap;

import org.apache.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketError;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.json.JSONObject;

@WebSocket(maxIdleTime = Integer.MAX_VALUE)
public class TableWebSocket {
	
	private static Logger log = Logger.getLogger(TableWebSocket.class);
			
	private static HashMap<Integer, Session> sessions = new HashMap<Integer, Session>();	
    
	private Session session;
	private Integer tableId = -1;
 
    // called when the socket connection with the browser is established
    @OnWebSocketConnect
    public void handleConnect(Session session) {    	
        this.session = session;        
        log.info("Connected.");
    }
 
    // called when the connection closed
    @OnWebSocketClose
    public void handleClose(int statusCode, String reason) {
        log.info("Connection closed with statusCode=" 
            + statusCode + ", reason=" + reason);
        
        log.info("Unlocking table -> " + tableId);
        
        sessions.remove(tableId);
    }
 
    // called when a message received from the browser
    @OnWebSocketMessage
    public void handleMessage(String message) {
    	try 
    	{
    		/*
    		 {
			  "identifier" : uuid,
			  "tableId" : tableId
		  	 }
    		 */
    		
    		log.info(message);
    		
    		JSONObject json = new JSONObject(message);
    		
    		int tableId = json.getInt("tableId");
    		
    		boolean isTableLocked = false;
    		
    		//check for table lock
    		Session previous = sessions.get(tableId);
    		
    		if(previous != null && !this.session.equals(previous)) {
    			
    			if(previous.isOpen()) {
    				isTableLocked = true;
    			}
    		}
    		
    		if(!isTableLocked) {
    			
    			log.info("Locking table -> " + tableId);
    			//overwrite previous session
				sessions.put(tableId, this.session);
    		}
    		
    		json = new JSONObject();
    		json.put("isTableLocked", isTableLocked);
    		
    		this.tableId = tableId;
    		
    		this.session.getRemote().sendString(json.toString());    		
    		
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
    
}