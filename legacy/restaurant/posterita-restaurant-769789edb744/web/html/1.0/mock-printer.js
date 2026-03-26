var HTMLPrinter = {
		getHTML : function( printFormat ){
			var html = "<pre><div style='text-align:center;font-size:10px;background-color: #F7F3F3;padding-bottom: 20px;overflow:auto;'>";

			/* parse print format */
            for (var i = 0; i < printFormat.length; i++)
            {
                var line = printFormat[i];

                if (line.length == 1)
                {
                    var command = line[0];

                    if( 'FEED' == command )
                    {
                    	html = html + '<br><br>';
                    }
                }
                else
                {
                	var font = line[0];
                    var text = line[1];

                    if (text == null) continue;

                    if (text.length == 0) text = "&nbsp;";

                    if (line.length > 2) {
                        var label = line[2];
                        text = label + text;
                    }

                    if( 'B' == font )
                    {
                    	html = html + ( '<div><strong>' + text + '</strong></div>' );
                    }
                    else if( 'H1' == font || 'H2' == font || 'H3' == font || 'H4' == font )
                    {
                    	html = html + ( '<p style="font-size:16px;margin:6px;">' + text + '</p>' );
                    }
                    else if('BASE64' == font)
                    { 
                    	 var encoded = text;
                    	 html = html + Base64.decode(encoded) + '<br>';
                    }
                    else
                    {
                    	html = html + ( '<div>' + text + '</div>' );
                    }

                }
            }

            html = html + '</div></pre>';

            return html;
		}
};


var MOCK_BRIDGE = {
		
		getPrintersAsJSON : function(){
			var list = '["Mock Printer 1","Mock Printer 2","Mock Printer 3","Mock Line Display 1","Mock Line Display 2"]';			
			return list;
		},
		
		addJob : function( printerName, printData ){
			console.info("#### Printer Emulator :" +  printerName);
			console.info("---------------------------------------------------");
			console.info( printData );
		},
		
		init : function(){
			POSTERITA_Bridge.bridge = this;
			POSTERITA_Bridge.initialized = true;
		},
				
		info : "MOCK_BRIDGE implementation"
};

var MOCK_PRINTER = {
		
		getPrinterConfiguration: function() {
	        return PrinterManager.getPrinterConfiguration();
	    },
	    
	    format: function(printFormat) {

	        return HTMLPrinter.getHTML( printFormat );
	    },
	    
	    print : function( printData ) {
	    	
	    	var dfd = new jQuery.Deferred();
	    	
	    	var myWindow = window.open("", "Receipt", "width=400,height=600");
  			myWindow.document.write(printData);
	    	
	    	/*
	    	ons.notification.alert({
				  messageHTML: '<div>' + printData + '</div>',
				  title: 'Mock Printer',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
	    	*/
	    	
	    	console.log(printData);
	    	
	    	dfd.resolve( "printed" );
	    	
	    	return dfd.promise();
	    },
	    

	    getPrinters: function() {

	        var dfd = new jQuery.Deferred();

			var printers = [
				"Mock Printer"
			];
			
			dfd.resolve( printers );	        
	        
	    	return dfd.promise();
	    }
	    
	    
};

setTimeout(function(){
	console.log("######## Overriding default printer ########");
	PrinterManager.getPrinter = function(){ 
		return MOCK_PRINTER; 
	};
}, 0);


