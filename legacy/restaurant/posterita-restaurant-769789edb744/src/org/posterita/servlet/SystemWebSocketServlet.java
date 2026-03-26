package org.posterita.servlet;

import org.eclipse.jetty.websocket.servlet.WebSocketServlet;
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory;

public class SystemWebSocketServlet extends WebSocketServlet {
	 
    @Override
    public void configure(WebSocketServletFactory factory) {
        factory.register(SystemWebSocket.class);
    }
}
