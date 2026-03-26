APP.RESTAURANT = {};

APP.RESTAURANT.NOTIFIER = {
		"email" : "praveen.beekoo@posterita.com"
};

APP.RESTAURANT.init = function(){	
	this.TAKE_AWAY_TICKET_SEQUENCE = 0;
	this.DINE_IN_TICKET_SEQUENCE = 0;
};

APP.RESTAURANT.getTakeAwayTicketNo = function(){
	
	this.TAKE_AWAY_TICKET_SEQUENCE ++;
	
	return this.TAKE_AWAY_TICKET_SEQUENCE;
};

APP.RESTAURANT.getDineInTicketNo = function(){
	
	this.DINE_IN_TICKET_SEQUENCE ++;
	
	return this.DINE_IN_TICKET_SEQUENCE;
};

APP.RESTAURANT.printBill = function( order ){
	
	var receiptJSON = APP.ORDER.getReceiptJSON(order);
	var billFormat = APP.RESTAURANT.getBillFormat( receiptJSON );
	
	PrinterManager.print(billFormat);
};

APP.RESTAURANT.getBillFormat = function( receiptJSON ){

	var receipt = receiptJSON;
	
	var z = {
			  "companyName": "",
			  "showStoreName": true,
			  "showStoreAddress": true,
			  "showPhone": true,
			  "showTaxId": true,
			  "additionalFields": "",
			  "salesReceiptHeader": "",
			  "showTerminalName": true,
			  "showBarcode": true,
			  "footerMessage": "",
			  "showLineTax" : false,
			  "showLogo": false
	};
	
	if( receipt.header.receiptFormat && receipt.header.receiptFormat.length > 0 ){
		
		z = JSON.parse( receipt.header.receiptFormat );
		
	}
	
	var showLineTax = z.showLineTax;
    var TaxCodeResolver = {
    		count : 0,
    		map : {},
    		getCode : function(tax){
    			
    			if(this.map[tax]){
    				
    				return this.map[tax];
    			}
    			else
    			{
    				this.count ++;
    				this.map[tax] = "T" + this.count;
    				return this.map[tax];
    			}    			
    		},
    		
    		getLegend : function(){
    			
    			var legend = "";
    			
    			var taxes = Object.keys(this.map);
    			
    			for(var i=0; i<taxes.length; i++){
    				
    				if(i>0){
    					
    					legend += ", ";
    				}
    				
    				legend += ( taxes[i] + " = " + this.map[taxes[i]] );
    			}
    			
    			return legend;
    		}
    };

    var configuration = PrinterManager.getPrinterConfiguration();

    var LINE_WIDTH = configuration.LINE_WIDTH;
    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
    
    
    var tableName = "?";
    
    var info = receipt.header.commandInfo;
    var tableName = info['tableId'];
    
    receiptTitle = "Bill Table #" + tableName;
      

    var printFormat = [];
    printFormat.push(['FEED']);
    printFormat.push(['H1', '*** TABLE #' + tableName  + ' BILL ***']);
    printFormat.push(['FEED']); 
    
    if(z.showLogo == true){
    	
    	printFormat.push( ['NVRAM'] );
    }
    
        
    printFormat.push( ['FEED'] );
    printFormat.push( ['CENTER'] );
    printFormat.push( ['N', LINE_SEPARATOR] );
    printFormat.push( ['H3', z.companyName || receipt.header.client ] );    
    
    if( z.showStoreName == true ){    	
    	
    	printFormat.push( ['H4', receipt.header.orgName] );
    	
    }
    
    /*
    if( z.showStoreAddress == true ){    	
    	
    	if (receipt.header.orgAddress1 != '')
 	    {
 	    	printFormat.push(['B', receipt.header.orgAddress1]);
 	    }
 	    
 	    if(receipt.header.orgAddress2 !='')
 	    {
 	    	printFormat.push(['B', receipt.header.orgAddress2]);	
 	    }
 	    
 	    if(receipt.header.orgCity !='')
 	    {
 	    	printFormat.push(['B', receipt.header.orgCity]);	
 	    } 
    	
    }
    
    if( z.showPhone == true ){ 
    	
    	if(receipt.header.orgPhone !='')
        {
        	printFormat.push(['N', receipt.header.orgPhone, 'Phone: ']);	
        } 
        
        if(receipt.header.orgFax !='')
        {
        	printFormat.push(['N', receipt.header.orgFax, 'FAX: ']);	
        }
    }
    
    if( z.showTaxId == true ){
    	
    	if(receipt.header.orgTaxId !='')
	    {
	    	printFormat.push(['N', receipt.header.orgTaxId, taxLabel]);	
	    } 
    	
    }   
    
    if( z.additionalFields && z.additionalFields.length > 0 ){
    	
    	printFormat.push(['N', z.additionalFields ]);	 
    	
    } 
    
    
    var TERMINAL_NAME = ['?'];
    
    if( z.showTerminalName == true ){
    	
    	TERMINAL_NAME = ['N', JSReceiptUtils.format('Terminal' + ': ' + receipt.header.terminal, LINE_WIDTH)];
    }
    
    */
        
        printFormat.push(['N', LINE_SEPARATOR],
        //['H3', receiptTitle],
        ['FEED'],
        // ['N', JSReceiptUtils.format((receipt.header.soTrx ? I18n.t('Customer') : I18n.t('Vendor')) + ': ' + receipt.header.bpName + ((receipt.header.bpName2 != null && receipt.header.bpName2.length > 0) ? (' ' + receipt.header.bpName2) : ''), LINE_WIDTH)],
        //TERMINAL_NAME,
        ['N', JSReceiptUtils.format(I18n.t('Waiter') + ': ' + receipt.header.salesRep, LINE_WIDTH)],
        //['N', JSReceiptUtils.format(I18n.t('Status') + ': ' + receipt.header.docStatusName, LINE_WIDTH)],
        //['N', JSReceiptUtils.format(I18n.t('Payment') + ': ' + receipt.header.paymentRuleName + " " + receipt.header.creditCardDetails, LINE_WIDTH)],
        ['N', JSReceiptUtils.format(I18n.t('Order No') + ': ' + receipt.header.documentNo, LINE_WIDTH)],
        ['N', JSReceiptUtils.format(moment(receipt.header.dateOrdered).format("ddd, DD MMM YYYY, HH:mm"), LINE_WIDTH)],
        
        ['CENTER'],
        ['N', LINE_SEPARATOR],
        ['B', JSReceiptUtils.format(I18n.t('Name'), LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 ))) + JSReceiptUtils.format(I18n.t('Price'), 8, true) + JSReceiptUtils.format(I18n.t('Qty'), 6, true) + JSReceiptUtils.format(I18n.t('Total'), 12, true) + ( showLineTax ? JSReceiptUtils.format("",3) : "")],
        ['N', LINE_SEPARATOR]);
        
        


    /*-----------------------------------------------------------------------------------------*/
    /* add order body */
    for (var i = 0; i < receipt.lines.length; i++) 
    {
        var line = receipt.lines[i];

        var text = null;        
       
        if( receiptJSON.printName == true ) 
        {
        	text = line.productName;
        }
        else if( receiptJSON.printBarcode == true ) 
        {
        	text = line.upc || line.productName;
        }
        else
        {
        	text = line.description || line.productName;
        }
        
        while (text.length > (LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 )))) {
            printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
            text = text.substr(LINE_WIDTH);
        }

        var s = (JSReceiptUtils.format(text, LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 ))) 
        		+ JSReceiptUtils.format(Number(line.priceEntered).toFixed(2), 8, true) 
        		+ JSReceiptUtils.format(line.qtyEntered, 6, true) 
        		+ JSReceiptUtils.format(Number(line.lineNetAmt).toFixed(2), 12, true)
        		+ ( showLineTax ? (" " + TaxCodeResolver.getCode(line.taxName)) : '') );

        printFormat.push(['N', s]);
        
        if( ( receiptJSON.printName == true || receiptJSON.printBarcode == true ) && receiptJSON.printDescription == true ) {
        	
        	if ( line.description != null && line.description.length > 0 ) {
                printFormat.push(['N', JSReceiptUtils.format(line.description, LINE_WIDTH)]);
            }
        }

        if (line.discountMessage != null) {
            printFormat.push(['N', JSReceiptUtils.format(line.discountMessage, LINE_WIDTH)]);
        }

        if (line.boms != null)
            for (var j = 0; j < line.boms.length; j++) {
                var bom = line.boms[j];

                var text = " " + (bom.description || bom.productName);
                while (text.length > (LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 )))) {
                    printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
                    text = text.substr(LINE_WIDTH);
                }

                var s = (JSReceiptUtils.format(text, LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 ))) + JSReceiptUtils.format(Number(bom.priceEntered).toFixed(2), 8, true) + JSReceiptUtils.format(bom.qtyEntered, 6, true) + JSReceiptUtils.format(Number(bom.lineNetAmt).toFixed(2), 12, true) + ( showLineTax ? JSReceiptUtils.format("",3) : ""));

                printFormat.push(['N', s]);

            }

        if (line.modifiers != null)
            for (var j = 0; j < line.modifiers.length; j++) {
                var modifier = line.modifiers[j];

                var text = " " + (modifier.description || modifier.productName);
                while (text.length > (LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 )))) {
                    printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
                    text = text.substr(LINE_WIDTH);
                }

                var s = (JSReceiptUtils.format(text, LINE_WIDTH - (26 + ( showLineTax ? 3 : 0 ))) + JSReceiptUtils.format(Number(modifier.priceEntered).toFixed(2), 8, true) + JSReceiptUtils.format('', 6, true) + JSReceiptUtils.format(Number(modifier.lineNetAmt).toFixed(2), 12, true) + ( showLineTax ? JSReceiptUtils.format("",3) : ""));

                printFormat.push(['N', s]);

            }
    }

    /* add order total*/
    printFormat.push(['N', LINE_SEPARATOR]);

    var cursymbol = receipt.header.currencySymbol;

    var subTotalStr = JSReceiptUtils.format(I18n.t('Sub Total') +' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(receipt.header.subTotal).toFixed(2), 12, true);

    for (var j = 0; j < receipt.taxes.length; j++) {
        var tax = receipt.taxes[j];
        var taxStr = JSReceiptUtils.format(I18n.t('Tax') + ' - ' + tax.name + ' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(tax.amt).toFixed(3), 12, true);
        printFormat.push(['N', taxStr]);

    }

    // var taxTotalStr = JSReceiptUtils.format('Tax (' + cursymbol + ')',LINE_WIDTH-12) + JSReceiptUtils.format(Number(receipt.header.taxTotal).toFixed(2),12,true);
    var discountStr = JSReceiptUtils.format(I18n.t('Discount') + ' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(receipt.header.discountAmt).toFixed(2), 12, true);
    var writeOffStr = JSReceiptUtils.format(I18n.t('Write Off') + ' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(receipt.header.writeOffAmt).toFixed(2), 12, true);

    //var totalStr = JSReceiptUtils.format(I18n.t('Grand Total') + ' (' + cursymbol + ')', LINE_WIDTH - 18) + JSReceiptUtils.format(receipt.header.qtyTotal, 6, true) + JSReceiptUtils.format(Number(receipt.header.grandTotal).toFixed(2), 12, true)
    
    
    printFormat.push(['N', subTotalStr]);
    //printFormat.push(['N', taxTotalStr]);

    if (receipt.header.discountAmt > 0) {
        printFormat.push(['N', discountStr]);
    }

    if (receipt.header.writeOffAmt > 0) {
        printFormat.push(['N', writeOffStr]);
    }

    printFormat.push(['N', LINE_SEPARATOR]);
    
    var totalStr = JSReceiptUtils.format(I18n.t('Total') + ' (' + cursymbol + ')', 20 - 10) + JSReceiptUtils.format(Number(receipt.header.grandTotal).toFixed(2), 10, true)
    printFormat.push(['H3', totalStr]);
    
    printFormat.push(['N', LINE_SEPARATOR]);
    printFormat.push(['N', '']);

    
    if( showLineTax ){
    	
    	printFormat.push(['FEED']);
    	printFormat.push(['N', JSReceiptUtils.format(TaxCodeResolver.getLegend(), LINE_WIDTH)]);
    	printFormat.push(['FEED']);    	
    }
    
    printFormat.push(['FEED']);
    
    if( z.showBarcode == true ){
    	
    	printFormat.push(['BARCODE', receipt.header.documentNo]);
    	
    }
    

    printFormat.push(['FEED']);
    printFormat.push(['FEED']);
    printFormat.push(['H1', '*** TABLE #' + tableName  + ' BILL ***']);
    printFormat.push(['FEED']); 
    
    /* send print format to printer */

    printFormat.push(['PAPER_CUT']);

    return printFormat;

};

APP.RESTAURANT.printSwitchTableNote = function(from_table, to_table, waiter){
	
	var LINE_WIDTH = 24;
	var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);		
	
	
	var title = "Switch Table";
	var date = moment().format('DD-MMM-YY HH:mm');
	
	var printFormat = [];
	
	printFormat.push( ['FEED'] );
	printFormat.push( ['FEED'] );
	printFormat.push( ['FEED'] );
	
    printFormat.push( ['CENTER'] );
    printFormat.push( ['H1', LINE_SEPARATOR] );
    printFormat.push( ['H1', JSReceiptUtils.format( '*** ' + title + ' ***', 24)] );
    printFormat.push( ['H1', LINE_SEPARATOR] );
    printFormat.push( ['FEED'] );
    
    printFormat.push( ['H1', JSReceiptUtils.format("#" + from_table.name + " to #" + to_table.name , 24)]);
    
    printFormat.push( ['FEED'] );
    //printFormat.push( ['H1', JSReceiptUtils.format(title, 24)]);
    printFormat.push( ['H1', JSReceiptUtils.format("Waiter: " + waiter, 24)]);
    printFormat.push( ['H1', JSReceiptUtils.format("Printed: " + date, 24)]);
	printFormat.push(['FEED']);
	printFormat.push(['PAPER_CUT']);
	
	var configuration = PrinterManager.getPrinterConfiguration();
	var printers = configuration['KITCHEN_PRINTERS'];
	
	var printer;
	var printer_ip;
	var printer_name;
	var printer_lines;
	
	var printData = POSTERITA_Printer.format(printFormat);
	
	for(var p=0; p<printers.length; p++)
	{
		printer = printers[p];
		printer_ip = printer['ip'];
		printer_name = printer['name'];
		
		
		HTTP_Printer.print( printer_ip, printData ).done(function(msg){
			
		}).fail(function(error){
			
			alert(error);
			
		}).always(function(){
			
			console.log( printData );
			
		});
		
	}
	
}

APP.RESTAURANT.printKitchenReceipts = function( title, salesRepId, shoppingCart, order ){
		
	var editableLines = [];
	var voidedLines = [];
	
	var shoppingCartLine;
	var shoppingCartLines = shoppingCart.getLines();
	
	for(var i = 0; i < shoppingCartLines.length; i++)
	{
		shoppingCartLine = shoppingCartLines[i];
		
		if(shoppingCartLine.editable && shoppingCartLine.editable == true){
			editableLines.push(shoppingCartLine);
			
			if(shoppingCartLine.qty < 0){
				voidedLines.push(shoppingCartLine);
			}
		}
	}
	
	if( editableLines.length > 0 )
	{
		/*
		if(title.indexOf('Table #') >= 0){
			APP.RESTAURANT.printWaiterReceipt( title, salesRepId, shoppingCart );
		}
		*/
		
		//disable coupon printing
		//APP.RESTAURANT.printCoupon( title, salesRepId, editableLines, order );
		
		//send lines to kitchen
		var line, primarygroup, group8, itemLines;

		var printerItemMap = {};
		
		for( var j = 0; j < editableLines.length; j++)
		{
			line = editableLines[j];
			
			primarygroup = line.product.primarygroup;
			group8 = line.product.group8;
			
			if(group8.length > 0)
			{				
				itemLines = printerItemMap[group8];
				
				if(!itemLines)
				{
					itemLines = [];
				}
				
				itemLines.push(line);
				
				printerItemMap[group8] = itemLines;
			}
			else
			{
				if(line.boms && line.boms.length > 0){
					
					var bom = null;
					
					for(var x = 0; x < line.boms.length; x++){
						bom = line.boms[x];
						
						group8 = bom.product.group8;
						
						if(group8.length > 0)
						{				
							itemLines = printerItemMap[group8];
							
							if(!itemLines)
							{
								itemLines = [];
							}
							
							itemLines.push(bom);
							
							printerItemMap[group8] = itemLines;
						}
					}
				}
			}			
		}//for
		
		var LINE_WIDTH = 24;
		var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);		
		
		
		//var title = table ? ('Table #' + table.name) : ("Take-Away #" + takeAwayNo);
		var server = APP.USER.getUserById(salesRepId);
		var date = moment();
		
		
		var configuration = PrinterManager.getPrinterConfiguration();
		var printers = configuration['KITCHEN_PRINTERS'];
		
		var printer;
		var printer_ip;
		var printer_name;
		var printer_lines;
		
		for(var p=0; p<printers.length; p++)
		{
			printer = printers[p];
			printer_ip = printer['ip'];
			printer_name = printer['name'];
			
			printer_lines = printerItemMap[ printer_name ];
			
			if(!printer_lines)
			{
				continue;
			}
			
			var printFormat = [];
			
			printFormat.push( ['FEED'] );
			printFormat.push( ['FEED'] );
			printFormat.push( ['CENTER'] );
			printFormat.push( ['FEED'] );	
			printFormat.push( ['H1', order.ad_org_name] );
			printFormat.push( ['FEED'] );
		    printFormat.push( ['H3', LINE_SEPARATOR] );
		    printFormat.push( ['H1', '*** ' + title + ' ***'] );
		    printFormat.push( ['H3', LINE_SEPARATOR] );
		    //printFormat.push( ['H1', JSReceiptUtils.format(title, 24)]);
		    printFormat.push( ['H3', JSReceiptUtils.format(printer_name, 24)]);
		    printFormat.push( ['H3', JSReceiptUtils.format("Waiter: " + server.name, 24)]);
		    printFormat.push( ['H3', JSReceiptUtils.format("Printed: " + date.format('DD-MMM-YY HH:mm'), 24)]);
		    printFormat.push( ['H3', JSReceiptUtils.format("Order: " + order.documentNo, 24)]);
		    
		    
		    printFormat.push( ['H3', LINE_SEPARATOR] );
		    
		    printFormat.push( ['LEFT'] );
		    
		    /*
		    //sort printer_lines
		    printer_lines = printer_lines.sort(function(line1,line2){
		    	
		    	var a = line1.product.name;
		    	var b = line2.product.name;
		    	
		    	if (a > b) return 1;
		    	if (b > a) return -1;
		    	
		    	return 0;
		    });
		    */
		    
			
			for (var i = 0; i < printer_lines.length; i++) {
				
			    var line = printer_lines[i];
			
			    var text = "" + line.qty + "X " + line.product.name ;
			    printFormat.push(['H2', text]);					
			    					
			    if (line.modifiers != null){
			        for (var j = 0; j < line.modifiers.length; j++) {
			            var modifier = line.modifiers[j];
			            
			            console.log(modifier);
			
			            var text = " * " + modifier.product.name; 
			            printFormat.push(['FEED']);
			            printFormat.push(['H3', text]);
			
			        }
			    }/*if*/
			    
			    printFormat.push(['FEED']);
			    
			    if( line.comments && line.comments.length > 0 ){
		            printFormat.push(['H2', line.comments]);
			    }
			    
			    if(line.suite && line.suite == true){
			    	printFormat.push( ['H3', LINE_SEPARATOR] );
			    }
			    
			    printFormat.push(['FEED']);
			}
			
			printFormat.push(['FEED']);
			printFormat.push(['PAPER_CUT']);
			
			var order_type = title.indexOf('Table') >= 0 ? 'D' : 'T';
			
			var printed = false;
			
			HTTP_Printer.print( printer_ip, POSTERITA_Printer.format(printFormat) ).done(function(msg){
				
				printed = true;
				
			}).fail(function(error){
				
				printed = false;
				alert(error);
				
			}).always(function(){
				//save printer log
				APP.RESTAURANT.sendPrinterLog({
					'order_type' : order_type,
					'printer_name' : printer_name + " IP:" + printer_ip,
					'receipt' : Text_Printer.format(printFormat),
					'date_logged' : date.format('YYYY-MM-DD HH:mm:ss'),
					'raw_receipt' : JSON.stringify(printFormat),
					'printed' : printed ? "Y" : "N"
				});
			});
			
		}//for printers
		
		/*
		//send email notification
		if(voidedLines.length > 0){
			
			var htmlContent = "<html><head></head><body>" +
					"<h2>The lines below were voided.</h2>" +
					"<h3>" + title + "</h3>" +
					"<h3>Waiter: " + server.name + "</h3>" +
					"<h3>Date/Time: " + date.format('DD-MMM-YY HH:mm') + "</h3>" +
					"<br>";
			
			for(var i=0; i<voidedLines.length; i++){
				var line = voidedLines[i];
				
				htmlContent += "<p>" + line.qty.negate() + "X " + line.product.name + " @ " + line.lineNetAmt.negate() + "</p>";
			}
			
			htmlContent += "</body></html>";
			
			
			APP.sendEmail("Restaurant - Voided lines", htmlContent);
			
		}
		*/
		
	}
	
	
	
};

APP.RESTAURANT.printWaiterReceipt = function(title, salesRepId, shoppingCart ){
	
	var shoppingCartLine;
	var shoppingCartLines = shoppingCart.getLines();
	
	
	var LINE_WIDTH = 24;
	var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);		
	
	
	//var title = table ? ('Table #' + table.name) : ("Take-Away #" + takeAwayNo);
	var server = APP.USER.getUserById(salesRepId);
	var date = moment();
	
	
	var configuration = PrinterManager.getPrinterConfiguration();	
	
	var printFormat = [];
	
	printFormat.push( ['FEED'] );
	printFormat.push( ['FEED'] );
	printFormat.push( ['FEED'] );
    printFormat.push( ['CENTER'] );
    printFormat.push( ['H1', JSReceiptUtils.format( '--- Waiter Receipt ---', 24)] );
    printFormat.push( ['H1', LINE_SEPARATOR] );
    printFormat.push( ['H1', JSReceiptUtils.format( '*** ' + title + ' ***', 24)] );
    printFormat.push( ['H1', LINE_SEPARATOR] );
    printFormat.push( ['FEED'] );
    //printFormat.push( ['H1', JSReceiptUtils.format(title, 24)]);
    printFormat.push( ['H3', JSReceiptUtils.format("Waiter: " + server.name, 24)]);
    printFormat.push( ['H3', JSReceiptUtils.format("Printed: " + date.format('DD-MMM-YY HH:mm'), 24)]);
    
    printFormat.push( ['H1', LINE_SEPARATOR] );
    
    printFormat.push( ['LEFT'] );
    			
	for (var i = 0; i < shoppingCartLines.length; i++) {
		
	    var line = shoppingCartLines[i];
	
	    var text = "" + line.qty + "X " + line.product.name ;
	    printFormat.push(['H2', text]);					
	    					
	    if (line.modifiers != null){
	        for (var j = 0; j < line.modifiers.length; j++) {
	            var modifier = line.modifiers[j];
	            
	            var text = " * " + modifier.product.name; 
	            printFormat.push(['FEED']);
	            printFormat.push(['H3', text]);
	
	        }
	    }/*if*/
	    
	    if(line.boms && line.boms.length > 0){
			
			var bom = null;
			
			for(var x = 0; x < line.boms.length; x++){
				bom = line.boms[x];
				
				var text = " -- " + bom.qty + "X " + bom.product.name; 
	            printFormat.push(['FEED']);
	            printFormat.push(['H3', text]);
			}
		}
	    
	    printFormat.push(['FEED']);
	    
	    if( line.comments && line.comments.length > 0 ){
            printFormat.push(['H2', line.comments]);
	    }
	    
	    printFormat.push( ['H3', LINE_SEPARATOR] );
	    printFormat.push(['FEED']);
	}
	
	printFormat.push(['FEED']);
	printFormat.push(['PAPER_CUT']);
	
	PrinterManager.print(printFormat);
	
};


APP.RESTAURANT.printCoupon = function(title, salesRepId, editableLines, order ){
	
	//send lines to kitchen
	var line, primarygroup, group8, itemLines;

	var printerItemMap = {};
	
	for( var j = 0; j < editableLines.length; j++)
	{
		line = editableLines[j];
		
		primarygroup = line.product.primarygroup;
		group8 = line.product.group8;
		
		if(group8.length > 0)
		{				
			itemLines = printerItemMap[group8];
			
			if(!itemLines)
			{
				itemLines = [];
			}
			
			itemLines.push(line);
			
			printerItemMap[group8] = itemLines;
		}
		else
		{
			if(line.boms && line.boms.length > 0){
				
				var bom = null;
				
				for(var x = 0; x < line.boms.length; x++){
					bom = line.boms[x];
					
					group8 = bom.product.group8;
					
					if(group8.length > 0)
					{				
						itemLines = printerItemMap[group8];
						
						if(!itemLines)
						{
							itemLines = [];
						}
						
						itemLines.push(bom);
						
						printerItemMap[group8] = itemLines;
					}
				}
			}
		}			
	}//for
	
	var LINE_WIDTH = 24;
	var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);		
	
	
	//var title = table ? ('Table #' + table.name) : ("Take-Away #" + takeAwayNo);
	var server = APP.USER.getUserById(salesRepId);
	var date = moment();
	
	
	var configuration = PrinterManager.getPrinterConfiguration();
	var printers = configuration['KITCHEN_PRINTERS'];
	
	var printer;
	var printer_ip;
	var printer_name;
	var printer_lines;
	
	for(var p=0; p<printers.length; p++)
	{
		printer = printers[p];
		printer_ip = printer['ip'];
		printer_name = printer['name'];
		
		printer_lines = printerItemMap[ printer_name ];
		
		if(!printer_lines)
		{
			continue;
		}
		
		var printFormat = [];
		
		printFormat.push( ['FEED'] );
		//printFormat.push( ['FEED'] );
		printFormat.push( ['CENTER'] );
		//printFormat.push( ['FEED'] );
		printFormat.push( ['FEED'] );
	    //printFormat.push( ['H1', LINE_SEPARATOR] );
	    printFormat.push( ['H3', 'Coupon'] );
	    printFormat.push( ['H1', LINE_SEPARATOR] );
	    printFormat.push( ['FEED'] );
	    printFormat.push( ['H3', title]);
	    printFormat.push( ['B', JSReceiptUtils.format("Waiter: " + server.name, 24)]);
	    printFormat.push( ['B', JSReceiptUtils.format("Printed: " + date.format('DD-MMM-YY HH:mm'), 24)]);
	    printFormat.push( ['B', JSReceiptUtils.format("Order: " + order.documentNo, 24)]);
	    
	    
	    printFormat.push( ['H1', LINE_SEPARATOR] );
	    
	    printFormat.push( ['LEFT'] );
	    
	    /*
	    //sort printer_lines
	    printer_lines = printer_lines.sort(function(line1,line2){
	    	
	    	var a = line1.product.name;
	    	var b = line2.product.name;
	    	
	    	if (a > b) return 1;
	    	if (b > a) return -1;
	    	
	    	return 0;
	    });
	    */
	    
		
		for (var i = 0; i < printer_lines.length; i++) {
			
		    var line = printer_lines[i];
		
		    var text = "" + line.qty + "X " + line.product.name ;
		    printFormat.push(['H2', text]);					
		    					
		    if (line.modifiers != null){
		        for (var j = 0; j < line.modifiers.length; j++) {
		            var modifier = line.modifiers[j];
		            
		            console.log(modifier);
		
		            var text = " * " + modifier.product.name; 
		            printFormat.push(['FEED']);
		            printFormat.push(['H3', text]);
		
		        }
		    }/*if*/
		    
		    printFormat.push(['FEED']);
		    
		    if( line.comments && line.comments.length > 0 ){
	            printFormat.push(['H2', line.comments]);
		    }
		    
		    if(line.suite && line.suite == true){
		    	printFormat.push( ['H3', LINE_SEPARATOR] );
		    }
		    
		    printFormat.push(['FEED']);
		}
		
		printFormat.push(['FEED']);
		printFormat.push(['PAPER_CUT']);
		
		PrinterManager.print(printFormat);
		
	}//for
	
};

APP.RESTAURANT.sendPrinterLog = function(log){
	
	var order_type = log.order_type;
	var printer_name = log.printer_name;
	var receipt = log.receipt;
	var date_logged = log.date_logged;
	var raw_receipt = log.raw_receipt;
	var printed = log.printed;
	
	var post = {};
	post['action'] = "printer-log";
	post['order_type'] = order_type;
	post['printer_name'] = printer_name;
	post['receipt'] = Base64.encode(receipt);
	post['raw_receipt'] = Base64.encode(raw_receipt);
	post['printed'] = printed;
	post['date_logged'] = date_logged;
		
	post = JSON.stringify(post);
	/*
	jQuery.get("/restaurant?json=" + post,
	{}, function(json, textStatus, jqXHR)
	{
		if (json == null || jqXHR.status != 200)
		{
			console.error("Failed to log printer operation!");
			return;
		}
		if (json.error)
		{
			console.error("Failed to log printer operation! " + json.error);
			return;
		}
	});	
	*/
	
	jQuery.post("/restaurant/", {"json" : post}, function(json, textStatus, jqXHR)
	{
		if (json == null || jqXHR.status != 200)
		{
			console.error("Failed to log printer operation!");
			return;
		}
		if (json.error)
		{
			console.error("Failed to log printer operation! " + json.error);
			return;
		}
	});

};

APP.RESTAURANT.updatePrinterLog = function(record){
	
	var post = {};
	post['action'] = "update-printer-log";
	post['uuid'] = record.uuid;
	
	post = JSON.stringify(post);
	
	jQuery.post("/restaurant/", {"json" : post}, function(json, textStatus, jqXHR)
	{
		if (json == null || jqXHR.status != 200)
		{
			console.error("Failed to update printer log!");
			return;
		}
		if (json.error)
		{
			console.error("Failed to update printer log! " + json.error);
			return;
		}
	});
};

var Text_Printer = {
		
		format: function (printFormat) {
			
		   var str = "";

	       for (var i = 0; i < printFormat.length; i++) {
	            var line = printFormat[i];

	            if (line.length == 1) {
	                var command = line[0];

	                switch (command) {

	                case 'FEED':
	                	str = str + "\n";
	                    break;
	                }
	                
	            } else {
	                var font = line[0];
	                var text = line[1];

	                if (text == null) continue;

	                if (line.length > 2) {
	                    var label = line[2];
	                    text = label + text;
	                }

	                str = str + text + "\n";

	            }
	        }

	        return str;
	    }
};
