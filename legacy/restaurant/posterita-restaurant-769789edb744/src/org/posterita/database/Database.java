package org.posterita.database;

import java.math.BigDecimal;
import java.net.URL;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

import javax.sql.DataSource;

import org.apache.derby.jdbc.EmbeddedDataSource;
import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.posterita.config.Configuration;
import org.posterita.exception.DatabaseException;

public class Database {
	
	private static Logger log = Logger.getLogger(Database.class);
	private static DataSource datasource;
	
	public static void setDataSource(DataSource ds)
	{
		Database.datasource = ds;
	}
	
	public static void initialize() throws DatabaseException
	{
		log.info("Initializing database ...");
		
		String dbpath = getDatabasePath();
		
		EmbeddedDataSource ds = new EmbeddedDataSource();
		ds.setDatabaseName(dbpath);
		ds.setCreateDatabase("create");
		
		datasource = ds;
		
		/*
		try 
		{
			Context ctx = new InitialContext();
			ctx.bind("java:/derby/EmbeddedDataSource", ds);
		} 
		catch (NamingException e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		*/
		
		createTables();
		
	}
	
	public static String getDatabasePath()
	{
		Configuration configuration = Configuration.get(true);
		String domain = configuration.getDomain();
		
		String host = "local";
		
		try 
		{
			URL url = new URL(configuration.getServerAddress());		
			host = url.getHost().replaceAll("\\.", "_");
		} 
		catch (Exception e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		String dbname = domain;
		String appDir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");
		
		
		 String OS = System.getProperty("os.name").toUpperCase();
		 
		 if (OS.contains("WIN")){
			 appDir = System.getenv("APPDATA") + separator + "posterita";
		 }
		 else if (OS.contains("MAC")){
			 appDir = System.getProperty("user.home") + "/Library/Application Support/posterita";
		 }
		 else if (OS.contains("NUX")){
			 appDir = System.getProperty("user.home") + separator + ".posterita";
		 }
		 
		String dbpath = appDir + separator + "db" + separator + host + separator + dbname;
		
		return dbpath;
	}
	
	public static void reset() throws DatabaseException
	{
		dropTables();
		createTables();
	}
	
	public static void createTables() throws DatabaseException
	{
		Set<String> tables = new HashSet<String>();
		tables.add("ORDERS");
		tables.add("SYSTEM");
		tables.add("USERS");
		tables.add("ROLE");
		tables.add("ROLE_ORG_ACCESS");
		tables.add("TERMINAL");
		tables.add("BOM");
		tables.add("BP");
		tables.add("TAX");
		tables.add("MODIFIER_GROUP");
		tables.add("PRODUCT_MODIFIER_GROUP");
		tables.add("PRODUCT");
		
		//normal tables
		tables.add("CLOCK_IN_OUT");
		tables.add("CLOSE_TILL");
		
		//search table
		tables.add("SEARCH_PRODUCT");
		
		//sync tables
		tables.add("SYNC_LOGS");
		tables.add("SYNC_DATE");
		
		//more tables
		tables.add("STORE");
		tables.add("WAREHOUSE");
		
		//more tables
		tables.add("OPEN_DRAWER");
		tables.add("RE_PRINT");		
		tables.add("PRODUCT_UPDATED");
		tables.add("PRODUCT2");
		tables.add("CART_LOG");	
		tables.add("CASHIER_CONTROL");
		tables.add("PRODUCT_PRICE");
		
		tables.add("PURCHASE");
		tables.add("ORDER_LOG");
		
		tables.add("ATTRIBUTESET_INSTANCE");
		
		/*restaurant*/
		tables.add("TABLES");
		tables.add("SEQUENCE");
		tables.add("PRINTER_LOG");
		tables.add("RESTAURANT_LOG");
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		try 
		{	
			conn = getConnection();
			DatabaseMetaData metadata = conn.getMetaData();
			rs = metadata.getTables(null, "APP", null, null);		
			
			while(rs.next())
			{
				String table = rs.getString(3);
				tables.remove(table);				
			}
			
			rs.close();
			
			stmt = conn.createStatement();			
						
			for(String table : tables)
			{
				log.info("Creating table " +  table);				
				
				if(table.equals("TERMINAL"))
				{
					stmt.executeUpdate("CREATE TABLE " + table + " (ID varchar(60) NOT NULL, VALUE long varchar, SEQUENCE_NO NUMERIC(10,0) DEFAULT 0, SEQUENCE_PREFIX VARCHAR(4))");
				}
				else if(table.equals("ORDERS"))
				{
					stmt.executeUpdate("CREATE TABLE " + table + " (ID varchar(60) NOT NULL, VALUE long varchar, "
							+ " STATUS varchar(20), "
							+ " ERROR_MESSAGE long varchar, "
							+ " TERMINAL_ID INTEGER, "
							+ " STORE_ID INTEGER, "
							+ " CUSTOMER_ID INTEGER, "
							+ " USER_ID INTEGER, "
							+ " DOCSTATUS varchar(20), "
							+ " ORDERTYPE varchar(50), "
							+ " TENDERTYPE varchar(20), "
							+ " COMMANDTYPE varchar(20), " /* restaurant */
							+ " DOCUMENTNO varchar(20), "
							+ " DATE_ORDERED TIMESTAMP)");
				}
				else if(table.equals("CLOCK_IN_OUT"))
				{
					stmt.executeUpdate("CREATE TABLE CLOCK_IN_OUT ("
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " TIME_IN TIMESTAMP,"
							+ " TIME_OUT TIMESTAMP,"
							+ " UUID VARCHAR(60),"
							+ " SYNCHRONIZED CHAR(1) DEFAULT 'N'"
							+ ")");
				}
				else if(table.equals("CLOSE_TILL"))
				{
					stmt.executeUpdate("CREATE TABLE CLOSE_TILL ("
							+ " OPEN_USER_ID INTEGER,"
							+ " CLOSE_USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " TIME_OPEN TIMESTAMP,"
							+ " TIME_CLOSE TIMESTAMP,"
							+ " OPENING_AMT NUMERIC(20,2) DEFAULT 0,"
							+ " CLOSING_AMT NUMERIC(20,2) DEFAULT 0,"
							+ " CASH NUMERIC(20,2) DEFAULT 0,"
							+ " CARD NUMERIC(20,2) DEFAULT 0,"
							+ " CHEQUE NUMERIC(20,2) DEFAULT 0,"
							+ " GIFT NUMERIC(20,2) DEFAULT 0,"
							+ " VOUCHER NUMERIC(20,2) DEFAULT 0,"
							+ " EXT_CARD NUMERIC(20,2) DEFAULT 0,"
							+ " LOYALTY NUMERIC(20,2) DEFAULT 0,"
							+ " COUPON NUMERIC(20,2) DEFAULT 0,"
							+ " DEPOSIT NUMERIC(20,2) DEFAULT 0,"
							+ " GIFTSMU NUMERIC(20,2) DEFAULT 0,"
							+ " MIPS NUMERIC(20,2) DEFAULT 0,"
							+ " POP NUMERIC(20,2) DEFAULT 0,"
							+ " UUID VARCHAR(60),"
							+ " JSON CLOB(64000), "
							+ " SYNCHRONIZED CHAR(1) DEFAULT 'N'"
							+ " )");
				}
				else if(table.equals("SEARCH_PRODUCT"))
				{
					stmt.executeUpdate("CREATE TABLE SEARCH_PRODUCT ("
							+ " M_PRODUCT_ID int,"
							+ " M_PRODUCT_PARENT_ID int,"
							+ " NAME varchar(60),"
							+ " DESCRIPTION varchar(120),"
							+ " UPC varchar(60),"
							+ " SKU varchar(60),"
							+ " PrimaryGroup varchar(60),"
							+ " ProductCategory varchar(60),"
							+ " Group1 varchar(60),"
							+ "	Group2 varchar(60),"
							+ "	Group3 varchar(60),"
							+ "	Group4 varchar(60),"
							+ "	Group5 varchar(60),"
							+ "	Group6 varchar(60),"
							+ "	Group7 varchar(60),"
							+ "	Group8 varchar(60),"
							+ " JSON long varchar,"
							+ " IsModifier char(1),"
							+ " ExtendedDescription long varchar"
							+ ")");
					
					stmt.executeUpdate("CREATE INDEX UPCIndex ON SEARCH_PRODUCT(UPC)");
				}
				else if(table.equals("SYNC_DATE"))
				{
					stmt.executeUpdate("CREATE TABLE SYNC_DATE ("
							+ " EVENT VARCHAR(60),"
							+ " EVENTDATE TIMESTAMP" 
							+ " )");
					
					stmt.executeUpdate("INSERT INTO SYNC_DATE (EVENT, EVENTDATE) VALUES ('ORDERS', CURRENT_TIMESTAMP)");
					stmt.executeUpdate("INSERT INTO SYNC_DATE (EVENT, EVENTDATE) VALUES ('SYSTEM', CURRENT_TIMESTAMP)");
					stmt.executeUpdate("INSERT INTO SYNC_DATE (EVENT, EVENTDATE) VALUES ('TERMINAL', CURRENT_TIMESTAMP)");
					stmt.executeUpdate("INSERT INTO SYNC_DATE (EVENT, EVENTDATE) VALUES ('CLOCK_INOUT', CURRENT_TIMESTAMP)");
					stmt.executeUpdate("INSERT INTO SYNC_DATE (EVENT, EVENTDATE) VALUES ('CLOSE_TILL', CURRENT_TIMESTAMP)");
				}
				else if(table.equals("OPEN_DRAWER"))
				{
					stmt.executeUpdate("CREATE TABLE OPEN_DRAWER ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " REASON varchar(120),"
							+ " DATE_OPENED TIMESTAMP" 
							+ " )");
				}
				else if(table.equals("RE_PRINT"))
				{
					stmt.executeUpdate("CREATE TABLE RE_PRINT ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " ORDER_ID VARCHAR(60) NOT NULL,"
							+ " DATE_PRINTED TIMESTAMP" 
							+ " )");
				}
				else if(table.equals("PRODUCT_UPDATED"))
				{
					stmt.executeUpdate("CREATE TABLE PRODUCT_UPDATED ("
							+ " M_PRODUCT_ID int,"
							+ " NAME varchar(60),"
							+ " DESCRIPTION varchar(120),"
							+ " UPC varchar(60),"
							+ " SKU varchar(60),"
							+ " OLD_PRICE NUMERIC(20,2) DEFAULT 0,"
							+ " NEW_PRICE NUMERIC(20,2) DEFAULT 0,"
							+ " DATE_UPDATED TIMESTAMP"
							+ ")");
				}
				else if(table.equals("CART_LOG"))
				{
					stmt.executeUpdate("CREATE TABLE CART_LOG ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " DATE_LOGGED TIMESTAMP,"
							+ " ACTION VARCHAR(60) NOT NULL,"
							+ " QTY NUMERIC(20,2) DEFAULT 0,"
							+ " AMOUNT NUMERIC(20,2) DEFAULT 0,"
							+ " DESCRIPTION long varchar"
							+ " )");
				}
				else if(table.equals("ORDER_LOG"))
				{
					stmt.executeUpdate("CREATE TABLE ORDER_LOG (ID varchar(60) NOT NULL, VALUE long varchar, "
							+ " TERMINAL_ID INTEGER, "
							+ " STORE_ID INTEGER, "
							+ " USER_ID INTEGER,"
							+ " DOCUMENTNO varchar(20), "
							+ " ACTION VARCHAR(60) NOT NULL,"
							+ " DATE_LOGGED TIMESTAMP)");
				}
				else if(table.equals("CASHIER_CONTROL"))
				{
					stmt.executeUpdate("CREATE TABLE CASHIER_CONTROL ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " DATE_LOGGED TIMESTAMP,"
							+ " BEGINNINGBALANCE NUMERIC(20,2) DEFAULT 0,"
							+ " CASHAMOUNTENTERED NUMERIC(20,2) DEFAULT 0,"
							+ " CASHAMOUNT NUMERIC(20,2) DEFAULT 0,"
							+ " EXTERNALAMOUNTENTERED NUMERIC(20,2) DEFAULT 0,"
							+ " EXTERNALAMOUNT NUMERIC(20,2) DEFAULT 0,"
							+ " SYNCHRONIZED CHAR(1) DEFAULT 'N'"
							+ " )");
				}
				else if(table.equals("PRODUCT_PRICE"))
				{
					stmt.executeUpdate("CREATE TABLE PRODUCT_PRICE ("
							+ " M_PRODUCT_ID int,"
							+ " M_PRICELIST_ID int,"
							+ " PRICELIST NUMERIC(20,2) DEFAULT 0,"
							+ " PRICESTD NUMERIC(20,2) DEFAULT 0,"
							+ " PRICELIMIT NUMERIC(20,2) DEFAULT 0,"
							+ " M_ATTRIBUTESETINSTANCE_ID int"
							+ ")");
				}
				else if(table.equals("ATTRIBUTESET_INSTANCE"))
				{
					stmt.executeUpdate("CREATE TABLE ATTRIBUTESET_INSTANCE ("
							+ " M_ATTRIBUTESETINSTANCE_ID int,"
							+ " M_ATTRIBUTESET_ID int,"
							+ " DESCRIPTION varchar(60),"
							+ " LOT varchar(60),"	
							+ " EXPIRYDATE TIMESTAMP DEFAULT NULL"													
							+ ")");
				}
				
				/* restaurant */
				else if(table.equals("TABLES"))
				{
					stmt.executeUpdate("CREATE TABLE TABLES ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " TABLE_ID INTEGER NOT NULL,"
							+ " PARENT_TABLE_ID INTEGER,"
							+ " NAME varchar(60),"
							+ " LAST_UPDATED TIMESTAMP,"
							+ " STATUS CHAR(1) DEFAULT 'A',"
							+ " ORDER_ID VARCHAR(60),"
							+ " WAITER varchar(60)"
							+ " )");	
					
					
					//populate table tables
					int table_id;
					String name, uuid;
					
					for(int i=0; i< 100; i++){
						
						table_id = i;
						name = "" + (table_id);
						uuid = name;
						
						stmt.executeUpdate("INSERT INTO TABLES (UUID, TABLE_ID, NAME) VALUES ('" + uuid + "'," + table_id + ", '" + name + "')");
						
					}
					
					
				}
				else if(table.equalsIgnoreCase("SEQUENCE")) {
					
					stmt.executeUpdate("CREATE TABLE SEQUENCE ("
							+ "NAME VARCHAR(60),  "
							+ "SEQUENCE_NO INT, "
							+ "LAST_UPDATED TIMESTAMP "
							+ ")");
					
					stmt.executeUpdate("INSERT INTO SEQUENCE (NAME, SEQUENCE_NO, LAST_UPDATED) VALUES ('DINE-IN', 0, CURRENT_TIMESTAMP)");
					stmt.executeUpdate("INSERT INTO SEQUENCE (NAME, SEQUENCE_NO, LAST_UPDATED) VALUES ('TAKE-AWAY', 0, CURRENT_TIMESTAMP)");
				}
				else if(table.equals("PRINTER_LOG"))
				{
					stmt.executeUpdate("CREATE TABLE PRINTER_LOG ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " DATE_LOGGED TIMESTAMP,"
							+ " PRINTER_NAME VARCHAR(60) NOT NULL,"
							+ " ORDER_TYPE CHAR(1) DEFAULT 'D'," //D for dinein, T for takeaway
							+ " RECEIPT long varchar,"
							+ " RAW_RECEIPT long varchar,"
							+ " PRINTED CHAR(1) DEFAULT 'Y'"
							+ " )");
				}
				else if(table.equals("RESTAURANT_LOG"))
				{
					stmt.executeUpdate("CREATE TABLE RESTAURANT_LOG ("
							+ " UUID VARCHAR(60) NOT NULL,"
							+ " USER_ID INTEGER,"
							+ " TERMINAL_ID INTEGER,"
							+ " DATE_LOGGED TIMESTAMP,"
							+ " ACTION VARCHAR(60) NOT NULL,"
							+ " DESCRIPTION long varchar"
							+ " )");
				}
				else
				{
					stmt.executeUpdate("CREATE TABLE " + table + " (ID varchar(60) NOT NULL, VALUE long varchar)");
				}			
				
			}
			
			
			rs.close();
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "JSON");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN JSON CLOB(64000)");
			}
			else
			{
				
				log.info("Updating table CLOSE_TILL ...");
				
				String type = rs.getString(6);
				int size = rs.getInt(7);
				
				if("LONG VARCHAR".equalsIgnoreCase(type)){
					
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN JSON2 CLOB(64000)");
					stmt.executeUpdate("UPDATE CLOSE_TILL SET JSON2 = JSON");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL DROP COLUMN JSON");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN JSON CLOB(64000)");
					stmt.executeUpdate("UPDATE CLOSE_TILL SET JSON = JSON2");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL DROP COLUMN JSON2");
					
				}
				else if("CLOB".equalsIgnoreCase(type) && size == 64000){
					
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN JSON2 CLOB");
					stmt.executeUpdate("UPDATE CLOSE_TILL SET JSON2 = JSON");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL DROP COLUMN JSON");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN JSON CLOB");
					stmt.executeUpdate("UPDATE CLOSE_TILL SET JSON = JSON2");
					stmt.executeUpdate("ALTER TABLE CLOSE_TILL DROP COLUMN JSON2");
					
				}
			}
			
			rs.close();
			rs = metadata.getColumns(null, "APP", "ORDERS", "CUSTOMER_ID");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN STORE_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN CUSTOMER_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN USER_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN DOCSTATUS varchar(20)");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN ORDERTYPE varchar(50)");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN TENDERTYPE varchar(20)");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN DOCUMENTNO varchar(20)");
				
				FixOrderTable();
			}
			
			rs.close();
			rs = metadata.getIndexInfo(null, "APP", "SEARCH_PRODUCT", false, false);
			
			if(! rs.next() )
			{
				stmt.executeUpdate("CREATE INDEX UPCIndex ON SEARCH_PRODUCT(UPC)");
			}
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "COUPON");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN COUPON NUMERIC(20,2) DEFAULT 0");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "SEARCH_PRODUCT", "ISMODIFIER");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE SEARCH_PRODUCT ADD COLUMN ISMODIFIER CHAR(1) DEFAULT 'N'");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CASHIER_CONTROL", "SYNCHRONIZED");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CASHIER_CONTROL ADD COLUMN SYNCHRONIZED CHAR(1) DEFAULT 'N'");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CART_LOG", "DESCRIPTION");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CART_LOG ADD COLUMN AMOUNT NUMERIC(20,2) DEFAULT 0");
				stmt.executeUpdate("ALTER TABLE CART_LOG ADD COLUMN DESCRIPTION long varchar");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "MCBJUICE");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN MCBJUICE NUMERIC(20,2) DEFAULT 0");
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN MYTMONEY NUMERIC(20,2) DEFAULT 0");
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN EMTELMONEY NUMERIC(20,2) DEFAULT 0");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "GIFTSMU");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN GIFTSMU NUMERIC(20,2) DEFAULT 0");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "DEPOSIT");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN DEPOSIT NUMERIC(20,2) DEFAULT 0");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "PRODUCT_PRICE", "M_ATTRIBUTESETINSTANCE_ID");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE PRODUCT_PRICE ADD COLUMN M_ATTRIBUTESETINSTANCE_ID INTEGER DEFAULT 0");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "SEARCH_PRODUCT", "EXTENDEDDESCRIPTION");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE SEARCH_PRODUCT ADD COLUMN EXTENDEDDESCRIPTION long varchar");
			}
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "ATTRIBUTESET_INSTANCE", "EXPIRYDATE");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE ATTRIBUTESET_INSTANCE ADD COLUMN EXPIRYDATE TIMESTAMP DEFAULT NULL");
			}
			
			rs.close();
			
			/* restaurant */
			rs = metadata.getColumns(null, "APP", "ORDERS", "COMMANDTYPE");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN COMMANDTYPE varchar(20)");
			}		
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "PRINTER_LOG", "PRINTED");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE PRINTER_LOG ADD COLUMN RAW_RECEIPT long varchar");
				stmt.executeUpdate("ALTER TABLE PRINTER_LOG ADD COLUMN PRINTED CHAR(1) DEFAULT 'Y'");
			}		
			
			rs.close();
			
			rs = metadata.getColumns(null, "APP", "CLOSE_TILL", "MIPS");
			
			if(!rs.next())
			{
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN MIPS NUMERIC(20,2) DEFAULT 0");
				stmt.executeUpdate("ALTER TABLE CLOSE_TILL ADD COLUMN POP NUMERIC(20,2) DEFAULT 0");
			}
			
			rs.close();
						
		} 
		catch (Exception e) 
		{
			e.printStackTrace();
			
			throw new DatabaseException("Failed to create tables", e);
		}
		finally
		{
			close(conn, stmt, rs);
		}
	}
	
	public static void purgeSyncData() throws DatabaseException{
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;
		
		Calendar cal = Calendar.getInstance();
		
		//get 1 month in past
		
		int year = cal.get( Calendar.YEAR );
		int month = cal.get( Calendar.MONTH );
		
		if( month == 0 ){
			month = 11;
			year = year - 1;
		}
		else
		{
			month = month - 1;
		}
		
		month = month + 1;
		
		String date = year + "-" + ( ( month < 10 ) ? ( "0" + month ) : month ) + "-01 00:00:00.0";
		
		try 
		{	
			conn = getConnection();
			stmt = conn.createStatement();
			
			stmt.executeUpdate(" DELETE FROM ORDERS WHERE STATUS = 'CO' AND DATE_ORDERED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM CLOSE_TILL WHERE SYNCHRONIZED = 'Y' AND TIME_CLOSE < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM CLOCK_IN_OUT WHERE SYNCHRONIZED = 'Y' AND TIME_OUT < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM OPEN_DRAWER WHERE DATE_OPENED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM RE_PRINT WHERE DATE_PRINTED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM PRODUCT_UPDATED WHERE DATE_UPDATED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM CART_LOG WHERE DATE_LOGGED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM CASHIER_CONTROL WHERE DATE_LOGGED < '" + date + "'");
			
			/* restaurant */
			//clear restaurant logs
			stmt.executeUpdate(" DELETE FROM PRINTER_LOG WHERE DATE_LOGGED < '" + date + "'");
			
			stmt.executeUpdate(" DELETE FROM RESTAURANT_LOG WHERE DATE_LOGGED < '" + date + "'");
			
		}
		catch (Exception e) 
		{
			throw new DatabaseException("Failed to purge sync data!", e);
		}
		finally
		{
			close(conn, stmt, rs);
		}
		
	}
	
	public static void dropTables() throws DatabaseException
	{
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		Set<String> tables = new HashSet<String>();
		
		try 
		{	
			conn = getConnection();
			
			DatabaseMetaData metadata = conn.getMetaData();
			rs = metadata.getTables(null, "APP", null, null);
			
			while(rs.next())
			{
				String table = rs.getString(3);
				tables.add(table);				
			}
			
			stmt = conn.createStatement();
			
			for(String table : tables)
			{
				log.info("Dropping table " +  table);
				
				stmt.executeUpdate("DROP TABLE " + table);
			}
			
		} 
		catch (Exception e) 
		{
			throw new DatabaseException("Failed to drop tables", e);
		}
		finally
		{
			close(conn, stmt, rs);
		}
	}
	
	public static Connection getConnection() throws DatabaseException
	{
		Connection conn;
		
		try 
		{
			if(datasource == null){
				initialize();
			}
			
			conn = null;		
			conn = datasource.getConnection();
			
			return conn;
		} 
		catch (Exception e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
			throw new DatabaseException(e);
		}		
		
	}
	
	//-----------------------------------------------------------------------------------------
	// -------------- Some helper methods -----------------------------------------------------
	//-----------------------------------------------------------------------------------------
	public static void close(ResultSet rs)
	{
		if(rs != null)
		{
			try 
			{
				rs.close();
			} 
			catch (SQLException e) 
			{
				log.error("Failed to close ResultSet!", e);
			}
			finally
			{
				rs = null;
			}
		}
	}
	
	public static void close(Statement stmt)
	{
		if(stmt != null)
		{
			try 
			{
				stmt.close();
			} 
			catch (SQLException e) 
			{
				log.error("Failed to close Statement!", e);
			}
			finally
			{
				stmt = null;
			}
		}
	}
	
	public static void close(Connection conn)
	{
		/*
		if(conn != null)
		{
			try 
			{
				conn.close();
			} 
			catch (SQLException e) 
			{
				log.error("Failed to close Connection!", e);
			}
			finally
			{
				conn = null;
			}
		}
		*/
	}
	
	public static void close(Statement stmt, ResultSet rs)
	{
		close(rs);
		close(stmt);
	}
	
	public static void close(Connection conn, Statement stmt, ResultSet rs)
	{
		close(rs);
		close(stmt);
		close(conn);
	}

	/**
	 * Deletes all records from given table
	 * @param table
	 * @throws DatabaseException 
	 */
	public static void deleteAllFrom(String table) throws DatabaseException
	{
		
		Connection conn = null;
		Statement stmt = null;
		
		try 
		{	
			conn = getConnection();
			stmt = conn.createStatement();
			stmt.executeUpdate("delete from " + table);
			
		} 
		catch (Exception e) 
		{
			String message = "Failed to delete all from table [" + table + "]";
			log.error(message, e);			
			throw new DatabaseException(message, e);
		}
		finally
		{
			close(conn, stmt, null);
		}
	}
	
	/**
	 * Get all records from given table
	 * @param tableName
	 * @return a JSONArray string
	 * @throws DatabaseException 
	 */
	public static String getAllFrom(String table) throws DatabaseException
	{
		return getAllFrom(table, null, false);
	}
	
	public static String getAllFrom(String table, String whereClause ) throws DatabaseException
	{
		return getAllFrom(table, whereClause, false);
	}
	
	public static String getAllFrom(String table, String whereClause, boolean allColumns) throws DatabaseException
	{
		log.info(String.format("Retrieving values [%s]", table));
		
		//check table structure
		if(table.equalsIgnoreCase("CLOCK_IN_OUT") 
				|| table.equalsIgnoreCase("CLOSE_TILL")
				|| table.equalsIgnoreCase("OPEN_DRAWER")
				|| table.equalsIgnoreCase("RE_PRINT")
				|| table.equalsIgnoreCase("PRODUCT_UPDATED")
				|| table.equalsIgnoreCase("SYNC_DATE")
				|| table.equalsIgnoreCase("CART_LOG")
				|| table.equalsIgnoreCase("CASHIER_CONTROL")
				|| table.equalsIgnoreCase("PRODUCT_PRICE")
				|| table.equalsIgnoreCase("ATTRIBUTESET_INSTANCE")
				/* restaurant */
				|| table.equalsIgnoreCase("TABLES")
				|| table.equalsIgnoreCase("PRINTER_LOG")
				|| table.equalsIgnoreCase("RESTAURANT_LOG")
				|| table.equalsIgnoreCase("ORDER_LOG")
				|| allColumns )
		{
			String sql = "select * from " + table ;
			
			if(whereClause != null && whereClause.length() > 0)
			{
				sql = sql + " where " + whereClause;
			}
			
			if(table.equalsIgnoreCase("CLOSE_TILL")){
				sql = sql + " order by  TIME_OPEN desc";
			}
			
			if(table.equalsIgnoreCase("CLOCK_IN_OUT")){
				sql = sql + " order by  TIME_IN desc";
			}
			
			if(table.equalsIgnoreCase("OPEN_DRAWER")){
				sql = sql + " order by  DATE_OPENED desc";
			}
			
			if(table.equalsIgnoreCase("RE_PRINT")){
				sql = sql + " order by  DATE_PRINTED desc";
			}
			
			if(table.equalsIgnoreCase("PRODUCT_UPDATED")){
				sql = sql + " order by  NAME asc, DATE_UPDATED desc";
			}
			
			/* restaurant */
			if(table.equalsIgnoreCase("TABLES")){
				sql = sql + " order by  table_id";
			}
			
			if(table.equalsIgnoreCase("PRINTER_LOG")){
				sql = sql + " order by date_logged desc";
			}	
			
			if(table.equalsIgnoreCase("RESTAURANT_LOG")){
				sql = sql + " order by date_logged desc";
			}
			
			if(table.equalsIgnoreCase("ORDER_LOG")){
				sql = sql + " order by date_logged desc";
			}
			
			
			Connection conn = null;
			ResultSet rs = null;
			Statement stmt = null;
			
			try 
			{			
				conn = getConnection();
				stmt = conn.createStatement();
				rs = stmt.executeQuery(sql);
				
				ResultSetMetaData metaData = rs.getMetaData();
		    	
		    	JSONArray jsonArray = new JSONArray();
		    	
		    	while(rs.next())
				{		    		
		    		
		    		if(table.equalsIgnoreCase("CLOSE_TILL")) {
		    			
		    			String json = rs.getString("json");
		    			
		    			if(json != null){
		    				
		    				jsonArray.put(new JSONObject(json));
		    				continue;
		    				
		    			}
		    		}
					
		    		JSONObject jsonObject = new JSONObject();
					
					for(int i=1; i<= metaData.getColumnCount(); i++)
					{
						String key = metaData.getColumnName(i).toLowerCase();
						Object value = rs.getObject(i);
						
						if (value == null)
						{
							value = "";
						}
						
						jsonObject.put(key, value);
					}
					
					jsonArray.put(jsonObject);
				}
		    	
		    	return jsonArray.toString();
				
			} 
			catch (Exception e) 
			{
				String message = "Failed to get all from table [" + table + "]";			
				log.error(message, e);
				throw new DatabaseException(message, e);
				
			}
			finally
			{
				close(conn, stmt, rs);
			}
		}
		else
		{
			String sql = "select value from " + table ;
			if(whereClause != null && whereClause.length() > 0)
			{
				sql = sql + " where " + whereClause;
			}
			
			Connection conn = null;
			ResultSet rs = null;
			Statement stmt = null;
			
			try 
			{			
				conn = getConnection();
				stmt = conn.createStatement();
				rs = stmt.executeQuery(sql);
				
				StringBuffer sb = new StringBuffer("[");
				
				while(rs.next())
				{
					String value = rs.getString(1);
					
					if(sb.length() > 1)
					{
						sb.append(",");
					}
					
					sb.append(value);
				}
				
				sb.append("]");
				
				return sb.toString();
				
			} 
			catch (Exception e) 
			{
				String message = "Failed to get all from table [" + table + "]";			
				log.error(message, e);
				throw new DatabaseException(message, e);
				
			}
			finally
			{
				close(conn, stmt, rs);
			}
		}		
			
	}
	
	/**
	 * Get a record from the given table
	 * @param table
	 * @param id
	 * @return a JSONObject string
	 * @throws DatabaseException 
	 */
	public static String get(String table, String id) throws DatabaseException
	{
		//check table structure
		if(table.equalsIgnoreCase("CLOCK_IN_OUT") 
		|| table.equalsIgnoreCase("CLOSE_TILL")
		|| table.equalsIgnoreCase("TABLES")) /* restaurant */
		{
			String sql = "select * from " + table + " where uuid = '" + id + "'";
			Connection conn = null;
			ResultSet rs = null;
			Statement stmt = null;
			
			try 
			{			
				conn = getConnection();
				stmt = conn.createStatement();
				rs = stmt.executeQuery(sql);
				
				ResultSetMetaData metaData = rs.getMetaData();
				
				if(rs.next())
				{
					JSONObject jsonObject = new JSONObject();
					
					for(int i=1; i<= metaData.getColumnCount(); i++)
					{
						String key = metaData.getColumnName(i).toLowerCase();
						Object value = rs.getObject(i);
						
						if (value == null)
						{
							value = "";
						}
						
						jsonObject.put(key, value);
					}
					
					return jsonObject.toString();
				}			    	
				
				return null;
				
			} 
			catch (Exception e) 
			{
				String message = "Failed to get record [" + id + "] from table [" + table + "]";
				log.error(message, e);
				throw new DatabaseException(message, e);
			}
			finally
			{
				close(conn, stmt, rs);
			}
		}
		else
		{
			String sql = "select value from " + table + " where id = '" + id + "'";
			Connection conn = null;
			ResultSet rs = null;
			Statement stmt = null;
			
			try 
			{			
				conn = getConnection();
				stmt = conn.createStatement();
				rs = stmt.executeQuery(sql);
				
				if(rs.next())
				{
					return rs.getString(1);
				}
				
				return null;
				
			} 
			catch (Exception e) 
			{
				String message = "Failed to get record [" + id + "] from table [" + table + "]";
				log.error(message, e);
				throw new DatabaseException(message, e);
			}
			finally
			{
				close(conn, stmt, rs);
			}
		}
		
	}
	
	/**
	 * Put a JSON array in the given table. Existing records are updated.
	 * @param table
	 * @param jsonArray
	 * @param keyPath - json field to use as record identifier
	 * @throws DatabaseException 
	 */
	public static void putAll(String table, String jsonArray, String keyPath) throws DatabaseException
	{
		Connection conn = null;
		PreparedStatement insertStmt = null;
		PreparedStatement updateStmt = null;
		
		Set<String> tables = new HashSet<String>();
		
		tables.add("USERS");
		tables.add("ROLE");
		tables.add("ROLE_ORG_ACCESS");
		tables.add("BOM");
		tables.add("BP");
		tables.add("TAX");
		tables.add("MODIFIER_GROUP");
		tables.add("PRODUCT_MODIFIER_GROUP");
		tables.add("PRODUCT");
		tables.add("STORE");
		tables.add("WAREHOUSE");
		
		//check if first time
		String records = Database.getAllFrom("TERMINAL");
		if("[]".equals(records))
		{
			tables.add("TERMINAL");
		}
		
		
		try 
		{
			conn = getConnection();
			
			insertStmt = conn.prepareStatement("INSERT INTO " + table + "(ID, VALUE) VALUES (?,?) ");
			
			JSONArray array = new JSONArray(jsonArray);
			JSONObject object = null;
			String id = null;
			String json = null;
			int[] count = null;
			
			if(tables.contains(table.toUpperCase()))
			{
				// quick insert
				
				Database.executeUpdate("TRUNCATE TABLE " + table);
				
				for(int i=0; i<array.length(); i++)
				{
					object = array.getJSONObject(i);
					id = object.getString(keyPath);
					json = object.toString();
					
					insertStmt.setString(1, id);
					insertStmt.setString(2, json);
					
					insertStmt.addBatch();
					
					if(((i+1) % 50) == 0 && i > 0)
					{
						count = insertStmt.executeBatch();
						log.info("Inserted [" + table + "] " + count.length + " records");
					}
					
					/*
					if(insertStmt.executeUpdate() == 0)
					{
						log.error("Fail to insert [" + table + "] " + keyPath + "[" + id + "]");
					}
					else
					{
						log.info("Inserted [" + table + "] " + keyPath + "[" + id + "]");
					}
					*/
				}
				
				count = insertStmt.executeBatch();
				log.info("Inserted [" + table + "] " + count.length + " records");
			}
			else
			{
				updateStmt = conn.prepareStatement("UPDATE " + table + " SET VALUE = ? WHERE ID = ? ");				
				
				for(int i=0; i<array.length(); i++)
				{
					object = array.getJSONObject(i);
					id = object.getString(keyPath);
					json = object.toString();
					
					String value = get(table, id);
					
					if(value == null)
					{
						insertStmt.setString(1, id);
						insertStmt.setString(2, json);
						
						if(insertStmt.executeUpdate() == 0)
						{
							log.error("Fail to insert [" + table + "] " + keyPath + "[" + id + "]");
						}
						else
						{
							log.info("Inserted [" + table + "] " + keyPath + "[" + id + "]");
						}						
						
					}
					else
					{
						updateStmt.setString(1, json);
						updateStmt.setString(2, id);
						
						if(updateStmt.executeUpdate() == 0)
						{
							log.error("Failed to update [" + table + "] " + keyPath + "[" + id + "]");
						}
						else
						{
							log.info("Updated [" + table + "] " + keyPath + "[" + id + "]");
						}						
						
					}
				}
			}
			
			
		} 
		catch (Exception e) 
		{
			String message = "Failed to put json in table [" + table + "]";
			log.error(message, e);
						
			try 
			{
				log.info("Rolling back transaction ...");
				conn.rollback();
				
			} 
			catch (SQLException e1) 
			{
				e1.printStackTrace();
			}
			
			throw new DatabaseException(message, e);
			
			
		}
		finally
		{
			close(insertStmt);
			close(updateStmt);
			close(conn);
		}
	}
	
	/**
	 * Put a JSON object in the given table. Existing record is updated.
	 * @param table
	 * @param jsonArray
	 * @param keyPath - json field to use as record identifier
	 * @throws DatabaseException 
	 */
	public static void put(String table, String json, String keyPath) throws DatabaseException
	{
		Connection conn = null;
		PreparedStatement insertStmt = null;
		PreparedStatement updateStmt = null;
		
		Set<String> tables = new HashSet<String>();
		
		tables.add("USERS");
		tables.add("ROLE");
		tables.add("ROLE_ORG_ACCESS");
		tables.add("BOM");
		tables.add("BP");
		tables.add("TAX");
		tables.add("MODIFIER_GROUP");
		tables.add("PRODUCT_MODIFIER_GROUP");
		tables.add("PRODUCT");
		tables.add("STORE");
		tables.add("WAREHOUSE");
		
		//check if first time
		String records = Database.getAllFrom("TERMINAL");
		if("[]".equals(records))
		{
			tables.add("TERMINAL");
		}
				
		try 
		{
			JSONObject object = new JSONObject(json);
			String id = object.getString(keyPath);
			
			conn = getConnection();
			
			String value = get(table, id);
			
			insertStmt = conn.prepareStatement("INSERT INTO " + table + "(ID, VALUE) VALUES (?,?) ");
			updateStmt = conn.prepareStatement("UPDATE " + table + " SET VALUE = ? WHERE ID = ? ");	
			
			if(value == null)
			{
				insertStmt.setString(1, id);
				insertStmt.setString(2, json);
				
				if(insertStmt.executeUpdate() == 0)
				{
					log.error("Fail to insert [" + table + "] " + keyPath + "[" + id + "]");
				}
				else
				{
					log.info("Inserted [" + table + "] " + keyPath + "[" + id + "]");
				}						
				
			}
			else
			{
				updateStmt.setString(1, json);
				updateStmt.setString(2, id);
				
				if(updateStmt.executeUpdate() == 0)
				{
					log.error("Failed to update [" + table + "] " + keyPath + "[" + id + "]");
				}
				else
				{
					log.info("Updated [" + table + "] " + keyPath + "[" + id + "]");
				}						
				
			}
			
			
		} 
		catch (Exception e) 
		{
			String message = "Failed to put json in table [" + table + "]";
			log.error(message, e);
						
			try 
			{
				log.info("Rolling back transaction ...");
				conn.rollback();
				
			} 
			catch (SQLException e1) 
			{
				e1.printStackTrace();
			}
			
			throw new DatabaseException(message, e);
			
			
		}
		finally
		{
			close(insertStmt);
			close(updateStmt);
			close(conn);
		}
	}
	
	public static int executeUpdate(String sql) throws DatabaseException
	{
		return executeUpdate(sql, null);
	}
	
	public static int executeUpdate(String sql, Object[] params) throws DatabaseException
	{
		Connection conn = null;
		PreparedStatement pstmt = null;
		
		try 
		{
			conn = getConnection();
			pstmt = conn.prepareStatement(sql);
			
			int index = 0;
			
			if(params != null){
				for(Object param : params)
				{
					index ++;
					
					if (param instanceof String)
					{
						pstmt.setString(index, (String) param);
					}
					else if (param instanceof Integer)
					{
						pstmt.setInt(index, ((Integer) param ).intValue());
					}
					else if (param instanceof BigDecimal)
					{
						pstmt.setBigDecimal(index, (BigDecimal) param);
					}
					else if (param instanceof Timestamp)
					{
						pstmt.setTimestamp(index, (Timestamp) param);
					}
					else if (param == null)
					{
						pstmt.setNull(index, Types.VARCHAR);
					}
					else 
					{
						throw new Exception("Invalid parameter type: " + param);
					}				
				}//for
			}
			
			
			return pstmt.executeUpdate();
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw new DatabaseException(e);
		}
		finally
		{
			close(pstmt);
			close(conn);
		}	
	}
	
	public static void FixOrderTable() throws DatabaseException
	{
		//populate order fields
		String orders = getAllFrom("ORDERS", "STORE_ID IS NULL");
		
		JSONArray array = null;
		JSONObject order = null;
		
		/*
		 stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN STORE_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN CUSTOMER_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN USER_ID INTEGER");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN DOCSTATUS varchar(20)");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN ORDERTYPE varchar(50)");
				stmt.executeUpdate("ALTER TABLE ORDERS ADD COLUMN TENDERTYPE varchar(20)");
		 */
		
		int STORE_ID, CUSTOMER_ID, USER_ID;		
		String ID, DOCSTATUS, ORDERTYPE, TENDERTYPE, DOCUMENTNO;
		
		
		try 
		{
			array = new JSONArray(orders);
			
			if(array.length() == 0)
			{
				return;
			}
		} 
		catch (JSONException e1) 
		{
			// TODO Auto-generated catch block
			e1.printStackTrace();
			return;
		}
		
		Connection conn = Database.getConnection();
		PreparedStatement pstmt = null;
		
		try 
		{
			pstmt = conn.prepareStatement("UPDATE ORDERS SET STORE_ID = ? , CUSTOMER_ID = ? , USER_ID = ? , "
					+ " DOCUMENTNO = ? , DOCSTATUS = ? , TENDERTYPE = ? , ORDERTYPE = ? where ID = ? ");
			
			
			
			for(int i=0; i< array.length(); i++)
			{
				order = array.getJSONObject(i);
				
				ID = order.getString("id");
				DOCUMENTNO = order.getString("documentNo");
				TENDERTYPE = order.getString("tenderType");
				ORDERTYPE = order.getString("orderType");
				DOCSTATUS = order.getString("docAction");
				
				STORE_ID = order.getInt("orgId");
				CUSTOMER_ID = order.getInt("bpartnerId");
				USER_ID = order.getInt("salesRepId");
				
				pstmt.setInt(1, STORE_ID);
				pstmt.setInt(2, CUSTOMER_ID);
				pstmt.setInt(3, USER_ID);
				
				pstmt.setString(4, DOCUMENTNO);
				pstmt.setString(5, DOCSTATUS);
				pstmt.setString(6, TENDERTYPE);
				pstmt.setString(7, ORDERTYPE);
				
				pstmt.setString(8, ID);
				
				pstmt.addBatch();
				
			}
			
			pstmt.executeBatch();
		} 
		catch (Exception e) 
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		finally
		{
			Database.close(pstmt);
			Database.close(conn);
		}
	}
	
	public static String getSqlValue(String sql, Object[] params) throws DatabaseException
	{

		Connection conn = null;
		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = getConnection();
			pstmt = conn.prepareStatement(sql);
			
			int index = 0;
			
			if(params != null){
				for(Object param : params)
				{
					index ++;
					
					if (param instanceof String)
					{
						pstmt.setString(index, (String) param);
					}
					else if (param instanceof Integer)
					{
						pstmt.setInt(index, ((Integer) param ).intValue());
					}
					else if (param instanceof BigDecimal)
					{
						pstmt.setBigDecimal(index, (BigDecimal) param);
					}
					else if (param instanceof Timestamp)
					{
						pstmt.setTimestamp(index, (Timestamp) param);
					}
					else if (param == null)
					{
						pstmt.setNull(index, Types.VARCHAR);
					}
					else 
					{
						throw new Exception("Invalid parameter type: " + param);
					}				
				}//for
			}
			
			
			rs = pstmt.executeQuery();
			
			if(rs.next()) {
				
				return rs.getString(1);
			}
			
			return null;
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw new DatabaseException(e);
		}
		finally
		{
			close(pstmt, rs);
			close(conn);
		}	
	
	}
	
	public static int getSqlValueAsInt(String sql, Object[] params) throws DatabaseException
	{

		Connection conn = null;
		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = getConnection();
			pstmt = conn.prepareStatement(sql);
			
			int index = 0;
			
			if(params != null){
				for(Object param : params)
				{
					index ++;
					
					if (param instanceof String)
					{
						pstmt.setString(index, (String) param);
					}
					else if (param instanceof Integer)
					{
						pstmt.setInt(index, ((Integer) param ).intValue());
					}
					else if (param instanceof BigDecimal)
					{
						pstmt.setBigDecimal(index, (BigDecimal) param);
					}
					else if (param instanceof Timestamp)
					{
						pstmt.setTimestamp(index, (Timestamp) param);
					}
					else if (param == null)
					{
						pstmt.setNull(index, Types.VARCHAR);
					}
					else 
					{
						throw new Exception("Invalid parameter type: " + param);
					}				
				}//for
			}
			
			
			rs = pstmt.executeQuery();
			
			if(rs.next()) {
				
				return rs.getInt(1);
			}
			
			return -1;
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw new DatabaseException(e);
		}
		finally
		{
			close(pstmt, rs);
			close(conn);
		}	
	
	}
	
	public static Timestamp getSqlValueAsTimestamp(String sql, Object[] params) throws DatabaseException
	{

		Connection conn = null;
		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		try 
		{
			conn = getConnection();
			pstmt = conn.prepareStatement(sql);
			
			int index = 0;
			
			if(params != null){
				for(Object param : params)
				{
					index ++;
					
					if (param instanceof String)
					{
						pstmt.setString(index, (String) param);
					}
					else if (param instanceof Integer)
					{
						pstmt.setInt(index, ((Integer) param ).intValue());
					}
					else if (param instanceof BigDecimal)
					{
						pstmt.setBigDecimal(index, (BigDecimal) param);
					}
					else if (param instanceof Timestamp)
					{
						pstmt.setTimestamp(index, (Timestamp) param);
					}
					else if (param == null)
					{
						pstmt.setNull(index, Types.VARCHAR);
					}
					else 
					{
						throw new DatabaseException("Invalid parameter type: " + param);
					}				
				}//for
			}
			
			
			rs = pstmt.executeQuery();
			
			if(rs.next()) {
				
				return rs.getTimestamp(1);
			}
			
			return null;
		} 
		catch (Exception e) 
		{
			log.error(e);
			throw new DatabaseException(e);
		}
		finally
		{
			close(pstmt, rs);
			close(conn);
		}	
	
	}

}
