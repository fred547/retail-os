package org.posterita.test;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import org.json.JSONArray;
import org.json.JSONObject;
import org.posterita.database.Database;

public class SearchProduct {

	public static void main(String[] args) throws Exception 
	{
		//Database.executeUpdate("DROP TABLE SEARCH_PRODUCT");
		
		Database.initialize();
		
		//initSearchProduct();
		
		/*
		 " AND (m_product.upc = 'SEARCH_TERM' " +
    		" OR m_product.sku = 'SEARCH_TERM' " +
    		" OR LOWER(m_product.name) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product_category.name) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product.primarygroup) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product.description) LIKE LOWER('%SEARCH_TERM%') " +
    		" OR LOWER(m_product.group1) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product.group2) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product.group3) LIKE LOWER('SEARCH_TERM%') " +
    		" OR LOWER(m_product.group4) LIKE LOWER('SEARCH_TERM%'))
		 */
		
		String sql = "select json from SEARCH_PRODUCT where (" +
				" upc = 'SEARCH_TERM' " +
				" OR sku = 'SEARCH_TERM' " +
	    		" OR LOWER(name) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(productcategory) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(primarygroup) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(description) LIKE LOWER('%SEARCH_TERM%') " +
	    		" OR LOWER(group1) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(group2) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(group3) LIKE LOWER('SEARCH_TERM%') " +
	    		" OR LOWER(group4) LIKE LOWER('SEARCH_TERM%') " +
	    		
				" OR LOWER(group5) LIKE LOWER('SEARCH_TERM%') " +
				" OR LOWER(group6) LIKE LOWER('SEARCH_TERM%') " +
				" OR LOWER(group7) LIKE LOWER('SEARCH_TERM%') " +
				" OR LOWER(group8) LIKE LOWER('SEARCH_TERM%') " +

				") order by name FETCH FIRST 5 ROWS ONLY";
		
		sql = sql.replaceAll("SEARCH_TERM", "White");
		
		sql = "select json from SEARCH_PRODUCT where upc = '6091221000133' ";
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		long start = 0;
		long end = 0;
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			start = System.currentTimeMillis();
			
			rs = stmt.executeQuery(sql);
			
			end = System.currentTimeMillis();
			
			String json = null;
			
			System.out.println("Execution time : " + (end - start));
			
			while(rs.next()){
				
				json = rs.getString(1);
				
				System.out.println(json);
			}
		} 
		catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}	
		finally
		{
			Database.close(conn, stmt, rs);
		}
			

	}	
	
	private static void initSearchProduct() throws Exception
	{
		Database.executeUpdate("TRUNCATE TABLE SEARCH_PRODUCT");
		
		String s = Database.getAllFrom("PRODUCT");
		
		JSONArray records = new JSONArray(s);
		
		JSONObject record = null;
		
		String table = "SEARCH_PRODUCT";
		
		File tempFile = File.createTempFile(table + "json-data", "import");				
		BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile));
		
		for(int i=0; i<records.length(); i++)
		{
			record = records.getJSONObject(i);
			
			/*
			 M_PRODUCT_ID int,"
			+ " M_PRODUCT_PARENT_ID int,"
			+ " NAME varchar(60),"
			+ " DESCRIPTION varchar(60),"
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
			+ "	Group8 varchar(60)"
			
			
			"editpriceonfly": "N",
    "isageverified": "N",
    "m_product_id": 10356800,
    "isserialno": "N",
    "description": "Coffee",
    "editdesconfly": "N",
    "c_uom_id": 100,
    "id": 10356800,
    "sku": "",
    "revenue_recognition": "",
    "ismodifiable": "Y",
    "pricestd": 15,
    "c_taxcategory_id": 10011540,
    "group4": "",
    "group3": "",
    "upc": "",
    "ismodifier": "N",
    "group2": "",
    "pricelimit": 15,
    "group1": "",
    "pricelist": 15,
    "name": "Coffee",
    "m_product_parent_id": "",
    "primarygroup": "",
    "qtyonhand": -7775,
    "product_category": "Standard"
			 */
			
			writer.write("^");
			writer.write(record.getString("m_product_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("m_product_parent_id").length() == 0 ? "0" : record.getString("m_product_parent_id"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("name"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("description"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("upc"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("sku"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("primarygroup"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.getString("product_category"));
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group1") ? record.getString("group1") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group2") ? record.getString("group2") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group3") ? record.getString("group3") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group4") ? record.getString("group4") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group5") ? record.getString("group5") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group6") ? record.getString("group6") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group7") ? record.getString("group7") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.has("group8") ? record.getString("group8") : "");
			writer.write("^");
			writer.write("%");
			writer.write("^");
			writer.write(record.toString());
			writer.write("^");
			writer.write("\n");
		}
		
		writer.flush();
		writer.close();
		
		Connection conn = Database.getConnection();
		
		/* https://db.apache.org/derby/docs/10.7/tools/rtoolsimport64241.html#rtoolsimport64241__rtoolsimportreplace */
		PreparedStatement ps=conn.prepareStatement("CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (?,?,?,?,?,?,?)");
		
	    ps.setString(1, null);
	    ps.setString(2, table.toUpperCase());
	    ps.setString(3, tempFile.getAbsolutePath());
	    ps.setString(4, "%");
	    ps.setString(5, "^");
	    ps.setString(6, null);
	    ps.setInt(7, 1); 
	    ps.execute();
		
		ps.close();		
		conn.close();
		
		tempFile.delete();
	}
	

}
