package org.posterita.server;

import java.util.Collections;
import java.util.EnumSet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import javax.servlet.DispatcherType;

import org.apache.log4j.Logger;
import org.eclipse.jetty.security.ConstraintMapping;
import org.eclipse.jetty.security.ConstraintSecurityHandler;
import org.eclipse.jetty.security.HashLoginService;
import org.eclipse.jetty.security.LoginService;
import org.eclipse.jetty.security.authentication.BasicAuthenticator;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.security.Constraint;
import org.eclipse.jetty.util.security.Password;
import org.eclipse.jetty.webapp.WebAppContext;
import org.posterita.database.Database;
import org.posterita.database.DatabaseSynchronizer;
import org.posterita.exception.DocumentNoSynchronizationException;
import org.posterita.exception.EmbeddedJettyServerException;
import org.posterita.exception.OrderSynchronizationException;
import org.posterita.model.Application;
import org.posterita.servlet.ClockInOutServlet;
import org.posterita.servlet.JSONServlet;
import org.posterita.servlet.LogServlet;
import org.posterita.servlet.OnlineServlet;
import org.posterita.servlet.OrderHistoryServlet;
import org.posterita.servlet.OrderServlet;
import org.posterita.servlet.PrinterServlet;
import org.posterita.servlet.ProductServlet;
import org.posterita.servlet.ReportServlet;
import org.posterita.servlet.ResourceFilter;
import org.posterita.servlet.RestaurantServlet;
import org.posterita.servlet.SqlServlet;
import org.posterita.servlet.StockServlet;
import org.posterita.servlet.SynchronizeServlet;
import org.posterita.servlet.SystemServlet;
import org.posterita.servlet.SystemWebSocketServlet;
import org.posterita.servlet.TableLockWebSocketServlet;
import org.posterita.servlet.TableWebSocketServlet;
import org.posterita.servlet.TillServlet;
import org.posterita.test.FixData;


public class EmbeddedJettyServer 
{
	private static final Logger log = Logger.getLogger(EmbeddedJettyServer.class);
	
	private Server server;	
	
	public EmbeddedJettyServer()	{
		init();
	}
	
	private void init()	{
		
		log.info("Initializing server ...");
		
		String dir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");
		
		//String path = dir + separator + "web";	
		String path = dir + separator + "webapps" + separator + "posterita.war";		
                
		WebAppContext webapp = new WebAppContext();
		webapp.setWar(path);
		webapp.setContextPath("/");
		webapp.setParentLoaderPriority(true);
		webapp.addFilter(ResourceFilter.class, "/*", EnumSet.of(DispatcherType.INCLUDE,DispatcherType.REQUEST));
		
		
		ServletContextHandler json = new ServletContextHandler(ServletContextHandler.SESSIONS);
        json.setContextPath("/json");
        json.addServlet(new ServletHolder(new JSONServlet()),"/*");
        
        ServletContextHandler online = new ServletContextHandler(ServletContextHandler.SESSIONS);
        online.setContextPath("/service");
        online.addServlet(new ServletHolder(new OnlineServlet()),"/*");
        
        ServletContextHandler clockinout = new ServletContextHandler(ServletContextHandler.SESSIONS);
        clockinout.setContextPath("/clockinout");
        clockinout.addServlet(new ServletHolder(new ClockInOutServlet()),"/*");
        
        ServletContextHandler till = new ServletContextHandler(ServletContextHandler.SESSIONS);
        till.setContextPath("/till");
        till.addServlet(new ServletHolder(new TillServlet()),"/*");
        
        ServletContextHandler synchronize = new ServletContextHandler(ServletContextHandler.SESSIONS);
        synchronize.setContextPath("/synchronize");
        synchronize.addServlet(new ServletHolder(new SynchronizeServlet()),"/*");
        
        ServletContextHandler printer = new ServletContextHandler(ServletContextHandler.SESSIONS);
        printer.setContextPath("/printing");
        printer.addServlet(new ServletHolder(new PrinterServlet()),"/*");
        
        ServletContextHandler product = new ServletContextHandler(ServletContextHandler.SESSIONS);
        product.setContextPath("/product");
        product.addServlet(new ServletHolder(new ProductServlet()),"/*");
        
        ServletContextHandler orderHistory = new ServletContextHandler(ServletContextHandler.SESSIONS);
        orderHistory.setContextPath("/orderHistory");
        orderHistory.addServlet(new ServletHolder(new OrderHistoryServlet()),"/*");
        
        ServletContextHandler system = new ServletContextHandler(ServletContextHandler.SESSIONS);
        system.setContextPath("/system");
        system.addServlet(new ServletHolder(new SystemServlet()),"/*");
        
        ServletContextHandler websocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        websocket.setContextPath("/websocket");
        websocket.addServlet(new ServletHolder(new SystemWebSocketServlet()),"/*");
        
        ServletContextHandler stock = new ServletContextHandler(ServletContextHandler.SESSIONS);
        stock.setContextPath("/stock");
        stock.addServlet(new ServletHolder(new StockServlet()),"/*");
        
        ServletContextHandler report = new ServletContextHandler(ServletContextHandler.SESSIONS);
        report.setContextPath("/report");
        report.addServlet(new ServletHolder(new ReportServlet()),"/*");
        
        ServletContextHandler sql = new ServletContextHandler(ServletContextHandler.SESSIONS);
        sql.setContextPath("/sql");
        sql.addServlet(new ServletHolder(new SqlServlet()),"/*");
        
        ServletContextHandler log = new ServletContextHandler(ServletContextHandler.SESSIONS);
        log.setContextPath("/log");
        log.addServlet(new ServletHolder(new LogServlet()),"/*");
        
        ServletContextHandler order = new ServletContextHandler(ServletContextHandler.SESSIONS);
        order.setContextPath("/order");
        order.addServlet(new ServletHolder(new OrderServlet()),"/*");
        
        /* restaurant */
        ServletContextHandler tables = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tables.setContextPath("/restaurant");
        tables.addServlet(new ServletHolder(new RestaurantServlet()),"/*");
        
        ServletContextHandler tableWebsocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tableWebsocket.setContextPath("/table-websocket");
        tableWebsocket.addServlet(new ServletHolder(new TableWebSocketServlet()),"/*");
        
        ServletContextHandler tableLockWebsocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tableLockWebsocket.setContextPath("/table-lock-websocket");
        tableLockWebsocket.addServlet(new ServletHolder(new TableLockWebSocketServlet()),"/*");
        
        server = new Server(8888);
        server.setAttribute("org.eclipse.jetty.server.Request.maxFormContentSize", 4000000);
        
        HashLoginService loginService = new HashLoginService("Administrator");
        loginService.putUser("SuperUser", new Password("p05t3r1t4"), new String[] {"admin"});
        
        server.addBean(loginService);
        
        ConstraintSecurityHandler security = new ConstraintSecurityHandler();
        
        Constraint constraint = new Constraint();
        constraint.setName("auth");
        constraint.setAuthenticate(true);
        constraint.setRoles(new String[] { "admin" });

        ConstraintMapping mapping = new ConstraintMapping();
        mapping.setPathSpec("/admin/*");
        mapping.setConstraint(constraint);

        security.setConstraintMappings(Collections.singletonList(mapping));
        security.setAuthenticator(new BasicAuthenticator());
        security.setLoginService(loginService);
        
        // chain the hello handler into the security handler
        security.setHandler(webapp);
        
        ContextHandlerCollection contexts = new ContextHandlerCollection();
        contexts.setHandlers(new Handler[] { tables, order, log, sql, security, system, json, online, /*webapp,*/ clockinout, till, synchronize, printer, product, orderHistory, websocket, tableWebsocket, stock, report, tableLockWebsocket });
                                
		
        server.setHandler(contexts);
	}
	
	public void start() throws EmbeddedJettyServerException	{
		try {
			server.start();
		} 
		catch (Exception e) {
			log.error(e);
			throw new EmbeddedJettyServerException("Failed to start Jetty server", e);
		}
	}
	
	public void stop() throws EmbeddedJettyServerException	{
		try {
			server.stop();
		} 
		catch (Exception e) {
			log.error(e);
			throw new EmbeddedJettyServerException("Failed to stop Jetty server", e);
		}
	}
	
	public static void main(String[] args) throws Exception
	{
		Database.initialize();		
		FixData.fix();
		
		String dir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");		
		String path = dir + separator + "web";		
                
		WebAppContext webapp = new WebAppContext();
		webapp.setResourceBase(path);
		webapp.setContextPath("/");
		webapp.setParentLoaderPriority(true);	
		webapp.addFilter(ResourceFilter.class, "/*", EnumSet.of(DispatcherType.INCLUDE,DispatcherType.REQUEST));
		
		ServletContextHandler json = new ServletContextHandler(ServletContextHandler.SESSIONS);
        json.setContextPath("/json");
        json.addServlet(new ServletHolder(new JSONServlet()),"/*");
        
        ServletContextHandler online = new ServletContextHandler(ServletContextHandler.SESSIONS);
        online.setContextPath("/service");
        online.addServlet(new ServletHolder(new OnlineServlet()),"/*");
        
        ServletContextHandler clockinout = new ServletContextHandler(ServletContextHandler.SESSIONS);
        clockinout.setContextPath("/clockinout");
        clockinout.addServlet(new ServletHolder(new ClockInOutServlet()),"/*");
        
        ServletContextHandler till = new ServletContextHandler(ServletContextHandler.SESSIONS);
        till.setContextPath("/till");
        till.addServlet(new ServletHolder(new TillServlet()),"/*");
        
        ServletContextHandler synchronize = new ServletContextHandler(ServletContextHandler.SESSIONS);
        synchronize.setContextPath("/synchronize");
        synchronize.addServlet(new ServletHolder(new SynchronizeServlet()),"/*");
        
        ServletContextHandler printer = new ServletContextHandler(ServletContextHandler.SESSIONS);
        printer.setContextPath("/printing");
        printer.addServlet(new ServletHolder(new PrinterServlet()),"/*");
        
        ServletContextHandler product = new ServletContextHandler(ServletContextHandler.SESSIONS);
        product.setContextPath("/product");
        product.addServlet(new ServletHolder(new ProductServlet()),"/*");
        
        ServletContextHandler orderHistory = new ServletContextHandler(ServletContextHandler.SESSIONS);
        orderHistory.setContextPath("/orderHistory");
        orderHistory.addServlet(new ServletHolder(new OrderHistoryServlet()),"/*");
        
        ServletContextHandler system = new ServletContextHandler(ServletContextHandler.SESSIONS);
        system.setContextPath("/system");
        system.addServlet(new ServletHolder(new SystemServlet()),"/*");
        
        ServletContextHandler websocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        websocket.setContextPath("/websocket");
        websocket.addServlet(new ServletHolder(new SystemWebSocketServlet()),"/*");
        
        ServletContextHandler stock = new ServletContextHandler(ServletContextHandler.SESSIONS);
        stock.setContextPath("/stock");
        stock.addServlet(new ServletHolder(new StockServlet()),"/*");
        
        ServletContextHandler report = new ServletContextHandler(ServletContextHandler.SESSIONS);
        report.setContextPath("/report");
        report.addServlet(new ServletHolder(new ReportServlet()),"/*");
        
        ServletContextHandler sql = new ServletContextHandler(ServletContextHandler.SESSIONS);
        sql.setContextPath("/sql");
        sql.addServlet(new ServletHolder(new SqlServlet()),"/*");
        
        ServletContextHandler logger = new ServletContextHandler(ServletContextHandler.SESSIONS);
        logger.setContextPath("/log");
        logger.addServlet(new ServletHolder(new LogServlet()),"/*");
        
        ServletContextHandler order = new ServletContextHandler(ServletContextHandler.SESSIONS);
        order.setContextPath("/order");
        order.addServlet(new ServletHolder(new OrderServlet()),"/*");
        
        /* restaurant */
        ServletContextHandler tableWebsocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tableWebsocket.setContextPath("/table-websocket");
        tableWebsocket.addServlet(new ServletHolder(new TableWebSocketServlet()),"/*");
          
        ServletContextHandler tables = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tables.setContextPath("/restaurant");
        tables.addServlet(new ServletHolder(new RestaurantServlet()),"/*");
        
        ServletContextHandler tableLockWebsocket = new ServletContextHandler(ServletContextHandler.SESSIONS);
        tableLockWebsocket.setContextPath("/table-lock-websocket");
        tableLockWebsocket.addServlet(new ServletHolder(new TableLockWebSocketServlet()),"/*");
        
        Server server = new Server(8888);
        server.setAttribute("org.eclipse.jetty.server.Request.maxFormContentSize", 4000000);
        
        HashLoginService loginService = new HashLoginService("Administrator");
        loginService.putUser("SuperUser", new Password("p05t3r1t4"), new String[] {"admin"});
        
        server.addBean(loginService);
        
        ConstraintSecurityHandler security = new ConstraintSecurityHandler();
        
        Constraint constraint = new Constraint();
        constraint.setName("auth");
        constraint.setAuthenticate(true);
        constraint.setRoles(new String[] { "admin" });

        ConstraintMapping mapping = new ConstraintMapping();
        mapping.setPathSpec("/admin/*");
        mapping.setConstraint(constraint);

        security.setConstraintMappings(Collections.singletonList(mapping));
        security.setAuthenticator(new BasicAuthenticator());
        security.setLoginService(loginService);
        
        // chain the hello handler into the security handler
        security.setHandler(webapp);
        
        ContextHandlerCollection contexts = new ContextHandlerCollection();
        contexts.setHandlers(new Handler[] { tables, order, logger, sql, security, system, json, online, /*webapp,*/
        		clockinout, till, synchronize, printer, product, orderHistory, websocket, tableWebsocket, stock, report, tableLockWebsocket });
                                
		
        server.setHandler(contexts);
        
        server.start();
        
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(new Runnable() {
			
			DatabaseSynchronizer synchronizer = new DatabaseSynchronizer();
			
			public void run() {
				
				log.info("Running order synchronizer ...");
				
				try 
				{
					synchronizer.synchronizeDocumentNo(false); 
					synchronizer.synchronizeOrders(false, 5, true); //sync 5 minutes old orders
					
				} catch (OrderSynchronizationException e) {
					log.warn(e.getMessage());
				} catch (DocumentNoSynchronizationException e) {
					log.warn(e.getMessage());
				}								
			}
		}, 0, 5, TimeUnit.MINUTES);
                
        server.join();
	}

}
