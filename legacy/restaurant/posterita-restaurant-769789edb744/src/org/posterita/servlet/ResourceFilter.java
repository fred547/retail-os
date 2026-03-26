package org.posterita.servlet;

import java.io.IOException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class ResourceFilter implements Filter {

	@Override
	public void destroy() {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		
		HttpServletRequest http_request = (HttpServletRequest)request;
        HttpServletResponse http_response = (HttpServletResponse)response;
        
        http_response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        http_response.setHeader("Pragma", "no-cache");
        http_response.setDateHeader("Expires", 0);
		
        chain.doFilter(http_request, http_response);
	}

	@Override
	public void init(FilterConfig arg0) throws ServletException {
		// TODO Auto-generated method stub
		
	}
}