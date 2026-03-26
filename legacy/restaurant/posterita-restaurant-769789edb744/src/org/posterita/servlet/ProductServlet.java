package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.posterita.model.Product;

public class ProductServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(ProductServlet.class);
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {        
        doPost(request, response);
    }
    
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
    	response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");			
    	response.addHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Codingpedia");
    	
    	String result = execute(request, response);
    	
    	response.setContentType("text/javascript");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().print(result);
    }
    
    private String execute(HttpServletRequest request, HttpServletResponse response)
    {
    	String action = request.getParameter("action");
    	String searchTerm = request.getParameter("searchTerm");
    	String filterClause = request.getParameter("filterClause");
    	String limit = request.getParameter("limit");
    	
    	if(searchTerm == null)
    	{
    		searchTerm = "";
    	}
    	
    	if(filterClause == null)
    	{
    		filterClause = "";
    	}
    	
    	if(limit == null)
    	{
    		limit = "50";
    	}
    	
    	int max = 50;
    	
    	try 
    	{
			max = Integer.valueOf(limit);
		} 
    	catch (NumberFormatException e) 
    	{
    		log.error(e);
		}
    	
    	String json = null;
    	Product product = new Product();
    	
    	//search parents first    	 	
    	json = product.search(searchTerm, filterClause + " and M_PRODUCT_PARENT_ID = 0 ", max);
    	
    	if(json.length() == 2) // [] empty array
    	{
    		//search children
    		json = product.search(searchTerm, filterClause + " and M_PRODUCT_PARENT_ID > 0 ", max);
    	}
    	
    	return json;
    }

}
