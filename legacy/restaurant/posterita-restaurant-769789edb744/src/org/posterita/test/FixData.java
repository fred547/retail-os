package org.posterita.test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.FixDataException;

public class FixData {
	
	private static Log log = LogFactory.getLog(FixData.class);	
	
	public static void fix() throws FixDataException
	{
		
	}
	
	public static void main(String[] args) throws DatabaseException, FixDataException
	{
		Database.initialize();
		
		FixData.fix();		
	}

}
