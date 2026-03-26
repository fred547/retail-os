package org.posterita.report;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public abstract class AReport implements IReport {
	
	protected String format = "json";

	public AReport(HttpServletRequest request, HttpServletResponse response)
	{
		this.format = request.getParameter("format");
	}
	
	public String getFormat()
	{
		return this.format;
	}
}
