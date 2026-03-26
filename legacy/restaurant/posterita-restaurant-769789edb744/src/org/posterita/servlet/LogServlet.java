package org.posterita.servlet;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FileInputStream;
import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

public class LogServlet extends HttpServlet {
	
	private static Logger log = Logger.getLogger(LogServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
		String dir = System.getProperty("user.dir");
		String separator = System.getProperty("file.separator");
		
		String path = dir + separator + "logs" + separator + "error.log";
		
		try 
		{
			BufferedInputStream bis = new BufferedInputStream(new FileInputStream(path));
			BufferedOutputStream bos = new BufferedOutputStream(response.getOutputStream());
			
			byte[] b = new byte[1024];
			int len = 0;
			
			while(( len = bis.read(b)) != -1){
				bos.write(b, 0, len);					
			}
			
			bos.flush();
			bis.close();
			
		} 
		catch (Exception e) 
		{
			log.error(e);
		}
    }
	
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
		doGet(request, response);
    }

}
