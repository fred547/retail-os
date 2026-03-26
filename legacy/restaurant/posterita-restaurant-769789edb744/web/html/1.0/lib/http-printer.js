var HTTP_Printer = {

    /* override print method */
    print: function(ip, printData) {
    	
    	var dfd = new jQuery.Deferred();
    	
    	/* hack for not network */
    	/*
		if( ip == '0.0.0.0' || ip == 'localhost'){
			
			if( !PrinterManager.getPrinterConfiguration().ENABLE ){
				
				dfd.reject("Failed to print. Printer disabled!");
				return dfd.promise();
			}
			
			var printer = PrinterManager.getPrinter();
		    printer.print(printData);
		    
		    dfd.resolve("sent");
		    return dfd.promise();
		}
		*/
    	
        var base64encodedstr = Base64.encode(printData);
                
        jQuery.post("/printing/", { 
        	'action' : 'ip-print', 
        	'ip' : ip, 
        	'job' : base64encodedstr } ,null,'json').done(function(response) {
        		
        		if(response.sent){
        			dfd.resolve("sent");
        		}
        		else
        		{
        			dfd.reject(response.error);
        		}
            
          })
          .fail(function(a,b) {
        	  
        	  dfd.reject("Failed to print. " + b);
            
          });
        
        return dfd.promise();

    }

};