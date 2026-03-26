package org.posterita.servlet;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.lang.reflect.Constructor;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.posterita.report.AReport;

public class ReportServlet extends HttpServlet {
	
	private static Logger log = Logger.getLogger(ReportServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {     
		String reportName = request.getParameter("name");
		
		try 
		{
			Class<? extends AReport> clazz  = Class.forName("org.posterita.report." + reportName).asSubclass(AReport.class);
			Constructor<? extends AReport> c = clazz.getConstructor(HttpServletRequest.class, HttpServletResponse.class);
			
			AReport report = c.newInstance(request, response);
			File file = report.getReport();			

	        response.setStatus(HttpServletResponse.SC_OK);
	        
			if("json".equals(report.getFormat())) {
				
				response.setContentType("text/javascript");
			}
			else
			{
				response.setHeader("Content-Type", "text/csv");
		        response.setHeader("Content-Disposition", "attachment;filename=\"" + reportName + ".csv\""); 
			}			
	        
	        BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
			BufferedOutputStream bos = new BufferedOutputStream(response.getOutputStream());
			
			byte[] b = new byte[1024];
			int len = 0;
			
			while(( len = bis.read(b)) != -1){
				bos.write(b, 0, len);					
			}
			
			bos.flush();
			bis.close();
			// remove temp file
			file.delete();
	        
			
		} catch (Exception e) {
			log.error(e);
		}
	
    }
	
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
		doGet(request, response);
    }

}
