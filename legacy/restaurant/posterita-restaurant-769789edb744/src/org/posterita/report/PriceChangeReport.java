package org.posterita.report;

import java.io.File;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.SimpleDateFormat;
import java.util.Date;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.posterita.database.Database;

public class PriceChangeReport extends AReport {

	private static Logger log = Logger.getLogger(PriceChangeReport.class);	
	
	public PriceChangeReport(HttpServletRequest request, HttpServletResponse response) {
		super(request, response);
	}
	
	@Override
	public File getReport() {
		
		String sql = " select date_updated, name, description, upc, sku, old_price, new_price" + 
				" from PRODUCT_UPDATED order by date_updated desc";
		
		Connection conn = null;
		Statement stmt = null;
		ResultSet rs = null;		
		
		try 
		{
			File file = File.createTempFile("PriceChangeReport", format );
			PrintWriter writer = new PrintWriter(file);
			
			String[] s = new String[]{
					"Date Updated",
					"Name",
					"Description",
					"UPC",
					"SKU",
					"Old Price",
					"New Price"
			};
			
			for(int i=0; i<s.length; i++){
				
				writer.write("\"" + s[i] + "\",");
				
			}
			
			writer.write("\n");
			
			conn = Database.getConnection();
			stmt = conn.createStatement();
			
			rs = stmt.executeQuery(sql);
			
			int i = 0;
			
			SimpleDateFormat sdf = new SimpleDateFormat("dd-MMM-yyyy HH:mm");
			
			while(rs.next()){
				
				writer.write("\"" + sdf.format(new Date(rs.getTimestamp(1).getTime())) + "\",");
				
				for(i=2; i<s.length+1; i++){
					
					writer.write("\"" + rs.getString(i) + "\",");
					
				}
								
				writer.write("\n");
			}
			
			writer.close();
			
			return file;
			
		} 
		catch (Exception e) {
			log.error(e);
		}
		finally
		{			
			Database.close(conn, stmt, rs);
		}
		
		return null;
	}

}
