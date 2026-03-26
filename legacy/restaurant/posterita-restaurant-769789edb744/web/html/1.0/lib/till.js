var Till = {
		isOpen : function(terminal_id){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['action'] = "isOpen";

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to query till!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to query till! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send till query!");
			});
			
			return dfd.promise();
		},
		
		isClose : function(terminal_id){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['action'] = "isClose";

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to query till!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to query till! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send till query!");
			});
			
			return dfd.promise();
		},
		
		open : function(terminal_id, user_id, date, amount){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['user_id'] = user_id;
			post['date'] = date;
			post['float_amount'] = amount;
			post['action'] = "open";

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to open till!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to open till! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send open till request!");
			});
			
			return dfd.promise();
		},
		
		close : function(terminal_id, user_id, date, amount, external_card_amount, syncDraftAndOpenOrders){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['user_id'] = user_id;
			post['date'] = date;
			post['balance'] = amount;
			post['external_card_amount'] = external_card_amount;
			post['action'] = "close";
			post['syncDraftAndOpenOrders'] = syncDraftAndOpenOrders;

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to close till!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to close till! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send close till request!");
			});
			
			return dfd.promise();
		},
		
		validateCashAmount : function(terminal_id, amount){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['cash_amount'] = amount;
			post['action'] = "validateCashAmount";

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to validate cash amount!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to validate cash amount! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send validate cash amount request!");
			});
			
			return dfd.promise();
		},
		
		getTenderAmounts : function(terminal_id){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['action'] = "getTenderAmounts";

			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to get tender amounts!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to get tender amounts! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to send get tender amounts request!");
			});
			
			return dfd.promise();
		},
		
		saveCashierControlSheet : function(terminal_id, user_id, date, cash_amount, external_amount){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['terminal_id'] = terminal_id;
			post['user_id'] = user_id;
			post['date'] = date;
			post['cash_amount_entered'] = cash_amount;
			post['externalcard_amount_entered'] = external_amount;
			post['action'] = "saveCashierControl";
			
			post = JSON.stringify(post);

			jQuery.get(
			    "/till/?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to save cashier control!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject("Failed to save cashier control! " + json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to save cashier control request!");
			});
			
			return dfd.promise();
		},
		
		printReceipt : function(json){
			var configuration = PrinterManager.getPrinterConfiguration();
		    var LINE_WIDTH = configuration.LINE_WIDTH;
		    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
		    
		  	var terminal = APP.TERMINAL.getTerminalById(json.terminal_id);
		 	var terminalName  = terminal["u_posterminal_name"];
		 	
		 	var store = APP.STORE.getStoreById(terminal.ad_org_id);
		 	var storeName = store["name"];
		 	
		 	var discountCodes = store.discountCodes;
		 	var DISCOUNT_CODE_DB = TAFFY(discountCodes);
		 	
		 	var salesRep_open = APP.USER.getUserById(json.open_user_id);
		 	var salesRep_close = APP.USER.getUserById(json.close_user_id);
		 	
			var salesRep_open_name = salesRep_open["name"];
			var salesRep_close_name = (salesRep_close == null) ? "" : salesRep_close["name"];
			
			var openingDate = moment(json.time_open).format("MMM Do YYYY, HH:mm");
			var closingDate = (json.time_close == "") ? "" : moment(json.time_close).format("MMM Do YYYY, HH:mm");
			
			var beginningBalance = new Number(json.opening_amt).toFixed(2);			
			
			var cashAmt = new Number(json.cash).toFixed(2);
			var cardAmt = new Number(json.card).toFixed(2);
			var chequeAmt = new Number(json.cheque).toFixed(2);
			var externalCreditCardAmt = new Number(json.ext_card).toFixed(2);
			var voucherAmt = new Number(json.voucher).toFixed(2);
			var giftAmt = new Number(json.gift).toFixed(2);
			var loyaltyAmt = new Number(json.loyalty).toFixed(2);
			var couponAmt = new Number(json.coupon).toFixed(2);
			var depositAmt = new Number(json.deposit).toFixed(2);			
			
			/* mobile payments */
			var mcbJuiceAmt = new Number(json.mcbJuice).toFixed(2);
			var mytMoneyAmt = new Number(json.mytMoney).toFixed(2);
			var emtelMoneyAmt = new Number(json.emtelMoney).toFixed(2);
			var giftsMuAmt = new Number(json.giftsMu).toFixed(2);
			var mipsAmt = new Number(json.mips).toFixed(2);

			var endingBalance = new Number(json.opening_amt + json.cash).toFixed(2);	
			
			var cashAmtEntered = new Number(json.closing_amt).toFixed(2);
			var cashDifference = new Number(json.closing_amt - (json.opening_amt + json.cash)).toFixed(2);
			
			var grandTotal = new Number(json.grandTotal).toFixed(2);
			var taxTotal = new Number(json.taxTotal).toFixed(2);
			var subTotal = new Number(json.subTotal).toFixed(2);
			var noOfOrders = new Number(json.noOfOrders).toFixed(0);
			var noOfReturns = new Number(json.noOfReturns).toFixed(0);
			var discountTotal = new Number(json.discountTotal).toFixed(2);
			
			var qtySold = new Number(json.qtySold).toFixed(0);
			var qtyReturned = new Number(json.qtyReturned).toFixed(0);
			
			//additional info
			var qtyItemsSold = new Number(json.qtyItemsSold).toFixed(0);
			var qtyItemsReturned = new Number(json.qtyItemsReturned).toFixed(0);
			
			var qtyServicesSold = new Number(json.qtyServicesSold).toFixed(0);
			var qtyServicesReturned = new Number(json.qtyServicesReturned).toFixed(0);
			
			var userDiscountTotal = new Number(json.userDiscountTotal).toFixed(2);
			    
			var transferAmount = new Number(json.closing_amt - json.opening_amt).toFixed(2);
			
			var extCardAmtEntered = new Number(json.ext_card_amount_entered).toFixed(2);
			var extCardDifference = new Number(json.ext_card_amount_entered - json.ext_card).toFixed(2);
			
			var countExtCard = true;
			
			var preference = terminal["preference"];
			if( preference.hasOwnProperty("countExtCardAmount") )
			{
				countExtCard = preference["countExtCardAmount"];
			}

			var totalPayments = json.cash + json.cheque + json.ext_card + json.loyalty + json.voucher;
			
			/* mobile payments */
			totalPayments = totalPayments + json.mcbJuice + json.mytMoney + json.emtelMoney + json.giftsMu;
			
			var paymentDifference = new Number( json.grandTotal - (totalPayments)).toFixed(2);
			
			totalPayments = new Number( totalPayments ).toFixed(2);
			
			
		  	var printFormat = [];
		  	
		  	printFormat.push( ['FEED'] );
		  	printFormat.push( ['CENTER'] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['H1', 'Close Till Receipt'] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['B',JSReceiptUtils.format(("Store:"),10) + JSReceiptUtils.format((storeName),LINE_WIDTH-10,true)] );
		  	printFormat.push( ['B',JSReceiptUtils.format(("Terminal:"),10) + JSReceiptUtils.format((terminalName),LINE_WIDTH-10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Open By:"),10) + JSReceiptUtils.format(salesRep_open_name, LINE_WIDTH-10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Close By:"),10) + JSReceiptUtils.format(salesRep_close_name, LINE_WIDTH-10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Opened:"),LINE_WIDTH-22) + JSReceiptUtils.format((openingDate),22, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Closed:"),LINE_WIDTH-22) + JSReceiptUtils.format((closingDate),22, true)] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Beginning Balance:"),LINE_WIDTH-10) + JSReceiptUtils.format((beginningBalance),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Ending Balance:"),LINE_WIDTH-10) + JSReceiptUtils.format((endingBalance),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Cash Amount Entered:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashAmtEntered),10, true)] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['B',JSReceiptUtils.format(("Cash Difference:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashDifference),10, true)] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Transfer Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((transferAmount),10, true)] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	
		  	if( countExtCard )
		  	{
		  		printFormat.push( ['FEED'] );
			  	printFormat.push( ['N',JSReceiptUtils.format(("Ext. Card Amount Entered:"),LINE_WIDTH-10) + JSReceiptUtils.format((extCardAmtEntered),10, true)] );
			  	printFormat.push( ['N',JSReceiptUtils.format(("Ext. Card Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((externalCreditCardAmt),10, true)] );
			  	printFormat.push( ['N',JSReceiptUtils.format(("Ext. Card Amount Difference:"),LINE_WIDTH-10) + JSReceiptUtils.format((extCardDifference),10, true)] );
			  	
		  	}
		  	
		  	printFormat.push( ['FEED'] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Cash Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashAmt),10, true)] );
		  	
		  	if( !countExtCard )
		  	{
		  		printFormat.push( ['N',JSReceiptUtils.format(("Ext. Card Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((externalCreditCardAmt),10, true)] );
			  	
		  	}
		  	
		  	printFormat.push( ['N',JSReceiptUtils.format(("Credit Card Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((cardAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Cheque Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((chequeAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Voucher Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((voucherAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Gift Card Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((giftAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Loyalty Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((loyaltyAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Coupon Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((couponAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Deposit Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((depositAmt),10, true)] );
		  	
		  	/* mobile payments */
		  	printFormat.push( ['N',JSReceiptUtils.format(("MCB Juice Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((mcbJuiceAmt),10, true)] );		  	
		  	printFormat.push( ['N',JSReceiptUtils.format(("MY.T Money Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((mytMoneyAmt),10, true)] );		  	
		  	printFormat.push( ['N',JSReceiptUtils.format(("Blink Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((emtelMoneyAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Gifts.mu Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((giftsMuAmt),10, true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("MIPS Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((mipsAmt),10, true)] );
		  	
		  	printFormat.push( ['FEED'] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['H1', 'Summary'] );
		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total Payments:"),LINE_WIDTH-10) + JSReceiptUtils.format((totalPayments),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total Gross Sales:"),LINE_WIDTH-10) + JSReceiptUtils.format((grandTotal),10,true)] );
		  	printFormat.push( ['B',JSReceiptUtils.format(("Sales & Payments Difference:"),LINE_WIDTH-10) + JSReceiptUtils.format((paymentDifference),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total Tax:"),LINE_WIDTH-10) + JSReceiptUtils.format((taxTotal),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total Net Sales:"),LINE_WIDTH-10) + JSReceiptUtils.format((subTotal),10,true)] );

		  	printFormat.push( ['N',LINE_SEPARATOR] );
		  	printFormat.push( ['H1', 'Stats'] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total Discount Given:"),LINE_WIDTH-10) + JSReceiptUtils.format((discountTotal),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Discount by cashier:"),LINE_WIDTH-10) + JSReceiptUtils.format((userDiscountTotal),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Orders:"),LINE_WIDTH-10) + JSReceiptUtils.format((noOfOrders),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Returns:"),LINE_WIDTH-10) + JSReceiptUtils.format((noOfReturns),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Items Sold:"),LINE_WIDTH-10) + JSReceiptUtils.format((qtyItemsSold),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Items Returned:"),LINE_WIDTH-10) + JSReceiptUtils.format((qtyItemsReturned),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Services Sold:"),LINE_WIDTH-10) + JSReceiptUtils.format((qtyServicesSold),10,true)] );
		  	printFormat.push( ['N',JSReceiptUtils.format(("Total No of Services Returned:"),LINE_WIDTH-10) + JSReceiptUtils.format((qtyServicesReturned),10,true)] );
		  	
		  	printFormat.push(['FEED']);	
		  	
		  	if(json.draftOrders){
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of draft orders:"),LINE_WIDTH-10) + JSReceiptUtils.format(("" + json.draftOrders.length),10,true)]);	
		  	}
		  	
		  	if(json.openOrders){
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of open orders:"),LINE_WIDTH-10) + JSReceiptUtils.format(("" + json.openOrders.length),10,true)]);	
		  	}
		  	
		  	if( json.openDrawers ){
		  		
		  		var openDrawers = new Number(json.openDrawers.length).toFixed(0);
		  		var rePrints = new Number(json.rePrints.length).toFixed(0);
		  				  				            
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of open drawer:"),LINE_WIDTH-10) + JSReceiptUtils.format((openDrawers),10,true)]);	
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of reprints:"),LINE_WIDTH-10) + JSReceiptUtils.format((rePrints),10,true)]);
		  	}
		  	
		  	/* print discount codes */
		  	if( json.discountCodes && json.discountCodes.length > 0 )
		  	{
		  		
		  		printFormat.push(['FEED']);
            	printFormat.push(['H2',"*** Discount Codes ***"]);
            	printFormat.push(['FEED']);
            	
		  		var discountCodes = json.discountCodes;
		  		var discountCode;
		  		var code, id, name, amt, qty;
		  		
		  		for( var i=0; i<discountCodes.length; i++ )
		  		{
		  			discountCode = discountCodes[i];
		  			id = discountCode['u_pos_discountcode_id'];		  			
		  			code = DISCOUNT_CODE_DB({'u_pos_discountcode_id': id}).first();
		  			
		  			name = code['name'];
		  			qty = discountCode["qty"];
		  			amt = new Number( discountCode["amt"] ).toFixed(2);
		  			
		  			printFormat.push(["N", JSReceiptUtils.format( qty + "x" + name , LINE_WIDTH-10 ) + 
            			JSReceiptUtils.format( amt ,10 ,true ) ]);
		  		}
		  		
		  		
		  	}
		  	
		  	/* print employee sales */
		  	if( json.employeeSales )
		  	{
		  		
		  		printFormat.push(['FEED']);
            	printFormat.push(['H2',"*** Employee Sales ***"]);
            	printFormat.push(['FEED']);
            	
		  		var employeeSales = json.employeeSales;
		  		var employee;
		  		var amt;
		  		
		  		for( var i=0; i<employeeSales.length; i++ )
		  		{
		  			employee = employeeSales[i];
		  			
		  			name = employee['name'];
		  			amt = new Number( employee["amt"] ).toFixed(2);
		  			
		  			printFormat.push(["N", JSReceiptUtils.format( name , LINE_WIDTH-20 ) + JSReceiptUtils.format( amt ,20 ,true ) ]);
		  		}
		  		
		  		
		  	}
		  	
		  	printFormat.push(['FEED']);
		  	printFormat.push( ['PAPER_CUT'] );		  	
			
		  	
		  	PrinterManager.print(printFormat);
		},
		
		printOpenReceipt : function(json){
			var configuration = PrinterManager.getPrinterConfiguration();
		    var LINE_WIDTH = configuration.LINE_WIDTH;
		    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
		    
		  	var terminal = APP.TERMINAL.getTerminalById(json.terminal_id);
		 	var terminalName  = terminal["u_posterminal_name"];
		 	
		 	var salesRep_open = APP.USER.getUserById(json.open_user_id);
		 	var salesRep_close = APP.USER.getUserById(json.close_user_id);
		 	
			var salesRep_open_name = salesRep_open["name"];
			var salesRep_close_name = (salesRep_close == null) ? "" : salesRep_close["name"];
			
			var openingDate = moment(json.time_open).format("MMM Do YYYY, HH:mm");
			var closingDate = (json.time_close == "") ? "" : moment(json.time_close).format("MMM Do YYYY, HH:mm");
			
			var beginningBalance = new Number(json.opening_amt).toFixed(2);			
			
			var cashAmt = new Number(json.cash).toFixed(2);
			var cardAmt = new Number(json.card).toFixed(2);
			var chequeAmt = new Number(json.cheque).toFixed(2);
			var externalCreditCardAmt = new Number(json.ext_card).toFixed(2);
			var voucherAmt = new Number(json.voucher).toFixed(2);
			var giftAmt = new Number(json.gift).toFixed(2);
			var loyaltyAmt = new Number(json.loyalty).toFixed(2);				

			var endingBalance = new Number(json.opening_amt + json.cash).toFixed(2);	
			
			var cashAmtEntered = new Number(json.closing_amt).toFixed(2);
			var cashDifference = new Number(json.closing_amt - (json.opening_amt + json.cash)).toFixed(2);
			
			var grandTotal = new Number(json.grandTotal).toFixed(2);
			var taxTotal = new Number(json.taxTotal).toFixed(2);
			var subTotal = new Number(json.subTotal).toFixed(2);
			var noOfOrders = new Number(json.noOfOrders).toFixed(0);
			var noOfReturns = new Number(json.noOfReturns).toFixed(0);
			var discountTotal = new Number(json.discountTotal).toFixed(2);
			
			var qtySold = new Number(json.qtySold).toFixed(0);
			var qtyReturned = new Number(json.qtyReturned).toFixed(0);
			
			//additional info
			var qtyItemsSold = new Number(json.qtyItemsSold).toFixed(0);
			var qtyItemsReturned = new Number(json.qtyItemsReturned).toFixed(0);
			
			var qtyServicesSold = new Number(json.qtyServicesSold).toFixed(0);
			var qtyServicesReturned = new Number(json.qtyServicesReturned).toFixed(0);
			
			var userDiscountTotal = new Number(json.userDiscountTotal).toFixed(2);
			    
			var transferAmount = new Number(json.closing_amt - json.opening_amt).toFixed(2);
			
		  	var printFormat = [
		            ['FEED'],
		            ['CENTER'],
		            ['N',LINE_SEPARATOR],
		            ['H1', 'Open Till Receipt'],
		            ['N',LINE_SEPARATOR],
		            ['B',JSReceiptUtils.format(("Terminal:"),10) + JSReceiptUtils.format((terminalName),LINE_WIDTH-10,true)],
		            ['N',JSReceiptUtils.format(("Open By:"),10) + JSReceiptUtils.format(salesRep_open_name, LINE_WIDTH-10, true)],
		            ['N',JSReceiptUtils.format(("Opened:"),LINE_WIDTH-22) + JSReceiptUtils.format((openingDate),22, true)],
		            ['N',LINE_SEPARATOR],
		           
		            ['N',JSReceiptUtils.format(("Beginning Balance:"),LINE_WIDTH-10) + JSReceiptUtils.format((beginningBalance),10, true)],
		            ['N',LINE_SEPARATOR],
		            ['FEED']
		            
		           
		  	];
		  	
		  	/*if( json.openDrawers ){
		  		
		  		var openDrawers = new Number(json.openDrawers.length).toFixed(0);
		  		var rePrints = new Number(json.rePrints.length).toFixed(0);
		  				  		
		  		printFormat.push(['FEED']);			            
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of open drawer:"),LINE_WIDTH-10) + JSReceiptUtils.format((openDrawers),10,true)]);	
		  		printFormat.push(['B',JSReceiptUtils.format(("Total No of reprints:"),LINE_WIDTH-10) + JSReceiptUtils.format((rePrints),10,true)]);
		  	}*/
		  	
		  	printFormat.push( ['PAPER_CUT']);		  	
			
		  	
		  	PrinterManager.print(printFormat);
		},
		
		printCashierControlReceipt : function(json){
			var configuration = PrinterManager.getPrinterConfiguration();
		    var LINE_WIDTH = configuration.LINE_WIDTH;
		    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
		    
		    
			var terminal = APP.TERMINAL.getTerminalById(json.terminal_id);

		 	var storeName  = terminal["ad_org_name"];
		 	var terminalName  = terminal["u_posterminal_name"];
		 	
		 	var salesRep = APP.USER.getUserById(json.user_id);
			var salesRep_name = salesRep["name"];
			
			var dateLogged = moment(json.date_logged).format("MMM Do YYYY, HH:mm");

			
			var beginningBalance = new Number(json.opening_amt).toFixed(2);	
			
			var cashAmtEntered = new Number(json.cash_amount_entered).toFixed(2);
			var cashAmt = new Number(json.cash_amount).toFixed(2);
			var cashDifference = new Number(json.cash_amount_entered - (json.opening_amt + json.cash_amount)).toFixed(2);
			

			var cardAmtEntered = new Number(json.externalcard_amount_entered).toFixed(2);
			var cardAmt = new Number(json.externalcard_amount).toFixed(2);
			var cardDifference = new Number(json.externalcard_amount_entered - json.externalcard_amount).toFixed(2);
			
			var totalGrossSales = new Number(json.cash_amount + json.externalcard_amount).toFixed(2);
			
		  	var printFormat = [
		            ['FEED'],
		            ['CENTER'],
		            ['N',LINE_SEPARATOR],
		            ['H1', 'Cashier Control Receipt'],
		            ['N',LINE_SEPARATOR],
		            ['N',JSReceiptUtils.format(("Store:"),10) + JSReceiptUtils.format((storeName),LINE_WIDTH-10,true)],
		            ['N',JSReceiptUtils.format(("Terminal:"),10) + JSReceiptUtils.format(terminalName, LINE_WIDTH-10, true)],
		            ['N',JSReceiptUtils.format(("SalesRep:"),10) + JSReceiptUtils.format(salesRep_name, LINE_WIDTH-10, true)],
		            ['N',JSReceiptUtils.format(("Date:"),LINE_WIDTH-22) + JSReceiptUtils.format((dateLogged),22, true)],
		            ['N',LINE_SEPARATOR],
		           
		            ['N',JSReceiptUtils.format(("Beginning Balance:"),LINE_WIDTH-10) + JSReceiptUtils.format((beginningBalance),10, true)],
		            ['N',JSReceiptUtils.format(("Cash Amount Entered:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashAmtEntered),10, true)],
		            ['N',JSReceiptUtils.format(("Cash Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashAmt),10, true)],
		            ['B',JSReceiptUtils.format(("Cash Difference:"),LINE_WIDTH-10) + JSReceiptUtils.format((cashDifference),10, true)],
		            ['N',LINE_SEPARATOR],
		            
		            ['N',JSReceiptUtils.format(("Ext. Card Amount Entered:"),LINE_WIDTH-10) + JSReceiptUtils.format((cardAmtEntered),10, true)],	
		            ['N',JSReceiptUtils.format(("Ext. Card Amount:"),LINE_WIDTH-10) + JSReceiptUtils.format((cardAmt),10, true)],
		            ['B',JSReceiptUtils.format(("Ext. Card Difference:"),LINE_WIDTH-10) + JSReceiptUtils.format((cardDifference),10, true)],                    
		            ['N',LINE_SEPARATOR],
		            
		            ['N',JSReceiptUtils.format(("Total Gross Sales:"),LINE_WIDTH-10) + JSReceiptUtils.format((totalGrossSales),10, true)],	
		            ['N',LINE_SEPARATOR],
		            ['FEED']
		           
		  	];
		  	
		  	printFormat.push( ['PAPER_CUT']);		  	
			
		  	PrinterManager.print(printFormat);
		}
};