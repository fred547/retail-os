package org.posterita.test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;

public class TestDB {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		try 
		{	
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			stmt.execute("DROP TABLE TABLES");
		}
		catch (Exception e) 
		{
			e.printStackTrace();
		}
		finally
		{
			Database.close(conn, stmt, rs);
		}		
		

	}

}
