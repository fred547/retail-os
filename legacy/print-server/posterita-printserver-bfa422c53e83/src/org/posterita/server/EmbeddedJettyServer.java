package org.posterita.server;

import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.HttpConfiguration;
import org.eclipse.jetty.server.HttpConnectionFactory;
import org.eclipse.jetty.server.SecureRequestCustomizer;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.server.SslConnectionFactory;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.posterita.exception.EmbeddedJettyServerException;
import org.posterita.servlet.HomeServlet;
import org.posterita.servlet.PrinterServlet;


public class EmbeddedJettyServer 
{
	private Server server;
	
	public EmbeddedJettyServer()	{
		init();
	}
	
	private void init()	{	
		
		ServletContextHandler home = new ServletContextHandler(ServletContextHandler.SESSIONS);
        home.setContextPath("/");
        home.addServlet(new ServletHolder(new HomeServlet()),"/*");
		
		ServletContextHandler printer = new ServletContextHandler(ServletContextHandler.SESSIONS);
        printer.setContextPath("/printing");
        printer.addServlet(new ServletHolder(new PrinterServlet()),"/*");
                
        ContextHandlerCollection contexts = new ContextHandlerCollection();
        contexts.setHandlers(new Handler[] { printer, home });
                                
		server = new Server();
        server.setHandler(contexts);
        
        ServerConnector connector = new ServerConnector(server);

        connector.setPort(9998);

        HttpConfiguration https = new HttpConfiguration();

        https.addCustomizer(new SecureRequestCustomizer());

        SslContextFactory sslContextFactory = new SslContextFactory();

       sslContextFactory.setKeyStorePath(EmbeddedJettyServer.class.getResource("/keystore.jks").toExternalForm());

       sslContextFactory.setKeyStorePassword("p05t3r1t4");

       sslContextFactory.setKeyManagerPassword("p05t3r1t4");

       ServerConnector sslConnector = new ServerConnector(server,

               new SslConnectionFactory(sslContextFactory, "http/1.1"),

               new HttpConnectionFactory(https));

       sslConnector.setPort(9999);

       server.setConnectors(new Connector[] { connector, sslConnector });
		
	}
	
	public void start() throws EmbeddedJettyServerException	{
		try 
		{
			server.start();
		} 
		catch (Exception e) {
			throw new EmbeddedJettyServerException("Failed to start Jetty server", e);
		}
	}
	
	public void stop() throws EmbeddedJettyServerException	{
		try {
			server.stop();
		} 
		catch (Exception e) {
			throw new EmbeddedJettyServerException("Failed to stop Jetty server", e);
		}
	}
	
	public Server getServer(){
		return server;
	}
	
	public static void main(String[] args) throws Exception
	{  	        
		EmbeddedJettyServer server = new EmbeddedJettyServer();        
        server.start();        
        server.getServer().join();
	}

}
