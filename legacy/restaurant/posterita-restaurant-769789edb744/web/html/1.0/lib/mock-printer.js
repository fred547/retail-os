var HTMLPrinter = {
		getHTML : function( printFormat ){
			var html = "<pre><div style='text-align:center;font-size:10px;background-color: #F7F3F3;padding-bottom: 20px;overflow:auto;margin: 20px auto;width: 357px;'>";

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
                    else {
                    	
                    	html = html + '<br>~~~ ' + command + ' ~~~<br>';
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
			var list = '["MockBridge Printer 1","MockBridge Printer 2","MockBridge Printer 3","MockBridge Line Display 1","MockBridge Line Display 2"]';			
			return list;
		},
		
		addJob : function( printerName, printData ){
			this.print( printerName, printData );
		},
		
		print : function( printerName, printData ){
			console.info("#### MOCK_BRIDGE Emulator :" +  printerName);
			console.info("---------------------------------------------------");
			console.info( printData );
			
			var myWindow = this.windowObjectReference;
	    	
	    	if(myWindow == null || myWindow.closed){
	    		
	    		myWindow = window.open("", "Receipt", "width=400,height=100%");
	    		this.windowObjectReference = myWindow;
	    	}
	    	
	    	myWindow.document.write(printData);
		},
		
		init : function(){
			POSTERITA_Bridge.bridge = this;
			POSTERITA_Bridge.initialized = true;
		},
				
		info : "MOCK_BRIDGE implementation"
};

var MOCK_PRINTER = {
		
		windowObjectReference : null,
		
		getPrinterConfiguration: function() {
	        return PrinterManager.getPrinterConfiguration();
	    },
	    
	    format: function(printFormat) {

	        return HTMLPrinter.getHTML( printFormat );
	    },
	    
	    print : function( printData ) {
	    	
	    	var dfd = new jQuery.Deferred();
	    	
	    	var configuration = this.getPrinterConfiguration();	    	
	    	
	    	if( POSTERITA_Bridge.isPresent() ){
	    		
	    		POSTERITA_Bridge.print(configuration.PRINTER_NAME, printData);
	    		
	    		dfd.resolve( "printed via bridge" );
	    		
	    		return;    		
	    	}
	    	
	    	
	    	var myWindow = this.windowObjectReference;
	    	
	    	if(myWindow == null || myWindow.closed){
	    		
	    		myWindow = window.open("", "Receipt", "width=400,height=100%");
	    		this.windowObjectReference = myWindow;
	    	}
	    	
	    	myWindow.document.write(printData);
	    	
	    	
	    	
	    	console.log(printData);
	    	
	    	dfd.resolve( "printed" );
	    	
	    	return dfd.promise();
	    },
	    

	    getPrinters: function() {
	    	
	    	var printers = [
				"Mock Printer"
			];

	        var dfd = new jQuery.Deferred();
	        
	        if( POSTERITA_Bridge.isPresent() ){	    		
	    		var list = POSTERITA_Bridge.getPrintersAsJSON();	    		
	    		printers = JSON.parse(list);	
	    	}			
			
			dfd.resolve( printers );	        
	        
	    	return dfd.promise();
	    }
	    
	    
};

setTimeout(function(){
	console.log("######## Overriding default printer ########");
	alert("Mock Printer Enabled!");
	PrinterManager.getPrinter = function(){ 
		return MOCK_PRINTER; 
	};
	
	POSTERITA_Printer = MOCK_PRINTER;
	MOCK_BRIDGE.init();
	
	HTTP_Printer.print = function(ip, printData) {
		
		var dfd = new jQuery.Deferred();
		
		MOCK_PRINTER.print(printData);
		
		dfd.resolve( "printed" );
    	
    	return dfd.promise();
	};
	
	POLE_DISPLAY.display = function(a, b, c, d){
			
		var printFormat = [['FEED']];	
		
		var argument;
		for(var i=0; i<2; i++){
			argument = arguments[i];
			
			if(argument){
				printFormat.push(['N', argument]);
			}			
		}	
		
		var data = HTMLPrinter.getHTML(printFormat);
		
		MOCK_PRINTER.print(data);
	};
	
}, 0);


