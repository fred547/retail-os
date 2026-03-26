var ESC_COMMANDS = {

    LINE_FEED: "\x0A",
    PAPER_CUT: "\x0A\x1D\x56\x42",
    PARTIAL_PAPER_CUT: "\x0A\x1D\x56\x41",

    LEFT_ALIGN: "\x1B\x61\x30",
    CENTER_ALIGN: "\x1B\x61\x01",
    RIGHT_ALIGN: "\x1B\x61\x02",

    FONT_NORMAL: "\x1B!\x45",
    FONT_NORMAL_BOLD: "\x1B!\x4D",

    FONT_SMALL: "\x1B!\x47",
    FONT_SMALL_BOLD: "\x1B!\x4F",

    FONT_BIG: "\x1B!\x21",
    FONT_BIG_BOLD: "\x1B!\x29",

    FONT_H1: "\x1B!\x36",
    FONT_H1_BOLD: "\x1B!\x3E",

    FONT_H2: "\x1B!\x37",
    FONT_H2_BOLD: "\x1B!\x3F",

    FONT_H3: "\x1B!\x28",
    FONT_H3_BOLD: "\x1B!\x2E",

    FONT_H4: "\x1B!\x29",
    FONT_H4_BOLD: "\x1B!\x2F",

    OPEN_DRAWER: "\x0A\x1B\x70\x30\x37\x01",

    NVRAM: "\x1C\x70\x01\x30\x0A",

    DEFAULT_LINE_SPACING: "\x1B\x32"
};

var JSReceiptUtils = {
    replicate: function (str, n) {
        var s = '';
        for (var i = 0; i < n; i++) s += str;
        return s;
    },

    format: function (str, length, alignRight) {
        str += '';
        if (str.length > length) {
            return str.substring(0, length);
        }

        var paddingLength = length - str.length;
        var padding = '';
        for (var i = 0; i < paddingLength; i++) padding += ' ';

        if (alignRight) return padding + str;

        return str + padding;
    },

    /*
     * Takes a long string and split it into different lines*/
    splitIntoLines: function (str, n) {
        var lines = [];

        if (str.length < n) {
            lines.push(str);
            return lines;
        }

        while (true) {
            var index = str.lastIndexOf(" ", n - 1);
            if (index > 0 && (str.length) > n) {
                var line = str.substring(0, index);
                str = str.substring(index + 1);
                lines.push(line);
            } else {

                lines.push(str);
                break;
            }
        }

        /*If line does not contain any space
         * */
        if (lines.length == 0) {
            while (true) {
                if (n > str.length) {
                    lines.push(str);
                    break;
                }

                lines.push(str.substring(0, n));
                str = str.substring(n);
            }
        }

        return lines;
    }
};

var PrinterManager = {};

PrinterManager.implementations = {
    JAVA_APPLET: 'Java Applet',
    STAR_WEB_PRINT: 'Star WebPRNT',
    EPSON_EPOS_PRINT: 'Epson ePOS-Print',
    POSTERITA_PRINT: "Posteria Print"
    
};

/* receiptJSON - POSReceipt line 892 */
PrinterManager.printReceipt = function (receiptJSON, openDrawer) {

    var printFormat = this.getReceiptPrintFormat(receiptJSON, openDrawer);

    this.print(printFormat);
};

PrinterManager.getReceiptPrintFormat = function (receiptJSON, openDrawer) {

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

    var configuration = this.getPrinterConfiguration();

    var LINE_WIDTH = configuration.LINE_WIDTH;
    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
    

    var isCreditCardTransaction = false;

    if (receipt.header.cardAmt != 0) {
        isCreditCardTransaction = true;
    }
    
    var taxLabel = 'TaxNo: ';
    var receiptTitle = receipt.header.title;

    if(receipt.header.orgCountryId == 245){
	    taxLabel = 'VAT: ';
	
	    if('Sales Receipt' == receiptTitle){
	    	receiptTitle = 'VAT INVOICE';
	    }
    }
    
    if( 'Sales Receipt' == receiptTitle || 'VAT INVOICE' == receiptTitle ){ /* custom title applies to sales receipts only! */
    	receiptTitle = z.salesReceiptHeader || receiptTitle;
    }    
    
    receiptTitle = receiptTitle + " #" + receipt.header.documentNo;
    
    
    if( receiptJSON.force && receiptJSON.force == true) {
    	
    	
    	receiptTitle = "*** DUPLICATE ***" + ESC_COMMANDS.LINE_FEED + receiptTitle;
    	
    }

    var printFormat = [];
    
    if(z.showLogo == true){
    	
    	printFormat.push( ['NVRAM'] );
    }
    
        
    printFormat.push( ['FEED'] );
    printFormat.push( ['CENTER'] );
    
    /* restaurant */
    if(receipt.header.commandInfo){
    	
    	var info = receipt.header.commandInfo;
    	
    	var title;
    	
    	if( info && info != null ){
			
			if(info.type == "D"){
				
				title = 'Table #' + info['tableId'];
			}
			else
			{
				title = 'Take-Away';
				
				if( info['takeAwayId'] > 0 ){
					title = title + " #" + info['takeAwayId'];
				}
			}
			
			printFormat.push( ['H1', '*** ' + title + ' ***' ] ); 
		}
    		
    	
    	
    }
    /* restaurant */
    
    printFormat.push( ['N', LINE_SEPARATOR] );
    printFormat.push( ['H3', z.companyName || receipt.header.client ] );    
    
    if( z.showStoreName == true ){    	
    	
    	printFormat.push( ['H4', receipt.header.orgName] );
    	
    }
    
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
	    
	    /* drafted order */
	    if( receipt.header.docStatus == 'DR' )
	    {
	    	printFormat.push(
	    			
	    			['N', LINE_SEPARATOR],
	    			['FEED'],
	    			
	    	        ['N', JSReceiptUtils.format((receipt.header.soTrx ? I18n.t('Customer') : I18n.t('Vendor')) + ': ' + receipt.header.bpName + ((receipt.header.bpName2 != null && receipt.header.bpName2.length > 0) ? (' ' + receipt.header.bpName2) : ''), LINE_WIDTH)],
	    	        TERMINAL_NAME,
	    	        ['N', JSReceiptUtils.format(I18n.t('Waiter') + ': ' + receipt.header.salesRep, LINE_WIDTH)],
	    	        ['N', JSReceiptUtils.format(receipt.header.dateOrdered, LINE_WIDTH)],
	    	        
	    	        ['FEED'],
	    	        ['FEED'],
	    	        
	    	        ['H4', I18n.t('Status') + ': ' + receipt.header.docStatusName],
	    	        ['H4', I18n.t('Order No') + ': ' + receipt.header.documentNo],
	    	        
	    	        ['FEED'],
	    	        ['FEED'],
	    	        ['PAPER_CUT']);
	    	
	    	return printFormat;
	    }
        
        printFormat.push(['N', LINE_SEPARATOR],
        ['H4', receiptTitle],
        ['N', JSReceiptUtils.format((receipt.header.soTrx ? I18n.t('Customer') : I18n.t('Vendor')) + ': ' + receipt.header.bpName + ((receipt.header.bpName2 != null && receipt.header.bpName2.length > 0) ? (' ' + receipt.header.bpName2) : ''), LINE_WIDTH)],
        
        ((receipt.header.tableName) ? ['B', JSReceiptUtils.format(I18n.t('Table') + ': ' + receipt.header.tableName, LINE_WIDTH)] : ['?']),
        ((receipt.header.takeAwayNo) ? ['B', JSReceiptUtils.format(I18n.t('Take-Away') + ': ' + receipt.header.takeAwayNo, LINE_WIDTH)] : ['?']),
                
        ['N', JSReceiptUtils.format(I18n.t('Waiter') + ': ' + receipt.header.salesRep, LINE_WIDTH)],
        // ['N', JSReceiptUtils.format(I18n.t('Status') + ': ' + receipt.header.docStatusName, LINE_WIDTH)],
        TERMINAL_NAME,
        ['N', JSReceiptUtils.format(I18n.t('Payment') + ': ' + ( receipt.header.paymentRuleName == 'Emtel Money' ? 'Blink' : receipt.header.paymentRuleName ) + " " + receipt.header.creditCardDetails, LINE_WIDTH)],
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

    var totalStr = JSReceiptUtils.format(I18n.t('Grand Total') + ' (' + cursymbol + ')', LINE_WIDTH - 18) + JSReceiptUtils.format(receipt.header.qtyTotal, 6, true) + JSReceiptUtils.format(Number(receipt.header.grandTotal).toFixed(2), 12, true)

    printFormat.push(['N', subTotalStr]);
    //printFormat.push(['N', taxTotalStr]);

    if (receipt.header.discountAmt > 0) {
        printFormat.push(['N', discountStr]);
    }

    if (receipt.header.writeOffAmt > 0) {
        printFormat.push(['N', writeOffStr]);
    }

    printFormat.push(['N', LINE_SEPARATOR]);
    printFormat.push(['B', totalStr]);
    printFormat.push(['N', LINE_SEPARATOR]);
    printFormat.push(['N', '']);

    var paymentAmtStr = JSReceiptUtils.format(I18n.t('Amt Paid') + ' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(receipt.header.payAmt).toFixed(2), 12, true);
    var dueAmtStr = JSReceiptUtils.format(I18n.t('Amt Due') + ' (' + cursymbol + ')', LINE_WIDTH - 12) + JSReceiptUtils.format(Number(receipt.header.openAmt).toFixed(2), 12, true);

    printFormat.push(['N', paymentAmtStr]);

    if (receipt.header.docStatus == 'CO' && (receipt.header.paymentRule == 'P' || receipt.header.paymentRule == 'M'))
        printFormat.push(['N', dueAmtStr]);
    	printFormat.push(['FEED']);

    /* add payment details*/
    var i, payment, payAmt, label;
    
    for( i = 0; i < receipt.payments.length; i++ ) {
    	
    	payment = receipt.payments[i];
    	payAmt = payment['payAmt'];
    	
    	label = null;    	
    	
    	
    	switch ( payment.tenderType ) {
		
    		case "Cash" : label = "Cash"; break;
    		
    		case "Card" : label = "Card"; break;
    		
    		case "Ext Card" : label = "External Card"; break;
    		
    		case "Cheque" : label = "Cheque"; break;
    		
    		case "Voucher" : label = "Voucher"; break;
    		
    		case "Gift Card" : label = "Gift Card"; break;
    		
    		case "SK Wallet" : label = "SKWallet"; break;
    		
    		case "Zapper" : label = "Zapper"; break;
    		
    		case "Loyalty" : label = "Loyalty"; break;
    		
    		case "MCB Juice" : label = "MCB Juice"; break;
    		
    		case "MY.T Money" : label = "MY.T Money"; break;
    		
    		case "Emtel Money" : label = "Blink"; break;
    		
    		case "Gifts.mu" : label = "Gifts.mu"; break;
    		
    		case "MIPS" : label = "MIPS"; break;

    		default:break;
		}
    	
    	
    	if( label == null ) continue;
    	
    	//label = I18n.t(label);
    	
    	var str = JSReceiptUtils.format(label, LINE_WIDTH - 12) + JSReceiptUtils.format(Number( payAmt ).toFixed(2), 12, true);
		printFormat.push(['N', str]);
    	
    	
    	if( payment.tenderType == "Cash" ){    		
    		
            if (receipt.header.orderType == 'POS Order' && payment['amountTendered'] > payAmt ) {
            	
            	var cashTenderedStr = JSReceiptUtils.format(I18n.t('Cash Tendered'), LINE_WIDTH - 12) + JSReceiptUtils.format(Number( payment['amountTendered'] ).toFixed(2), 12, true);
                var changeStr = JSReceiptUtils.format(I18n.t('Cash Refunded'), LINE_WIDTH - 12) + JSReceiptUtils.format(Number( payment['amountRefunded'] ).toFixed(2), 12, true);
                
                printFormat.push(['N', cashTenderedStr]);
                printFormat.push(['N', changeStr]);
            }
    		
    	}   	
    	
    }

    
    
    if ( receipt.header.loyaltyPointsEarned > 0 && receipt.header.docStatus == 'CO'){
    	printFormat.push(['FEED']);
    	
    	var s1 = JSReceiptUtils.format('Loyalty Points Earned',LINE_WIDTH-12) + JSReceiptUtils.format(Number(receipt.header.loyaltyPointsEarned).toFixed(2),12,true);
    	//var s2 = JSReceiptUtils.format('Total Loyalty Points',LINE_WIDTH-12) + JSReceiptUtils.format(Number(receipt.header.loyaltyPoints).toFixed(2),12,true);
    	
    	printFormat.push(['N', s1]);
    	//printFormat.push(['N', s2]);
    }
    
    if ( receipt.header.docStatus == 'CO' && receipt.giftCards ){    	
    	
    	var giftCard;
    	
    	for(var i=0; i<receipt.giftCards.length; i++){
    		
    		printFormat.push(['FEED']);
    		
    		giftCard = receipt.giftCards[ i ];
    		
    		var s1 = JSReceiptUtils.format('Gift Card',LINE_WIDTH-12) + JSReceiptUtils.format(giftCard['accountnumber'],12,true);
        	printFormat.push(['B', s1]);
        	
        	var s2 = JSReceiptUtils.format('Balance(Rs)',LINE_WIDTH-12) + JSReceiptUtils.format(Number(giftCard['balance']).toFixed(2),12,true);
        	printFormat.push(['B', s2]);
    	}    	
    	
    }
    
    if( showLineTax ){
    	
    	printFormat.push(['FEED']);
    	printFormat.push(['N', JSReceiptUtils.format(TaxCodeResolver.getLegend(), LINE_WIDTH)]);
    	printFormat.push(['FEED']);    	
    }

    if (isCreditCardTransaction) {
        if (TerminalManager.terminal.paymentProcessor == "org.compiere.model.PP_ElementPS") {
            printFormat.push(['FEED']);
            printFormat.push(['FEED']);
            printFormat.push(['B', 'Transaction Type: ' + receipt.header.transactionType]);
            printFormat.push(['B', 'Merchant Location Code: ' + receipt.header.orgId]);
            printFormat.push(['B', JSReceiptUtils.format("Entry: " + receipt.header.entryType, LINE_WIDTH)]);
            printFormat.push(['B', JSReceiptUtils.format("Approval Code: " + receipt.header.creditCardAuthorizationCode, LINE_WIDTH)]);
            printFormat.push(['B', JSReceiptUtils.format("Transaction ID: " + receipt.header.transactionId, LINE_WIDTH)]);
            printFormat.push(['N', JSReceiptUtils.format("I agree to pay above total amount ", LINE_WIDTH)]);
            printFormat.push(['N', JSReceiptUtils.format("according to card issuer agreement.", LINE_WIDTH)]);

            printFormat.push(['FEED']);
            printFormat.push(['SIGNATURE']);

        } else {

            printFormat.push(['FEED']);
            printFormat.push(['SIGNATURE']);

            if (receipt.header.creditCardAccountHolderName != null && receipt.header.creditCardAccountHolderName != 'null')
                printFormat.push(['B', JSReceiptUtils.format(receipt.header.creditCardAccountHolderName, LINE_WIDTH)]);
            printFormat.push(['B', JSReceiptUtils.format("Authorisation: " + receipt.header.creditCardAuthorizationCode, LINE_WIDTH)]);
            printFormat.push(['N', JSReceiptUtils.format("Buyer agrees to pay total amount above according to ", LINE_WIDTH)]);
            printFormat.push(['N', JSReceiptUtils.format("cardholder agreement with issuer.", LINE_WIDTH)]);
        }
    } else {
        if (receipt.header.signature) {
            printFormat.push(['FEED']);
            
            if(configuration.PRINTER_IMPLEMENTATION == PrinterManager.implementations.POSTERITA_PRINT) {
            	printFormat.push(['IMG', receipt.header.signature]);
            }
            else {
            	printFormat.push(['SIGNATURE']);
            }
            
        }

    }

    printFormat.push(['FEED']);
    
    if( z.showBarcode == true ){
    	
    	printFormat.push(['BARCODE', receipt.header.documentNo]);
    	
    }
    

    printFormat.push(['FEED']);
    
    if( z.footerMessage && z.footerMessage.length > 0 ){
    	
    	printFormat.push(['S', z.footerMessage ]);
    }
    else
    {
    	if (receipt.header.receiptFooterMsg) {

            var lines = JSReceiptUtils.splitIntoLines(receipt.header.receiptFooterMsg, LINE_WIDTH);

            if (lines.length > 0) {
                for (var i = 0; i < lines.length; i++) {
                    printFormat.push(['S', lines[i]]);
                }
            }
        } else {
            printFormat.push(['S', "Thank you for shopping. See you soon."]);
        }
    }

    /*printing comments*/
    if(receipt.comments && receipt.comments.length > 0){
    	
    	 printFormat.push(['FEED']);
         printFormat.push(['N', LINE_SEPARATOR]);
         printFormat.push(['H3', I18n.t("COMMENTS")]);
         
    	for(var i=0; i< receipt.comments.length; i++){
    		var comment = receipt.comments[i];
    		
    		var user = comment.user;
            var date = comment.date;
            var message = comment.message;
    		
    		printFormat.push(['FEED']);
            printFormat.push(['B', JSReceiptUtils.format(date, LINE_WIDTH)]);
            printFormat.push(['B', JSReceiptUtils.format(user, LINE_WIDTH)]);

            var lines = JSReceiptUtils.splitIntoLines(message, LINE_WIDTH);
            for (var j = 0; j < lines.length; j++) {
                var line = lines[j];
                printFormat.push(['N', JSReceiptUtils.format(line, LINE_WIDTH)]);
            }

            printFormat.push(['FEED']);
    	}
    }
    
    
    /* re-prints */
    if( receiptJSON.force && receiptJSON.force == true) {
    	
    	var copyFormat = [
		  ['FEED'],
		  ['CENTER'],
		  ['H1', '*** DUPLICATE ***'],
		  ['FEED'],
		];
    	
    	//add to footer
    	printFormat = printFormat.concat(copyFormat);
		
    	//add to header
    	copyFormat = copyFormat.concat(printFormat);
    	printFormat = copyFormat;    	
    	
    }
    
    /* send print format to printer */

    printFormat.push(['PAPER_CUT']);

    /* print merchant copy */

    if (receiptJSON.printReceiptCopy && receiptJSON.printReceiptCopy == true) {

        var copyFormat = [
            ['FEED'],
            ['H1', '*** ' + I18n.t('COPY') + ' ***'],
            ['FEED'],
        ];

        copyFormat = copyFormat.concat(printFormat);
        printFormat = printFormat.concat(copyFormat);
    }

    /* open cash drawer */
    if ( receiptJSON.openDrawer && receiptJSON.openDrawer == true ) {
    	
        var openDrawerFormat = [
            ['OPEN_DRAWER']
        ];
        openDrawerFormat = openDrawerFormat.concat(printFormat);
        printFormat = openDrawerFormat;
    }    
    

    return printFormat;
};

PrinterManager.getVoucherPrintFormat = function( receiptJSON ) {

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

	if ( receipt.header.receiptFormat && receipt.header.receiptFormat.length > 0 ) {

		z = JSON.parse( receipt.header.receiptFormat );

	}

	var configuration = this.getPrinterConfiguration();
	var LINE_WIDTH = configuration.LINE_WIDTH;
	var LINE_SEPARATOR = JSReceiptUtils.replicate( '-', LINE_WIDTH );

	var taxLabel = 'TaxNo: ';	
	var cursymbol = receipt.header.currencySymbol;

	if ( receipt.header.orgCountryId == 245 ) {
		taxLabel = 'VAT: ';
	}
	

	var printFormat = [];
    
    if(z.showLogo == true){
    	
    	printFormat.push( ['NVRAM'] );
    }
    
        
    printFormat.push( ['FEED'] );
    printFormat.push( ['CENTER'] );
    printFormat.push( ['N', LINE_SEPARATOR] );
    printFormat.push( ['H3', z.companyName || receipt.header.client ] );  

	if ( z.showStoreName == true ) {

		printFormat.push( [ 'H4', receipt.header.orgName ] );

	}

	if ( z.showStoreAddress == true ) {

		if ( receipt.header.orgAddress1 != '' ) {
			printFormat.push( [ 'B', receipt.header.orgAddress1 ] );
		}

		if ( receipt.header.orgAddress2 != '' ) {
			printFormat.push( [ 'B', receipt.header.orgAddress2 ] );
		}

		if ( receipt.header.orgCity != '' ) {
			printFormat.push( [ 'B', receipt.header.orgCity ] );
		}

	}

	if ( z.showPhone == true ) {

		if ( receipt.header.orgPhone != '' ) {
			printFormat.push( [ 'N', receipt.header.orgPhone, 'Phone: ' ] );
		}

		if ( receipt.header.orgFax != '' ) {
			printFormat.push( [ 'N', receipt.header.orgFax, 'FAX: ' ] );
		}
	}

	if ( z.showTaxId == true ) {

		if ( receipt.header.orgTaxId != '' ) {
			printFormat.push( [ 'N', receipt.header.orgTaxId, taxLabel ] );
		}

	}

	if ( z.additionalFields && z.additionalFields.length > 0 ) {

		printFormat.push( [ 'N', z.additionalFields ] );

	}

	var TERMINAL_NAME = [ '?' ];

	if ( z.showTerminalName == true ) {

		TERMINAL_NAME = [ 'N', JSReceiptUtils.format( 'Terminal' + ': ' + receipt.header.terminal, LINE_WIDTH ) ];
	}
	
	var negate = 1;
	
	if( receipt.header.orderType == 'POS Order' && receipt.header.grandTotal < 0 ){
		negate = -1;
	}


	printFormat.push( 
		[ 'N', LINE_SEPARATOR ], 
		[ 'N', JSReceiptUtils.format( ( receipt.header.soTrx ? I18n.t( 'Customer' ) : I18n.t( 'Vendor' ) ) + ': ' + receipt.header.bpName + ( ( receipt.header.bpName2 != null && receipt.header.bpName2.length > 0 ) ? ( ' ' + receipt.header.bpName2 ) : '' ), LINE_WIDTH ) ],
		TERMINAL_NAME, 
		[ 'N', JSReceiptUtils.format( I18n.t( 'Sales Rep' ) + ': ' + receipt.header.salesRep, LINE_WIDTH ) ], 
		[ 'N', JSReceiptUtils.format( I18n.t( 'Status' ) + ': ' + receipt.header.docStatusName, LINE_WIDTH ) ], 
		[ 'N', JSReceiptUtils.format( I18n.t( 'Order No' ) + ': ' + receipt.header.documentNo, LINE_WIDTH ) ], 
		['N', JSReceiptUtils.format(moment(receipt.header.dateOrdered).format("ddd, DD MMM YYYY, HH:mm"), LINE_WIDTH)],
		[ 'CENTER' ], 
		[ 'N', LINE_SEPARATOR ],
        [ 'H1', "VOUCHER" ], 
		[ 'H1', cursymbol + Number( receipt.header.grandTotal * negate ).toFixed( 2 ) ],
        [ 'N', LINE_SEPARATOR ] 
	);

	printFormat.push( [ 'FEED' ] );
	printFormat.push( [ 'SIGNATURE' ] );
	printFormat.push( [ 'FEED' ] );
	printFormat.push( [ 'S', "This voucher is not valid until it has been signed." ] );
	printFormat.push( [ 'FEED' ] );


	if ( z.footerMessage && z.footerMessage.length > 0 ) {

		printFormat.push( [ 'S', z.footerMessage ] );
		
	} else {
		
		if ( receipt.header.receiptFooterMsg ) {

			var lines = JSReceiptUtils.splitIntoLines( receipt.header.receiptFooterMsg, LINE_WIDTH );

			if ( lines.length > 0 ) {
				
				for ( var i = 0; i < lines.length; i++ ) {
					printFormat.push( [ 'S', lines[ i ] ] );
				}
				
			}
			
		} else {
			
			printFormat.push( [ 'S', "Thank you for shopping. See you soon." ] );
		}
	}

	printFormat.push( [ 'PAPER_CUT' ] );

	return printFormat;
};


PrinterManager.print = function (printFormat) {
	
	if( !this.getPrinterConfiguration().ENABLE ){
		
		return;		
	}

    var printer = this.getPrinter();

    var printData = printer.format(printFormat);

    printer.print(printData);
};

PrinterManager.getPrinterConfiguration = function () {

    var configuration = {};
    
    var settings = localStorage.getItem('#PRINTER-SETTINGS');
    
    if(settings == null)
    {
    	settings = {
			'enable' : false,
			'implementation' : PrinterManager.implementations.POSTERITA_PRINT,
			'printer' : "",
			'ip' : "",
			'width' : 40,
			
			enable_pole : false,
			pole: "",
			kitchen_printers: []
    	};
    }
    else
    {
    	settings = JSON.parse(settings);
    }
  
    configuration.PRINTER_IMPLEMENTATION = PrinterManager.implementations.POSTERITA_PRINT;
    configuration.IP_ADDRESS = settings['ip'];
    configuration.LINE_WIDTH = settings['width'];
    configuration.PRINTER_NAME = settings['printer'];
    configuration.ENABLE = settings['enable'];
    
    configuration.ENABLE_POLE = settings['enable_pole'] || false;
	configuration.POLE_DISPLAY_NAME = settings['pole'] || '';
	configuration.KITCHEN_PRINTERS = settings['kitchen_printers'] || [];

    return configuration;
};

PrinterManager.getLineWidth = function () {

    var configuration = this.getPrinterConfiguration();
    return configuration.LINE_WIDTH;

};

PrinterManager.getPrinter = function () {

	return POSTERITA_Printer;
}

/* send a test page to printer */
PrinterManager.printTestPage = function (config) {

    var configuration = config || this.getPrinterConfiguration();

    var LINE_WIDTH = configuration.LINE_WIDTH;
    var LINE_SEPARATOR = JSReceiptUtils.replicate('#', LINE_WIDTH);

    var pageFormat = [];

    pageFormat.push(['CENTER']);
    pageFormat.push(['FEED']);
    pageFormat.push(['B', 'Posterita Printer Test page']);

    pageFormat.push(['N', LINE_SEPARATOR]);
    pageFormat.push(['FEED']);

    var msg = JSReceiptUtils.format("Line Width Test", LINE_WIDTH);
    pageFormat.push(['N', msg]);
    pageFormat.push(['N', LINE_SEPARATOR]);

    msg = JSReceiptUtils.format("The number of * and last digit on the", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    msg = JSReceiptUtils.format("first line gives us the line width.", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    pageFormat.push(['FEED']);

    msg = JSReceiptUtils.format("Ex. 123456789*123456789*1234", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    msg = JSReceiptUtils.format("No of * -> 2", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    msg = JSReceiptUtils.format("Last digit -> 4", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    msg = JSReceiptUtils.format("So line width -> 24", LINE_WIDTH);
    pageFormat.push(['N', msg]);

    pageFormat.push(['FEED']);

    pageFormat.push(['N', '123456789*123456789*123456789*123456789*123456789*123456789*123456789*123456789*']);

    /*
    pageFormat.push(['PAPER_CUT']);
    */

    pageFormat.push(['FEED']);
    pageFormat.push(['B', 'Sample Receipt']);
    pageFormat.push(['FEED']);


    var receiptJSON = {
        "commissions": [{
            "amt": 9.00,
            "salesRepId": 10051859,
            "name": "John"
        }],
        "payments": [{
            "writeOffAmt": 0,
            "overUnderAmt": 0,
            "payAmt": 10.35,
            "tenderType": "E",
            "discountAmt": 0,
            "cardType": "--"
        }],
        "lines": [{
            "priceEntered": "1.35",
            "priceLimit": "0",
            "taxRate": "15",
            "discountMessage": "10.00% off, Saved(0.15)",
            "lineNetAmt": "1.35",
            "taxName": "VAT",
            "boms": null,
            "priceList": "1.50",
            "priceActual": "1.35",
            "bom_ref_orderline_id": 0,
            "c_orderline_id": 11817612,
            "upc": "5449000000286",
            "productParentId": 0,
            "discount": "10.00",
            "serialNo": false,
            "bom": false,
            "modifier_ref_orderline_id": 0,
            "description": "Coca Cola 330ML",
            "qtyEntered": "1",
            "uomCode": "Ea ",
            "modifiers": null,
            "m_product_id": 10174762,
            "discountAmt": "0.15",
            "productName": "Coca Cola Classic 330ML"
        }, {
            "priceEntered": "1.95",
            "priceLimit": "0",
            "taxRate": "15",
            "discountMessage": null,
            "lineNetAmt": "3.90",
            "taxName": "VAT",
            "boms": null,
            "priceList": "1.95",
            "priceActual": "1.95",
            "bom_ref_orderline_id": 0,
            "c_orderline_id": 11817613,
            "upc": "6091094000155",
            "productParentId": 0,
            "discount": "0.00",
            "serialNo": false,
            "bom": false,
            "modifier_ref_orderline_id": 0,
            "description": "Evian 1L",
            "qtyEntered": "2",
            "uomCode": "Ea ",
            "modifiers": null,
            "m_product_id": 10174754,
            "discountAmt": "0.00",
            "productName": "Evian Water 1L"
        }, {
            "priceEntered": "3.75",
            "priceLimit": "0",
            "taxRate": "15",
            "discountMessage": null,
            "lineNetAmt": "3.75",
            "taxName": "VAT",
            "boms": null,
            "priceList": "3.75",
            "priceActual": "3.75",
            "bom_ref_orderline_id": 0,
            "c_orderline_id": 11817614,
            "upc": "9310072000787",
            "productParentId": 0,
            "discount": "0.00",
            "serialNo": false,
            "bom": false,
            "modifier_ref_orderline_id": 0,
            "description": "Minute Apple",
            "qtyEntered": "1",
            "uomCode": "Ea ",
            "modifiers": null,
            "m_product_id": 10174757,
            "discountAmt": "0.00",
            "productName": "Minute Maid Apple Juice"
        }],
        "comments": [],
        "taxes": [{
            "amt": "1.3500000000000000",
            "rate": "15",
            "name": "VAT",
            "baseAmt": "9.00"
        }],
        "header": {
            "orgTaxId": null,
            "client": "Business Name",
            "docStatus": "CO",
            "externalCardAmt": "10.35",
            "bpName2": null,
            "invoiceNo": "1001308",
            "amountTendered": null,
            "emailReceipt": false,
            "orgId": "10004017",
            "chequeAmt": "0",
            "openAmt": "0.00",
            "terminal": "Terminal",
            "payAmt": "10.35",
            "taxIncluded": false,
            "overUnderPayAmt": "0",
            "bpPostal": null,
            "receiptFooterMsg": null,
            "c_invoice_id": 10723546,
            "discountAmt": "0.15",
            "signature": null,
            "cardAmt": "0",
            "paymentRule": "E",
            "docStatusName": "Completed",
            "c_bpartner_id": 10044738,
            "orderType": "POS Order",
            "emailPromotion": false,
            "bpPhone2": "",
            "creditCardAccountHolderName": "",
            "giftCardAmt": "0",
            "grandTotal": "10.35",
            "c_order_id": 10727945,
            "voucherAmt": "0",
            "cardType": "",
            "salesRep": "John",
            "taxTotal": "1.3500000000000000",
            "bpTaxId": null,
            "offlineDocumentNo": null,
            "transactionId": "",
            "creditCardDetails": "",
            "org": {
                "countryId": 100,
                "fax": null,
                "postal": null,
                "address1": "Address1",
                "phone2": "",
                "address2": null,
                "postalAdd": null,
                "address3": null,
                "phone1": "230-9875632",
                "country": "Country",
                "city": "city",
                "taxNo": " ",
                "orgId": 10004017,
                "address4": null,
                "address": " address1",
                "name": "Store",
                "receiptFooterMsg": null,
                "regionId": 118
            },
            "soTrx": true,
            "orgPhone2": "",
            "documentNo": "1000000",
            "creditCardAuthorizationCode": "",
            "bpAddress2": "",
            "bpAddress3": null,
            "orgPhone": "xxx-xxx-xxxx",
            "bpAddress4": null,
            "paid": true,
            "title": "Sales Receipt",
            "writeOffAmt": "0",
            "subTotal": "9.15",
            "shipped": true,
            "bpAddress1": " ",
            "domain": "Domain",
            "amountRefunded": "0",
            "bpFax": "",
            "bpPhone": " ",
            "cashAmt": "0",
            "dateOrdered": "2013-01-01 00:00:00.0",
            "totalLines": "9.00",
            "qtyTotal": "4",
            "orgCity": "City",
            "orgName": "Store",
            "orgFax": null,
            "bpCity": "City",
            "paymentRuleName": "External Credit Card",
            "transactionType": "Credit Card Sale",
            "entryType": "Manual",
            "currencySymbol": "$",
            "bpName": "Walk-in Customer",
            "orgAddress1": "Address1",
            "orgPostal": null,
            "orgAddress3": null,
            "orgAddress2": null,
            "orgAddress4": null,
            "referenceNo": null
        }
    };
    
    receiptJSON.header.signature = SAMPLE_SIGNATURE;

    var samplePageFormat = this.getReceiptPrintFormat(receiptJSON, true);

    pageFormat = pageFormat.concat(samplePageFormat);

    this.print(pageFormat);

};

var JAVA_APPLET_Printer = {
		
	getPrinterConfiguration : function() {
		return PrinterManager.getPrinterConfiguration();
	},

    format: function (printFormat) {

        var configuration = this.getPrinterConfiguration();
        
        //console.info(configuration);

        var LINE_WIDTH = configuration.LINE_WIDTH;
        var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);

        var request = "";
        /* Restore line spacing */
        request += ESC_COMMANDS.DEFAULT_LINE_SPACING;

        for (var i = 0; i < printFormat.length; i++) {
            var line = printFormat[i];

            if (line.length == 1) {
                var command = line[0];

                switch (command) {
                case 'FEED':
                    request += ESC_COMMANDS.LINE_FEED;
                    break;

                case 'SEPARATOR':
                    request += LINE_SEPARATOR;
                    request += ESC_COMMANDS.LINE_FEED;
                    break;

                case 'CENTER':
                    request += ESC_COMMANDS.CENTER_ALIGN;
                    break;

                case 'LEFT':
                    request += ESC_COMMANDS.LEFT_ALIGN;
                    break;

                case 'RIGHT':
                    request += ESC_COMMANDS.RIGHT_ALIGN;
                    break;

                case 'SIGNATURE':

                    var canvas = document.getElementById("signature-canvas");
                    if (canvas) {
                        var imageBase64 = canvas.toDataURL();
                        request = request + "<image>" + imageBase64 + "<image>";
                    } else {
                        request += (ESC_COMMANDS.FONT_NORMAL_BOLD + JSReceiptUtils.format(I18n.t("Signature") + ":________________________________________________", LINE_WIDTH));
                    }

                    request += ESC_COMMANDS.LINE_FEED;
                    break;

                case 'PAPER_CUT':
                    request += ESC_COMMANDS.PAPER_CUT;
                    request += ESC_COMMANDS.LINE_FEED;
                    break;

                case 'OPEN_DRAWER':
                    request += ESC_COMMANDS.OPEN_DRAWER;
                    break;

                case 'NVRAM':
                    request += ESC_COMMANDS.NVRAM;
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

                switch (font) {
                    /*normal*/
                case 'N':
                    request += ESC_COMMANDS.FONT_NORMAL;
                    break;

                    /*bold*/
                case 'B':
                    request += ESC_COMMANDS.FONT_NORMAL_BOLD;
                    break;

                    /*invert*/
                case 'I':
                    request += ESC_COMMANDS.FONT_NORMAL;
                    break;

                    /*underline*/
                case 'U':
                    request += ESC_COMMANDS.FONT_NORMAL;
                    break;

                    /*small*/
                case 'S':
                    request += ESC_COMMANDS.FONT_SMALL;
                    break;

                    /*header 1*/
                case 'H1':
                    request += ESC_COMMANDS.FONT_H1;
                    break;

                    /*header 2*/
                case 'H2':
                    request += ESC_COMMANDS.FONT_H2;
                    break;

                    /*header 3*/
                case 'H3':
                    request += ESC_COMMANDS.FONT_H3;
                    break;

                    /*header 4*/
                case 'H4':
                    request += ESC_COMMANDS.FONT_H4;
                    break;


                case 'BARCODE':

                    var barcodeLengthMap = ['\x04', '\x05', '\x06', '\x07', '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F'];
                    var barcodeLength = barcodeLengthMap[text.length - 4];
                    var barcode = '\x1D' + 'h' + '\x64' + '\x1D' + 'w' + '\x02' + '\x1D' + 'H' + '\x02' + '\x1D' + 'k' + '\x45' + barcodeLength + text;

                    request += ESC_COMMANDS.LINE_FEED;
                    request += barcode;
                    /* override barcode text */
                    text = "";
                    break;

                case 'CANVAS':
                    var canvas = text;
                    var imageBase64 = canvas.toDataURL();
                    request = request + "<image>" + imageBase64 + "<image>";
                    text = "";
                    break;
                
	            case 'IMG':
	                var imageBase64 = text;
	                request = request + "<image>" + imageBase64 + "<image>";
	                text = "";
	                break;
	
	            }


                request += text;
                request += ESC_COMMANDS.LINE_FEED;
                
            }
        }

        return request;
    },

    print: function (printData) {
        
    	/* printing via applet */
        var applet = this.getPrintApplet();

        if (applet == null) {
            console.error('Could not connect to Printer Applet!');
            return false;
        }

        try 
        {
        	var configuration = PrinterManager.getPrinterConfiguration();
        	var printerName = configuration.PRINTER_NAME;
        	
        	if(printerName == null) {
        		console.error('Printer not configured!');
        		return false;
        	}
        	
        	if(printerName.length > 0 && printerName != 'error' && printerName != 'default'){
        		var applet = JAVA_APPLET_Printer.getPrintApplet();  
        		if(applet != null){
        			applet.setPrinterName(printerName);
        		}
        	}        	
        	
            applet.addJob(printData);
            return true;
        } catch (xception) {
            console.error('Could not send job to Printer! An error has occurred: ' + xception.message);
            return false;
        }
    },

    getPrintApplet: function () {

        var configuration = PrinterManager.getPrinterConfiguration();

        if (this.applet) return this.applet;
        
        
        if (this.applet == null){
        	/* look for posterita bridge */
        	if(window.PosteritaBridge){
        		this.applet = window.PosteritaBridge;
        		return this.applet;
        	}
        	else 
        	{
                if (window.parent) {
                	if(window.parent.PosteritaBridge){
                		this.applet = window.parent.PosteritaBridge;
                		return this.applet;
                	}
                }
            }
        }

        

        if (document.applets.length > 0) {
            applet = document.applets[0];
        } else {
            if (window.parent.frames) {
                if (window.parent.frames.length > 1) {
                    for (var i = 0; i < window.parent.frames.length; i++) {
                        applet = window.parent.frames[i].document.applets[0];
                        if (applet != null) {
                            this.applet = applet;
                            break;
                        }
                    }
                }
            }
        }       
        

        if (applet == null) return null;

        /* set printer name */
        var printer = configuration.PRINTER_NAME;

        if (printer == 'default') {
            printer = applet.getPrinterName();
        } else {
            if (printer && printer != null && printer.length > 0 && printer != 'error') {
            	try {
            		applet.setPrinterName(printer);
                } catch (xception) {
                    console.error('Could not set active printer! An error has occurred: ' + xception.message);
                    return null;
                }                
            }
        }

        return applet;
    }

};


var POSTERITA_Printer = jQuery.extend(JAVA_APPLET_Printer, {

	getPrinterConfiguration : function() {
		return PrinterManager.getPrinterConfiguration();
	},
	
    /* override print method */
    print: function(printData) {

    	var configuration = this.getPrinterConfiguration();
    	
    	var serverPrint  = localStorage.getItem('print-via-server') || 'N';
    	
    	if( POSTERITA_Bridge.isPresent() && serverPrint == 'N'){
    		
    		POSTERITA_Bridge.print(configuration.PRINTER_NAME, printData);
    	}
    	else
    	{
    		var base64encodedstr = Base64.encode(printData);
            
            /* use xmlhttprequest driectly */
            var xhttp;
            if (window.XMLHttpRequest) {
                xhttp = new XMLHttpRequest();
                } else {
                // code for IE6, IE5
                xhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }
            
            xhttp.onreadystatechange = function() {
            	  if (xhttp.readyState == 4 && xhttp.status == 200) {
            	    console.log(xhttp.responseText);
            	  }
            };
            
            xhttp.open("POST", "/printing/");
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            
            var postData = "action=print&printer=" + encodeURIComponent(configuration.PRINTER_NAME) + "&job=" + encodeURIComponent(base64encodedstr);
                    
            xhttp.send(postData);
    	}
    },

    getPrinters: function() {

        var dfd = new jQuery.Deferred();
        
        var serverPrint  = localStorage.getItem('print-via-server') || 'N';        
        
        if( POSTERITA_Bridge.isPresent() && serverPrint == 'N'){
    		
    		var list = POSTERITA_Bridge.getPrintersAsJSON();
    		
    		dfd.resolve(JSON.parse(list));
    		
    		return dfd.promise();    		
    	}
    	

        jQuery.get("printing/", {
                action: "getPrinters"
            },
            function(json, textStatus, jqXHR) {

                if (json == null || jqXHR.status != 200) {
                    dfd.reject('Failed to get printers');
                    return;
                }

                dfd.resolve(json);

            },

            "json").fail(function() {
            console.error('Failed to get printers');
        });

        return dfd.promise();
    }

});

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


var STAR_WEB_PRINT_Printer = {
		getPrinterConfiguration : function() {
			return PrinterManager.getPrinterConfiguration();
		},

	    format: function (printFormat) {

	        var configuration = this.getPrinterConfiguration();
	        
            var LINE_WIDTH = configuration.LINE_WIDTH;
            var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);

            var builder = new StarWebPrintBuilder();
            var request = "";
            
            /* parse print format */
            for (var i = 0; i < printFormat.length; i++) 
            {
                var line = printFormat[i];
                
                if (line.length == 1) {
                    var command = line[0];

                    switch (command) {
                    case 'FEED':
                        request += builder.createFeedElement({
                            line: 1
                        });
                        break;
                    case 'SEPARATOR':
                        request += builder.createRuledLineElement({
                            thickness: 'thin',
                            width: LINE_WIDTH
                        });
                        break;
                    case 'CENTER':
                        request += builder.createAlignmentElement({
                            position: 'center'
                        });
                        break;
                    case 'LEFT':
                        request += builder.createAlignmentElement({
                            position: 'left'
                        });
                        break;
                    case 'RIGHT':
                        request += builder.createAlignmentElement({
                            position: 'right'
                        });
                        break;
                    case 'SIGNATURE':
                        /* see view-order.jsp line 763 */
                        var canvas = document.getElementById("signature-canvas");
                        if (canvas) {
                            var context = canvas.getContext('2d');
                            request += builder.createBitImageElement({
                                context: context,
                                x: 0,
                                y: 0,
                                width: canvas.width,
                                height: canvas.height
                            });
                        } else {

                            var signatureJSON = {
                                characterspace: 0,
                                linespace: 32,
                                codepage: 'cp998',
                                international: 'usa',
                                font: 'font_a',
                                width: 1,
                                height: 1,
                                emphasis: true,
                                underline: false,
                                invert: false,
                                data: JSReceiptUtils.format(I18n.t("Signature") + ":________________________________________________", LINE_WIDTH)
                            };

                            request += builder.createTextElement(signatureJSON);
                            request += builder.createFeedElement({
                                line: 1
                            });

                        }

                        break;

                    case 'PAPER_CUT':
                        request += builder.createCutPaperElement({
                            feed: true,
                            type: 'full'
                        });
                        break;

                    case 'OPEN_DRAWER':
                        request += builder.createPeripheralElement({
                            channel: 1,
                            on: 200,
                            off: 200
                        });
                        break;

                    case 'NVRAM':
                        request += builder.createRawDataElement({
                            data: ESC_COMMANDS.NVRAM
                        });
                        break;

                    }/*switch*/
                }
                else
                {
                	var font = line[0];
                    var text = line[1];

                    if (text == null) continue;

                    if (line.length > 2) {
                        var label = line[2];
                        text = label + text;
                    }

                    var textElementJSON = {
                        characterspace: 0,
                        linespace: 32,
                        codepage: 'cp998',
                        international: 'usa',
                        font: 'font_a',
                        width: 1,
                        height: 1,
                        emphasis: false,
                        underline: false,
                        invert: false,
                        data: text
                    };
                    
                    switch (font) {
                    /*normal*/
                    case 'N':
                        break;

                        /*bold*/
                    case 'B':
                        textElementJSON.emphasis = true;
                        break;

                        /*invert*/
                    case 'I':
                        textElementJSON.invert = true;
                        break;

                        /*underline*/
                    case 'U':
                        textElementJSON.underline = true;
                        break;

                        /*small*/
                    case 'S':
                        textElementJSON.font = 'font_b';
                        break;

                        /*header 1*/
                    case 'H1':
                        textElementJSON.font = 'font_a';
                        textElementJSON.emphasis = true;
                        textElementJSON.width = 2;
                        textElementJSON.height = 2;
                        break;

                        /*header 2*/
                    case 'H2':
                        textElementJSON.font = 'font_a';
                        textElementJSON.emphasis = false;
                        textElementJSON.width = 2;
                        textElementJSON.height = 2;
                        break;

                        /*header 3*/
                    case 'H3':
                        textElementJSON.font = 'font_b';
                        textElementJSON.emphasis = true;
                        textElementJSON.width = 2;
                        textElementJSON.height = 2;
                        break;

                        /*header 4*/
                    case 'H4':
                        textElementJSON.font = 'font_b';
                        textElementJSON.emphasis = false;
                        textElementJSON.width = 2;
                        textElementJSON.height = 2;
                        break;
                    
                        
                    case 'BARCODE':
                        request += builder.createBarcodeElement({
                            symbology: 'Code39',
                            data: text
                        });

                        textElementJSON.data = "";

                        break;

                    case 'CANVAS':
                        var canvas = text;
                        /* overwrite text */
                        text = "";
                        var context = canvas.getContext('2d');
                        request += builder.createBitImageElement({
                            context: context,
                            x: 0,
                            y: 0,
                            width: canvas.width,
                            height: canvas.height
                        });

                        textElementJSON.data = "";

                        break; 
                        
                    }/*switch*/
                    
                    request += builder.createTextElement(textElementJSON);
                    request += builder.createFeedElement({
                        line: 1
                    });
                    
                }/*else*/                
                
            }/*for*/
            
            
            return request;
			
		},
		
		print: function (printData) {

	        var configuration = PrinterManager.getPrinterConfiguration();
	        var ips = configuration.IP_ADDRESS;

	        ips = ips.split(',');
	        for (var i = 0; i < ips.length; i++) {
	            var ip = ips[i];
	            ip = ip.trim();

	            var address = 'http://' + ip + '/StarWebPRNT/SendMessage';

	            var trader = new StarWebPrintTrader({
	                url: address
	            });

	            trader.onReceive = function (response) {
	                var responseXML = response.responseText;
	                console.log(responseXML);
	            };
	            trader.onError = function (response) {
	                var responseXML = response.responseText;
	                console.log(responseXML);
	            }

	            trader.sendMessage({
	                request: printData
	            });
	        }
	    },

	    sendJob: function (ip, job) {

	    }
		
};


var EPSON_EPOS_PRINT_Printer = {
	
	getPrinterConfiguration : function() {
		return PrinterManager.getPrinterConfiguration();
	},

    format: function (printFormat) {

        var configuration = this.getPrinterConfiguration();

        var LINE_WIDTH = configuration.LINE_WIDTH;
        var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);

        var builder = new epson.ePOSBuilder();

        for (var i = 0; i < printFormat.length; i++) {
            var line = printFormat[i];

            if (line.length == 1) {
                var command = line[0];

                switch (command) {

                case 'FEED':
                    builder.addFeed();
                    break;

                case 'PAPER_CUT':
                    builder.addCut(builder.CUT_FEED);
                    break;

                case 'OPEN_DRAWER':
                    builder.addCommand(ESC_COMMANDS.OPEN_DRAWER);
                    break;

                case 'NVRAM':
                    builder.addCommand(ESC_COMMANDS.NVRAM);
                    break;

                case 'SEPARATOR':
                    builder.addText(LINE_SEPARATOR);
                    builder.addFeed();
                    break;

                case 'CENTER':
                    builder.addTextAlign(builder.ALIGN_CENTER);
                    break;

                case 'LEFT':
                    builder.addTextAlign(builder.ALIGN_LEFT);
                    break;

                case 'RIGHT':
                    builder.addTextAlign(builder.ALIGN_RIGHT);
                    break;

                case 'SIGNATURE':
                    /* see view-order.jsp line 763 */
                    var canvas = document.getElementById("signature-canvas");
                    if (canvas) {
                        var context = canvas.getContext('2d');

                        builder.brightness = 1.0;
                        builder.halftone = builder.HALFTONE_ERROR_DIFFUSION;
                        builder.addImage(context, 0, 0, canvas.width, canvas.height, builder.COLOR_1, builder.MODE_MONO);
                    } else {
                        builder.addCommand(ESC_COMMANDS.FONT_NORMAL_BOLD);
                        builder.addText(JSReceiptUtils.format(I18n.t("Signature") + ":________________________________________________", LINE_WIDTH));
                        builder.addFeed();
                    }

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

                switch (font) {
                    /*normal*/
                case 'N':
                    builder.addCommand(ESC_COMMANDS.FONT_NORMAL);
                    break;

                    /*bold*/
                case 'B':
                    builder.addCommand(ESC_COMMANDS.FONT_NORMAL_BOLD);
                    break;

                    /*invert*/
                case 'I':
                    builder.addCommand(ESC_COMMANDS.FONT_NORMAL);
                    break;

                    /*underline*/
                case 'U':
                    builder.addCommand(ESC_COMMANDS.FONT_NORMAL);
                    break;

                    /*small*/
                case 'S':
                    builder.addCommand(ESC_COMMANDS.FONT_SMALL);
                    break;

                    /*header 1*/
                case 'H1':
                    builder.addCommand(ESC_COMMANDS.FONT_H1);
                    break;

                    /*header 2*/
                case 'H2':
                    builder.addCommand(ESC_COMMANDS.FONT_H2);
                    break;

                    /*header 3*/
                case 'H3':
                    builder.addCommand(ESC_COMMANDS.FONT_H3);
                    break;

                    /*header 4*/
                case 'H4':
                    builder.addCommand(ESC_COMMANDS.FONT_H4);
                    break;


                case 'BARCODE':
                    builder.addBarcode(text, builder.BARCODE_CODE39, builder.HRI_BELOW, builder.FONT_A, 2, 128);
                    /* override text */
                    text = "";
                    break;

                case 'CANVAS':
                    var canvas = text;
                    // override text
                    text = "";
                    var context = canvas.getContext('2d');

                    builder.brightness = 1.0;
                    builder.halftone = builder.HALFTONE_ERROR_DIFFUSION;
                    builder.addImage(context, 0, 0, canvas.width, canvas.height, builder.COLOR_1, builder.MODE_MONO);

                    break;

                }

                builder.addText(text);
                builder.addFeed();

            }
        }

        return builder.toString();
    },

    print: function (printData) {

        var configuration = PrinterManager.getPrinterConfiguration();
        var ips = configuration.IP_ADDRESS;

        ips = ips.split(',');

        for (var i = 0; i < ips.length; i++) {

            var ip = ips[i];
            ip = ip.trim();

            var address = 'http://' + ip + '/cgi-bin/epos/service.cgi?devid=local_printer&timeout=60000';

            var epos = new epson.ePOSPrint(address);

            epos.onreceive = function (response) {
                console.info(response.success);
            };

            epos.onerror = function (error) {
                console.error(error.status);
            };

            epos.oncoveropen = function () {
                alert('Printer cover is open.');
            };

            epos.send(printData);
        }
    }
};

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
var Base64 = {

	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	// public method for encoding
	encode : function (input) {
	    var output = "";
	    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	    var i = 0;
	
	    input = Base64._utf8_encode(input);
	
	    while (i < input.length) {
	
	        chr1 = input.charCodeAt(i++);
	        chr2 = input.charCodeAt(i++);
	        chr3 = input.charCodeAt(i++);
	
	        enc1 = chr1 >> 2;
	        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
	        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
	        enc4 = chr3 & 63;
	
	        if (isNaN(chr2)) {
	            enc3 = enc4 = 64;
	        } else if (isNaN(chr3)) {
	            enc4 = 64;
	        }
	
	        output = output +
	        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
	        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
	
	    }
	
	    return output;
	},
	
	// public method for decoding
	decode : function (input) {
	    var output = "";
	    var chr1, chr2, chr3;
	    var enc1, enc2, enc3, enc4;
	    var i = 0;
	
	    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
	
	    while (i < input.length) {
	
	        enc1 = this._keyStr.indexOf(input.charAt(i++));
	        enc2 = this._keyStr.indexOf(input.charAt(i++));
	        enc3 = this._keyStr.indexOf(input.charAt(i++));
	        enc4 = this._keyStr.indexOf(input.charAt(i++));
	
	        chr1 = (enc1 << 2) | (enc2 >> 4);
	        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
	        chr3 = ((enc3 & 3) << 6) | enc4;
	
	        output = output + String.fromCharCode(chr1);
	
	        if (enc3 != 64) {
	            output = output + String.fromCharCode(chr2);
	        }
	        if (enc4 != 64) {
	            output = output + String.fromCharCode(chr3);
	        }
	
	    }
	
	    output = Base64._utf8_decode(output);
	
	    return output;
	
	},
	
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
	    string = string.replace(/\r\n/g,"\n");
	    var utftext = "";
	
	    for (var n = 0; n < string.length; n++) {
	
	        var c = string.charCodeAt(n);
	
	        if (c < 128) {
	            utftext += String.fromCharCode(c);
	        }
	        else if((c > 127) && (c < 2048)) {
	            utftext += String.fromCharCode((c >> 6) | 192);
	            utftext += String.fromCharCode((c & 63) | 128);
	        }
	        else {
	            utftext += String.fromCharCode((c >> 12) | 224);
	            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
	            utftext += String.fromCharCode((c & 63) | 128);
	        }
	
	    }
	
	    return utftext;
	},
	
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
	    var string = "";
	    var i = 0;
	    var c = c1 = c2 = 0;
	
	    while ( i < utftext.length ) {
	
	        c = utftext.charCodeAt(i);
	
	        if (c < 128) {
	            string += String.fromCharCode(c);
	            i++;
	        }
	        else if((c > 191) && (c < 224)) {
	            c2 = utftext.charCodeAt(i+1);
	            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
	            i += 2;
	        }
	        else {
	            c2 = utftext.charCodeAt(i+1);
	            c3 = utftext.charCodeAt(i+2);
	            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
	            i += 3;
	        }
	
	    }
	
	    return string;
	}

};

PrinterManager.printGiftReceipt = function (receiptJSON) {

    var printFormat = this.getGiftReceiptPrintFormat(receiptJSON);

    this.print(printFormat);
};

PrinterManager.getGiftReceiptPrintFormat = function (receiptJSON) {

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
			  "showLogo": false
	};
	
	if( receipt.header.receiptFormat && receipt.header.receiptFormat.length > 0 ){
		
		z = JSON.parse( receipt.header.receiptFormat );
		
	}

    var configuration = this.getPrinterConfiguration();

    var LINE_WIDTH = configuration.LINE_WIDTH;
    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
    

    var isCreditCardTransaction = false;

    if (receipt.header.cardAmt != 0) {
        isCreditCardTransaction = true;
    }
    
    var taxLabel = 'TaxNo: ';
    var receiptTitle = "Gift Receipt";
    
    receiptTitle = receiptTitle + " #" + receipt.header.documentNo;

    var printFormat = [];
    
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
    
    
    printFormat.push(['N', LINE_SEPARATOR],
            ['H4', receiptTitle],
            ['N', JSReceiptUtils.format((receipt.header.soTrx ? I18n.t('Customer') : I18n.t('Vendor')) + ': ' + receipt.header.bpName + ((receipt.header.bpName2 != null && receipt.header.bpName2.length > 0) ? (' ' + receipt.header.bpName2) : ''), LINE_WIDTH)],
            TERMINAL_NAME,
            ['N', JSReceiptUtils.format(I18n.t('Sales Rep') + ': ' + receipt.header.salesRep, LINE_WIDTH)],
            ['N', JSReceiptUtils.format(I18n.t('Status') + ': ' + receipt.header.docStatusName, LINE_WIDTH)],
            ['N', JSReceiptUtils.format(I18n.t('Payment') + ': ' + receipt.header.paymentRuleName + " " + receipt.header.creditCardDetails, LINE_WIDTH)],
            ['N', JSReceiptUtils.format(I18n.t('Order No') + ': ' + receipt.header.documentNo, LINE_WIDTH)],
            ['N', JSReceiptUtils.format(receipt.header.dateOrdered, LINE_WIDTH)],
            ['CENTER'],
            ['N', LINE_SEPARATOR],
            ['B', JSReceiptUtils.format(I18n.t('Name'), LINE_WIDTH - 6) + JSReceiptUtils.format(I18n.t('Qty'), 6, true)],
            ['N', LINE_SEPARATOR]);


    /*-----------------------------------------------------------------------------------------*/
    /* add order body */
    for (var i = 0; i < receipt.lines.length; i++) {
        var line = receipt.lines[i];

        var text = line.description || line.productName;
        while (text.length > (LINE_WIDTH - 6)) {
            printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
            text = text.substr(LINE_WIDTH);
        }

        var s = (JSReceiptUtils.format(text, LINE_WIDTH - 6) + JSReceiptUtils.format(line.qtyEntered, 6, true));

        printFormat.push(['N', s]);

        /*
        if (line.discountMessage != null) {
            printFormat.push(['N', JSReceiptUtils.format(line.discountMessage, LINE_WIDTH)]);
        }
        */

        if (line.boms != null)
            for (var j = 0; j < line.boms.length; j++) {
                var bom = line.boms[j];

                var text = " " + (bom.description || bom.productName);
                while (text.length > (LINE_WIDTH - 6)) {
                    printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
                    text = text.substr(LINE_WIDTH);
                }

                var s = (JSReceiptUtils.format(text, LINE_WIDTH - 6) + JSReceiptUtils.format(bom.qtyEntered, 6, true));

                printFormat.push(['N', s]);

            }

        if (line.modifiers != null)
            for (var j = 0; j < line.modifiers.length; j++) {
                var modifier = line.modifiers[j];

                var text = " " + (modifier.description || modifier.productName);
                while (text.length > (LINE_WIDTH - 6)) {
                    printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
                    text = text.substr(LINE_WIDTH);
                }

                var s = (JSReceiptUtils.format(text, LINE_WIDTH));

                printFormat.push(['N', s]);

            }
    }

    printFormat.push(['N', LINE_SEPARATOR]);


    printFormat.push(['FEED']);
    
    if( z.showBarcode == true ){
    	
    	printFormat.push(['BARCODE', receipt.header.documentNo]);
    	
    }
    

    printFormat.push(['FEED']);
    
    if( z.footerMessage && z.footerMessage.length > 0 ){
    	
    	printFormat.push(['S', z.footerMessage ]);
    }
    else
    {
    	if (receipt.header.receiptFooterMsg) {

            var lines = JSReceiptUtils.splitIntoLines(receipt.header.receiptFooterMsg, LINE_WIDTH);

            if (lines.length > 0) {
                for (var i = 0; i < lines.length; i++) {
                    printFormat.push(['S', lines[i]]);
                }
            }
        } else {
            printFormat.push(['S', "Thank you for shopping. See you soon."]);
        }
    }

    /* send print format to printer */

    printFormat.push(['PAPER_CUT']);   

    return printFormat;
};

var PoleDisplay_ESC_COMMANDS = {
        CLEAR:'\x0C',
        LINE_FEED:'\x0A',
        MOVE_LEFT: '\x0D'
};

/* Pole Display */
var POLE_DISPLAY = {
	
	getPrinterConfiguration : function() {
			
		return PrinterManager.getPrinterConfiguration();
	},
	
	printTestData:function(){
    	this.display("Welcome to", "Posterita POS");
    },
   
    clearDisplay:function(){
        var printJob = PoleDisplay_ESC_COMMANDS.CLEAR;           
        this.print(printJob);
    },
   
display:function(line1, line2, line3, line4){
    	
    	var configuration = this.getPrinterConfiguration();
    	
    	var name = configuration.POLE_DISPLAY_NAME;
    	
    	if( name.substr( name.length - 3 ) == 'led' ){
    		
    		var action = line3;
    		var cart = line4; 
    		var amt = line4;
    		
    		switch (action) {
    		
			case "cart.addToCart":	this.showTotal( cart.grandTotal.toString() );			
				break;
				
			case "cart.removeFromCart":	this.showTotal( cart.grandTotal.toString() );				
				break;
				
			case "cart.updateQty":	this.showTotal( cart.grandTotal.toString() );					
				break;
				
			case "cart.update":	this.showTotal( cart.grandTotal.toString() );					
				break;
				
			case "cart.updateTotal": this.showTotal( cart.grandTotal.toString() );					
				break;
				
			case "cart.clear":	this.showTotal( cart.grandTotal.toString() );					
				break;
				
			case "cart.showTotal":	this.showTotal( cart.grandTotal.toString() );				
				break;
				
			case "cart.showPaid":	this.showPaid( new Number(amt).toFixed(2) );	
				break;
				
			case "cart.showChange":	this.showChange( new Number(amt).toFixed(2) );			
				break;
				
			case "welcome.message":				
				break;

			default:
				break;
			}
    		
    	}
    	else
    	{
    		/* truncate long text */
        	line1 = JSReceiptUtils.format(line1, 20);        	
        	
            /* clear display */
            var printJob = PoleDisplay_ESC_COMMANDS.CLEAR;
            printJob = printJob + line1;
           
            if(line2){
            	line2 = JSReceiptUtils.format(line2, 20);
                printJob = printJob + line2;
            }
           
            this.print(printJob);
    	}	
    	
    },
    
    print : function(printData) {
    	
    	var configuration = this.getPrinterConfiguration();
    	
    	if( !configuration.ENABLE_POLE ){
    		
    		return;
    		
    	}
    	
    	if( POSTERITA_Bridge.isPresent() ){
    		
    		POSTERITA_Bridge.print(configuration.POLE_DISPLAY_NAME, printData);
    		
    		return;    		
    	}    	   	
    	
        var base64encodedstr = Base64.encode(printData);
        
        /* use xmlhttprequest driectly */
        var xhttp;
        if (window.XMLHttpRequest) {
            xhttp = new XMLHttpRequest();
            } else {
            // code for IE6, IE5
            xhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        
        xhttp.onreadystatechange = function() {
        	  if (xhttp.readyState == 4 && xhttp.status == 200) {
        	    //console.log(xhttp.responseText);
        	  }
        };
        
        xhttp.open("POST", "/printing/", false);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        
        var postData = "action=print&printer=" + encodeURIComponent(configuration.POLE_DISPLAY_NAME) + "&job=" + encodeURIComponent(base64encodedstr);
                
        xhttp.send(postData);
    },
    
    showPrice : function( price ){
    	
    	var command = "\x18" + new Number(price).toFixed(2) + "\x1B\x73\x31";
    	this.print( command );
    	
    },
    
    showTotal : function( total ){
    	
    	var command = "\x18" + new Number(total).toFixed(2) + "\x1B\x73\x32";
    	this.print( command );
    	
    },
    
    showPaid : function( paid ){
    	
    	var command = "\x18" + new Number(paid).toFixed(2) + "\x1B\x73\x33";
    	this.print( command );
    	
    },
    
    showChange : function( change ){
    	
    	var command = "\x18" + new Number(change).toFixed(2) + "\x1B\x73\x34";
    	this.print( command );
    	
    }
    
};

var POSTERITA_Bridge = {
		
		bridge : null,
		
		initialized : false,
		
		init : function(){
			
			if(window.PosteritaBridge){
        		this.bridge = window.PosteritaBridge;
        	}
        	else 
        	{
                if (window.parent) {
                	if(window.parent.PosteritaBridge){
                		this.bridge = window.parent.PosteritaBridge;
                	}
                }
            }
			
			initialized = true;			
		},
		
		isPresent : function() {
			if(this.initialized == false){
				this.init();
			}
			
			if(this.bridge == null){
				return false;
			}
			
			return true;
		},
		
		print : function ( printerName, printData ) {
			
			if( !this.isPresent() ) {
				
				alert('Posterita Bridge not present!');
				return;
			}
			
			try {
				this.bridge.addJob( printerName, printData );
			}
			catch(err) {
			  alert("Posterita Bridge Error: " + err.message);
			}
			
		},
		
		getPrintersAsJSON : function(){
			
			if( !this.isPresent() ) {
				
				alert('Posterita Bridge not present!');
				return null;
			}
			
			return this.bridge.getPrintersAsJSON();
			
		}
};

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

/*MOCK_BRIDGE.init();*/

/* sample data */
var SAMPLE_SIGNATURE = "data:image/png;base64,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";
var POSTERITA_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUYAAABlCAYAAAAxmErcAAAACXBIWXMAAAsTAAALEwEAmpwYAAA50WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMTQgNzkuMTUxNDgxLCAyMDEzLzAzLzEzLTEyOjA5OjE1ICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx4bXA6Q3JlYXRlRGF0ZT4yMDE0LTA0LTE0VDEzOjQ2OjM4KzA0OjAwPC94bXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhtcDpNb2RpZnlEYXRlPjIwMTQtMDctMjRUMDk6NTc6MzgrMDQ6MDA8L3htcDpNb2RpZnlEYXRlPgogICAgICAgICA8eG1wOk1ldGFkYXRhRGF0ZT4yMDE0LTA3LTI0VDA5OjU3OjM4KzA0OjAwPC94bXA6TWV0YWRhdGFEYXRlPgogICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3BuZzwvZGM6Zm9ybWF0PgogICAgICAgICA8cGhvdG9zaG9wOkNvbG9yTW9kZT4zPC9waG90b3Nob3A6Q29sb3JNb2RlPgogICAgICAgICA8eG1wTU06SW5zdGFuY2VJRD54bXAuaWlkOjI5M2I3MjI1LTdhNWEtZjU0Zi04MWZkLTAwMzkwM2ZhMWU0NzwveG1wTU06SW5zdGFuY2VJRD4KICAgICAgICAgPHhtcE1NOkRvY3VtZW50SUQ+eG1wLmRpZDpmODlmZWYyMC05NDQ3LWZlNGUtOTliZi1kYmE2MzMxNTI1MmU8L3htcE1NOkRvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+eG1wLmRpZDpmODlmZWYyMC05NDQ3LWZlNGUtOTliZi1kYmE2MzMxNTI1MmU8L3htcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD4KICAgICAgICAgPHhtcE1NOkhpc3Rvcnk+CiAgICAgICAgICAgIDxyZGY6U2VxPgogICAgICAgICAgICAgICA8cmRmOmxpIHJkZjpwYXJzZVR5cGU9IlJlc291cmNlIj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmFjdGlvbj5jcmVhdGVkPC9zdEV2dDphY3Rpb24+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDppbnN0YW5jZUlEPnhtcC5paWQ6Zjg5ZmVmMjAtOTQ0Ny1mZTRlLTk5YmYtZGJhNjMzMTUyNTJlPC9zdEV2dDppbnN0YW5jZUlEPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6d2hlbj4yMDE0LTA0LTE0VDEzOjQ2OjM4KzA0OjAwPC9zdEV2dDp3aGVuPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6c29mdHdhcmVBZ2VudD5BZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+c2F2ZWQ8L3N0RXZ0OmFjdGlvbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0Omluc3RhbmNlSUQ+eG1wLmlpZDoyOTNiNzIyNS03YTVhLWY1NGYtODFmZC0wMDM5MDNmYTFlNDc8L3N0RXZ0Omluc3RhbmNlSUQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDp3aGVuPjIwMTQtMDctMjRUMDk6NTc6MzgrMDQ6MDA8L3N0RXZ0OndoZW4+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpzb2Z0d2FyZUFnZW50PkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cyk8L3N0RXZ0OnNvZnR3YXJlQWdlbnQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpjaGFuZ2VkPi88L3N0RXZ0OmNoYW5nZWQ+CiAgICAgICAgICAgICAgIDwvcmRmOmxpPgogICAgICAgICAgICA8L3JkZjpTZXE+CiAgICAgICAgIDwveG1wTU06SGlzdG9yeT4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHRpZmY6WFJlc29sdXRpb24+NzIwMDAwLzEwMDAwPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjAwMDAvMTAwMDA8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+NjU1MzU8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjMyNjwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4xMDE8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PkxB3/IAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAC8tJREFUeNrsne+12roSxbezUoA7eH4VHN8K4ltBeBXEqSCkgpAKOLcCTiogqQBSAdwK4FYArwLeB8QK7wRjjTT6Y7N/a/lDcowtz4y2RrIsFafTCYQQQn7xhiYghBAKIyGEUBgJIYTCSAghFEZCCKEwEkJIMN76XqAoClpxfLQAKovz9gBeaK5B+QwAZmN56GDTDU+nk9dBRskKwMniWNFUg/PZqCqtr351HexKE0LIKyiMhBBCYSSEEAojIYSIeEsTEJIlNYAJgCcARwD/4DwDYE/TUBgJeTRKAEsAzY2/fQHwDOCrEUvCrjQhDyGKqw5RvDA1wkkojIQ8BHPThe6jwYgmaVMYCSFdVDh/vWLLJ5qMwkjIIwijtNtd02wURkLGTOPwm5JmozASMmb2NAGFkRDy/2wj/YZQGAkZlDCuBed/B+cyUhgJeQA+W553FJxLKIyEDD5r/NiTCR4B/AmOSVIYCXkgXgD8gd+/i95f/W1LM4WF30oTkh97kzkSZoyE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";