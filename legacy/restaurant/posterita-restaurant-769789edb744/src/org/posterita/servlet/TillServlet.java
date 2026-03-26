package org.posterita.servlet;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.json.JSONObject;
import org.posterita.exception.TillException;
import org.posterita.model.CashierControl;
import org.posterita.model.Till;

public class TillServlet extends HttpServlet
{
	private static Logger log = Logger.getLogger(TillServlet.class);
			
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
    	String json = request.getParameter("json");
    	
    	try 
    	{
			if(json == null){
				return "{\"error\" : \"Invalid Request\"}";
			}
			
			
			JSONObject params = new JSONObject(json);
			
			if(!params.has("action")){
				return "{\"error\" : \"Invalid Request. Missing parameter action\"}";
			}
			
			String action = params.getString("action");
			
			if(!params.has("terminal_id")){
				return "{\"error\" : \"Invalid Request. Missing parameter terminal_id\"}";
			}
			
			int terminal_id = params.getInt("terminal_id");
			
			if("open".equals(action) || "close".equals(action) || "saveCashierControl".equals(action)){
				
				if(!params.has("user_id")){
					return "{\"error\" : \"Invalid Request. Missing parameter user_id\"}";
				}
				
				int user_id = params.getInt("user_id");
				
				if(!params.has("date")){
					return "{\"error\" : \"Invalid Request. Missing parameter date\"}";
				}
				
				Timestamp date = Timestamp.valueOf(params.getString("date"));
				
				JSONObject result;
				
				try 
				{
					if("open".equals(action)){
						// open
						if(!params.has("float_amount")){
							return "{\"error\" : \"Invalid Request. Missing parameter float_amount\"}";
						}
						
						double float_amount = params.getDouble("float_amount");
						
						result = Till.open(terminal_id, user_id, new BigDecimal(float_amount).setScale(2, RoundingMode.HALF_UP), date);
					}
					else if("saveCashierControl".equals(action)){
						// saveCashierControl
						if(!params.has("cash_amount_entered")){
							return "{\"error\" : \"Invalid Request. Missing parameter cash_amount_entered\"}";
						}
						double cash_amount_entered = params.getDouble("cash_amount_entered");
						
						if(!params.has("externalcard_amount_entered")){
							return "{\"error\" : \"Invalid Request. Missing parameter externalcard_amount_entered\"}";
						}
						double externalcard_amount_entered = params.getDouble("externalcard_amount_entered");
						
						result = CashierControl.save(date, user_id, terminal_id, new BigDecimal(cash_amount_entered).setScale(2, RoundingMode.HALF_UP), new BigDecimal(externalcard_amount_entered).setScale(2, RoundingMode.HALF_UP));
					}
					else 
					{
						// close
						if(!params.has("balance")){
							return "{\"error\" : \"Invalid Request. Missing parameter balance\"}";
						}
						
						double balance = params.getDouble("balance");
						
						if(!params.has("external_card_amount")){
							return "{\"error\" : \"Invalid Request. Missing parameter external_card_amount\"}";
						}
						
						double external_card_amount = params.getDouble("external_card_amount");
						
						boolean syncDraftAndOpenOrders = params.getBoolean("syncDraftAndOpenOrders");
						
						result = Till.close(terminal_id, user_id, new BigDecimal(balance).setScale(2, RoundingMode.HALF_UP), new BigDecimal(external_card_amount).setScale(2, RoundingMode.HALF_UP), date, syncDraftAndOpenOrders);
					}					
					
					return result.toString();
				} 
				catch (TillException e) 
				{
					// TODO Auto-generated catch block
					return "{\"error\" : \"" + e.getMessage() + "\"}";
				}
				
			}			
			else if("isOpen".equals(action) || "isClose".equals(action)){
				
				if("isOpen".equals(action)) 
				{
					boolean isOpen = Till.isOpen(terminal_id);
					return "{\"isopen\" : "+ isOpen + "}";
				}
				else 
				{
					boolean isClose = Till.isClose(terminal_id);
					return "{\"isclose\" : " + isClose + "}";
				}
			}
			else if("validateCashAmount".equals(action)){
				
				if(!params.has("cash_amount")){
					return "{\"error\" : \"Invalid Request. Missing parameter cash_amount\"}";
				}
				
				double cash_amount = params.getDouble("cash_amount");				
				BigDecimal expectedCashAmount = new BigDecimal(cash_amount).setScale(2, RoundingMode.HALF_UP);
				
				boolean isValid = Till.validateCashAmount(terminal_id, expectedCashAmount);
				return "{\"isvalid\" : "+ isValid + "}";
			}
			else if("getTenderAmounts".equals(action)){
				
				return Till.getTenderAmounts(terminal_id).toString();
			}
			else
			{
				return "{\"error\" : \"Invalid Request\"}";
			}
		} 
    	catch (Exception e) {
			log.error(e);
		}
    	
    	return "{\"error\" : \"Server Error\"}";
    }

}
