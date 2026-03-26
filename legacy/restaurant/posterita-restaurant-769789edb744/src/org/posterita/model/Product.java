package org.posterita.model;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import org.apache.log4j.Logger;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;

public class Product 
{
	private static Logger log = Logger.getLogger(Product.class);
	
	public Product()
	{
		
	}
	
	public String getProductById(int m_product_id)
	{
		log.info("product --> " + m_product_id);
		
		try 
		{
			return Database.get("PRODUCT", m_product_id + "");
		} 
		catch (DatabaseException e) 
		{
			log.error(e);
		}
		
		return null;
	}
	
	public String searchBarcode(String searchTerm, int limit)
	{
		log.info(String.format("Search Term : %s", searchTerm));	
		
		long start = System.currentTimeMillis();
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		StringBuffer sb = new StringBuffer();
		
		/* escape single quote if any */
		searchTerm = searchTerm.replaceAll("'", "''");
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			if(searchTerm.trim().length() > 0) {
				
				String barcodeSql = "select json from SEARCH_PRODUCT where upc = '" + searchTerm + "'";
				
				rs = stmt.executeQuery(barcodeSql);
				
				if(rs.next()) {
					return "[" + rs.getString(1) + "]";
				}
				
				rs.close();
			}
		} 
		catch (Exception e) {
			log.error(e);
		}	
		finally
		{
			Database.close(conn, stmt, rs);
			
			log.info(String.format("Execute in %d ms", System.currentTimeMillis() - start));
		}
		
		return sb.toString();
	}
	public String search(String searchTerm, String filterClause, int limit)
	{
		log.info(String.format("Search Term : %s, Filter : %s", searchTerm, filterClause));	
		
		long start = System.currentTimeMillis();
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		StringBuffer sb = new StringBuffer();
		
		/* escape single quote if any */
		searchTerm = searchTerm.replaceAll("'", "''");
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			if(searchTerm.trim().length() > 0) {
				
				String barcodeSql = "select json from SEARCH_PRODUCT where upc = '" + searchTerm + "'";
				
				rs = stmt.executeQuery(barcodeSql);
				
				if(rs.next()) {
					return "[" + rs.getString(1) + "]";
				}
				
				rs.close();
			}
			
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
					" ) " +
					filterClause +
					" order by name FETCH FIRST " + limit + " ROWS ONLY";
			
			sql = sql.replaceAll("SEARCH_TERM", searchTerm);
			
			rs = stmt.executeQuery(sql);
			
			String json = null;
			
			sb.append("[");
			
			while(rs.next())
			{				
				json = rs.getString(1);
				
				if(sb.length() == 1)
				{
					sb.append("");
				}
				else
				{
					sb.append(",");
				}
				
				sb.append( json );
			}
			
			sb.append("]");
		} 
		catch (Exception e) {
			log.error(e);
		}	
		finally
		{
			Database.close(conn, stmt, rs);
			
			log.info(String.format("Execute in %d ms", System.currentTimeMillis() - start));
		}
		
		return sb.toString();
	}
	
	public String distinct(String column, String filterClause)
	{
		log.info(String.format("Distinct : %s, Filter : %s", column, filterClause));	
		
		long start = System.currentTimeMillis();
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		StringBuffer sb = new StringBuffer();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
						
			String sql = "select distinct COLUMN from search_product where COLUMN is not null FILTER order by COLUMN";
			
			sql = sql.replaceAll("COLUMN", column);
			sql = sql.replaceFirst("FILTER", filterClause);
			
			rs = stmt.executeQuery(sql);
			
			String json = null;
			
			sb.append("[");
			
			while(rs.next())
			{				
				json = rs.getString(1);
				
				if(sb.length() == 1)
				{
					sb.append("");
				}
				else
				{
					sb.append(",");
				}
				
				sb.append("\"").append( json ).append("\"");
			}
			
			sb.append("]");
		} 
		catch (Exception e) {
			log.error(e);
		}	
		finally
		{
			Database.close(conn, stmt, rs);
			
			log.info(String.format("Execute in %d ms", System.currentTimeMillis() - start));
		}
		
		return sb.toString();
	}
	
	public String filter(String filter, int limit)
	{
		log.info(String.format("Filter : %s, Limit : %s", filter, limit));	
		
		long start = System.currentTimeMillis();
		
		Connection conn = null;
		ResultSet rs = null;
		Statement stmt = null;
		
		StringBuffer sb = new StringBuffer();
		
		try 
		{
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
						
			String sql = "select json from search_product where name is not null _FILTER  order by name FETCH FIRST _LIMIT ROWS ONLY";
			
			sql = sql.replaceAll("_FILTER", filter);
			sql = sql.replaceFirst("_LIMIT", limit + "");
			
			rs = stmt.executeQuery(sql);
			
			String json = null;
			
			sb.append("[");
			
			while(rs.next())
			{				
				json = rs.getString(1);
				
				if(sb.length() == 1)
				{
					sb.append("");
				}
				else
				{
					sb.append(",");
				}
				
				sb.append( json );
			}
			
			sb.append("]");
		} 
		catch (Exception e) {
			log.error(e);
		}	
		finally
		{
			Database.close(conn, stmt, rs);
			
			log.info(String.format("Execute in %d ms", System.currentTimeMillis() - start));
		}
		
		return sb.toString();
	}
	
	public String getProductPrice(int product_id, int pricelist_id, int default_pricelist_id) {
		
		String sql = "select * from product_price where m_product_id = ? and m_pricelist_id = ?";
		String result = null;
		
		try 
		{
			result = Database.getSqlValue(sql, new Object[] {product_id, pricelist_id});
			
			if(result == null) {
				
				result = Database.getSqlValue(sql, new Object[] {product_id, default_pricelist_id});
				
			}
			
		} 
		catch (DatabaseException e) 
		{
			e.printStackTrace();
		}
		
		return result;
	}
}
