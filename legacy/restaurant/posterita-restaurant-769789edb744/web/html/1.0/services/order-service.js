angular.module('app').service('OrderService', function($http){
	
	var service = this;
	
	service.current_order = null;
	service.backdate = null;
	
	service.reset = function(){
		
		this.refOrder = null;	
		this.backdate = null;
	};
	
	service.getOrder = function(){
		
		return this.current_order;
	};
	
	service.getOrderById = function(uuid){
		return $http.get('/json/orders/' + uuid);
	};
	
	service.setOrder = function( order ){
		
		this.current_order = order;
		//this.normalizeOrder();
	};
	
	service.normalizeOrder = function(){
		
		if( !this.current_order.version ){
			
		}
		
	};
	
	service.getOpenAmt = function(order){
		
		//var order = this.current_order;

		//compute open amount
		var openAmt = order.grandTotal;

		for (var i = 0; i < order.payments.length; i++) {

			var payment = order.payments[i];

			openAmt = openAmt - payment['payAmt'];

		}

		return openAmt;
		
	};
	
	service.addPayment = function( payment ){
		
		this.current_order.payments.push(payment);
		
		return APP.ORDER.saveOrder( this.current_order );
		
	};
	
	service.saveOrder = function( order ){
		
		return APP.ORDER.saveOrder( order );
	};
	
	service.checkout = function( store, terminal, salesRep, customer, commissions, comments, shoppingCart, payments, refOrder ){
				
		var CURRENCY_PRECISION = 2;		
		
		var ORDER = {
				
				"version" : "2.0",
				
				"orderType": "POS Order",
				"orderId": "0",
				"uuid": "",
				
				
				"documentNo": "",
				"offlineDocumentNo": "",
				"dateOrdered": "",									
				
				"id": "1e9acab8-0db4-4837-8899-75eeb54b2a97",
				
				"offlineOrderId": "",
				"status": "",
				
				"clientId": 0,
				"orgId": 0,
				"terminalId": 0,
				"priceListId": 0,
				"warehouseId": 0,
				
				"salesRep": "Admin",
				"salesRepId": 0,				
				"paymentTermId": 0,
				
				"bpName": "Walk-in Customer",
				"bpartnerId": 0,
				"loyaltyPointsEarned": 0,
				
				"deliveryRule": "O",
				"scheduledDeliveryDate" : "",
				//"prepareOrder": "",
						
				
				"comments": [],
				"referenceNo": "",					
				
				"movementDate": "",			
				
				"docAction": "CO",
				"docStatusName": "Completed",			
				
				//"comment": "",				
				
				"signature": "",
				
				"tenderType": "Cash",
				
				/*
				//cash payment
				"cashAmt": 0,
				"amountRefunded": 0,
				"amountTendered": 0,
				
				//card payment
				"cardAmt": 0,
				"isPaymentOnline": "true",
				"cardTrackData": "",
				"cardTrackDataEncrypted": "",
				"cardNo": "",
				"cardholderName": "",
				"cardZipCode": "",
				"otk": "",
				"cardCVV": "",
				"cardStreetAddress": "",
				"paymentProcessor": "",
				"cardType": "",
				"cardExpDate": "",
				
				//external
				"externalCardAmt": 0,
				
				//check
				"chequeAmt": 0,
				"chequeNo": "",
				
				//voucher
				"voucherAmt": 0,
				"voucherNo": "",
				
				//loyalty
				"loyaltyAmt": 0,
				
				//gift
				"giftCardAmt": 0,
				"giftCardNo": "",
				"giftCardCVV": "",
				"giftCardTrackData": "",
				
				//other
				"zapperAmt": 0,
				"skwalletAmt": 0,
				*/
				
				
				"qtyTotal": 0,
				"taxTotal": 0.00,				
				"subTotal": 0.00,
				"grandTotal": 0.00,
				"tipAmt": 0.00,
				"discountAmt": 0.00,	
				
				
				"payments": [],			
				
				
				"splitSalesReps": [],				
				
				//"taxes": [],
				
				"orderTaxes": [],
				
				"lines": []
			};
		
		var totalDiscountGiven = new BigNumber(0);
		var computeLoyaltyPoints = true; /* promotions may toggle the flag */
		
		var lines = [];
		shoppingCart.lines.each(function(id, cartLine) {
			
			var UOM_PRECISION = 0;
			
			if( cartLine.product.stdprecision ) {
				UOM_PRECISION = cartLine.product.stdprecision;
			}			
			
			var line = {};
			
			line.shoppingCartLineId = cartLine.lineId;
			line.shoppingCartLineId = cartLine.lineId;			
			line.id = cartLine.product.m_product_id;
			line.c_uom_id = cartLine.product.c_uom_id;
			line.qtyEntered = cartLine.qty.toFixed(UOM_PRECISION);				
			line.productName = cartLine.product.name;
			line.description = cartLine.description;
			line.upc = cartLine.product.upc;
			line.priceEntered = cartLine.priceEntered.toFixed(CURRENCY_PRECISION);
			
			line.priceList = cartLine.product.pricelist.toFixed(CURRENCY_PRECISION);
			line.priceLimit = cartLine.product.pricelimit.toFixed(CURRENCY_PRECISION);
			line.priceStd = cartLine.product.pricestd.toFixed(CURRENCY_PRECISION);
			
			line.taxId = cartLine.tax.taxId;
			line.taxAmt = cartLine.taxAmt.toFixed(CURRENCY_PRECISION);
			line.discountAmt = cartLine.discountAmt.toFixed(CURRENCY_PRECISION);
			line.discountMessage = cartLine.discountMessage;
			
			/* discount code */
			line.u_pos_discountcode_id = cartLine.u_pos_discountcode_id;			
			
			/* compute discount given */
			totalDiscountGiven = totalDiscountGiven.plus(cartLine.discountAmt);
			
			/* restaurant customisation */
			line.editable = cartLine.editable;	
			/* assign salesrep to orderline */
			line.salesrep_id = cartLine.salesrep_id;
			line.timestamp = cartLine.timestamp;
			/* restaurant customisation */
			
			if(shoppingCart.priceListIncludeTax){
				line.lineNetAmt = cartLine.lineNetAmt.toFixed(CURRENCY_PRECISION);
			}else{
				line.lineNetAmt = cartLine.lineAmt.toFixed(CURRENCY_PRECISION);
			}
			
			if(cartLine.ref_orderline_id){
				line.ref_orderline_id = cartLine.ref_orderline_id;
			}
			
			if(cartLine.u_promotion_id){
				line.u_promotion_id = cartLine.u_promotion_id;
				
				if(cartLine.earnloyaltypoints === false){
					computeLoyaltyPoints = false;
				}
			}
			
			line.producttype = cartLine.product.producttype;
			
			/* set boms */
			line.boms = [];
			
			/* lots */
			if(cartLine.m_attributesetinstance_id){
				line.m_attributesetinstance_id = cartLine.m_attributesetinstance_id;
			}
			
			var boms = cartLine.boms;
			
			for(var i=0; i<boms.length; i++){					
				var bomLine = {};
				var bom = boms[i];
				
				if( bom.product.stdprecision ) {
					UOM_PRECISION = bom.product.stdprecision;
				}
				
				bomLine.id = bom.product.m_product_id;
				bomLine.c_uom_id = bom.product.c_uom_id;
				bomLine.qtyEntered = bom.qty.toFixed(UOM_PRECISION);				
				bomLine.productName = bom.product.name;
				bomLine.description = bom.description;
				
				bomLine.priceEntered = bom.priceEntered.toFixed(CURRENCY_PRECISION);					
				bomLine.priceList = bom.product.pricelist.toFixed(CURRENCY_PRECISION);
				bomLine.priceLimit = bom.product.pricelimit.toFixed(CURRENCY_PRECISION);
				bomLine.priceStd = bom.product.pricestd.toFixed(CURRENCY_PRECISION);
				
				bomLine.taxId = bom.tax.taxId;
				
				if(shoppingCart.priceListIncludeTax){
					bomLine.lineNetAmt = bom.lineNetAmt.toFixed(CURRENCY_PRECISION);
				}else{
					bomLine.lineNetAmt = bom.lineAmt.toFixed(CURRENCY_PRECISION);
				}					
				
				line.boms.push(bomLine);
			}/*for*/
			
			/* set modifiers */
			line.modifiers = [];
			
			var modifiers = cartLine.modifiers;
			
			for(var i=0; i<modifiers.length; i++){					
				var modifierLine = {};
				var modifier = modifiers[i];
				
				if( modifier.product.stdprecision ) {
					UOM_PRECISION = modifier.product.stdprecision;
				}
				
				modifierLine.id = modifier.product.m_product_id;
				modifierLine.c_uom_id = modifier.product.c_uom_id;
				modifierLine.qtyEntered = modifier.qty.toFixed(UOM_PRECISION);				
				modifierLine.productName = modifier.product.name;
				modifierLine.description = modifier.description;
				modifierLine.priceEntered = modifier.priceEntered.toFixed(CURRENCY_PRECISION);
				
				modifierLine.priceList = modifier.product.pricelist.toFixed(CURRENCY_PRECISION);
				modifierLine.priceLimit = modifier.product.pricelimit.toFixed(CURRENCY_PRECISION);
				modifierLine.priceStd = modifier.product.pricestd.toFixed(CURRENCY_PRECISION);
				
				modifierLine.taxId = modifier.tax.taxId;
				
				if(shoppingCart.priceListIncludeTax){
					modifierLine.lineNetAmt = modifier.lineNetAmt.toFixed(CURRENCY_PRECISION);
				}else{
					modifierLine.lineNetAmt = modifier.lineAmt.toFixed(CURRENCY_PRECISION);
				}	
				
				/* add modifier id */
				modifierLine.modifierId = 0;
				if(modifier.modifier){
					modifierLine.modifierId = modifier.modifier.modifierId;
				}
				
				
				line.modifiers.push(modifierLine);
			}/*for*/
			
			lines.push(line);
		});
		
		ORDER.lines = lines;
							
				
		if(refOrder == null || refOrder['uuid'] == ''){
			ORDER.uuid = APP.UTILS.UUID.getUUID();
			ORDER.id = ORDER.uuid;
		}
		else
		{
			ORDER.uuid = refOrder['uuid'];
			ORDER.id = ORDER.uuid;
		}
		
		/*order type*/
		ORDER.orderType = shoppingCart.orderType;
		
		/*order taxes*/
		ORDER.orderTaxes = shoppingCart.orderTaxes;			
		
		ORDER.clientId = terminal.ad_client_id;
		ORDER.orgId = terminal.ad_org_id;
		ORDER.terminalId = terminal.u_posterminal_id;
		ORDER.taxId = terminal.c_tax_id;
		ORDER.priceListId = terminal.m_pricelist_id;
		ORDER.warehouseId = terminal.m_warehouse_id;
		ORDER.currencyId = terminal.c_currency_id;		
		
		/* see offline/orderScreen.jsp line 231 */
		ORDER.salesRepId = salesRep.ad_user_id;
		ORDER.salesRep = salesRep.name;
						
		ORDER.bpName = customer.name;
		ORDER.bpartnerId = customer.id;
		ORDER.c_location_id = customer.c_location_id;
		ORDER.c_bpartner_location_id = customer.c_bpartner_location_id;
		ORDER.ad_user_id = customer.ad_user_id;
		
		
		ORDER.qtyTotal = shoppingCart.qtyTotal.toString();
		
		ORDER.grandTotal = shoppingCart.grandTotal.toFixed(CURRENCY_PRECISION);		
		ORDER.taxTotal = shoppingCart.taxTotal.toFixed(CURRENCY_PRECISION);
		ORDER.subTotal = shoppingCart.subTotal.toFixed(CURRENCY_PRECISION);
		//ORDER.discountAmt = shoppingCart.discountOnTotal.toFixed(CURRENCY_PRECISION);
		ORDER.discountAmt = totalDiscountGiven.toFixed(CURRENCY_PRECISION);
		
		
		ORDER.loyaltyPointsEarned = 0;
		
		//add promotion validation
		//some promotions may not give loyalty points
		
		if( ORDER.orderType == 'POS Order' && ORDER.docAction == 'CO' && ORDER.grandTotal > 0  && computeLoyaltyPoints === true){
			
			//var bp = shoppingCart.bp;
			
			if( customer.enableloyalty == 'Y'){
				
				var points = 0;	
				
				if( store.loyaltyrule && store.loyaltyrule != null ){
					
					var rules = store.loyaltyrule;
					
					var bubble = function(arr) {
				      var len = arr.length;
				    
				      for (var i = 0; i < len ; i++) {
				        for(var j = 0 ; j < len - i - 1; j++){ // this was missing
				        if (arr[j].value < arr[j + 1].value) {
				          // swap
				          var temp = arr[j];
				          arr[j] = arr[j+1];
				          arr[j + 1] = temp;
				        }
				       }
				      }
				      return arr;
				    };
					
					// sort desending
					rules = bubble(rules);
					
					var factor, diff, rule;
					
					diff = ORDER.grandTotal;
					
					for(var i=0; i<rules.length; i++){
						
						rule = rules[i];
						
						if( rule.value == 0 ) continue;
						
						factor = Math.floor( diff / rule.value );
						
						points += factor * rule.points;
						
						diff = diff - ( factor * rule.value );
						
						//console.log( diff + ": " + rule.value + " * " +  factor + " ==> " + points);
					}
					
				}			
				else if( store.loyaltyrate && store.loyaltyrate != null ){
					
					// order level
					if( store.loyaltyrate > 0 ){
						
						var p = ORDER.grandTotal / store.loyaltyrate;
						
						points = Math.floor( p );
					}					
					
				}
				
				// orderline level
				points = points + parseInt(shoppingCart.loyaltyPoints.toFixed(CURRENCY_PRECISION));
				
				ORDER.loyaltyPointsEarned = points;
				
			}
		}
		
		
		ORDER.status = '';
		
		//order.comments = comments;
		
		//set payments
		ORDER.payments = payments;
		
		if(ORDER.docAction == 'CO') 
		{
			if( payments.length == 1 ){
				
				var payment = payments[0];
				
				ORDER.tenderType = payment.tenderType;	
				
				if(ORDER.tenderType == APP.TENDER_TYPE.MIXED || ORDER.tenderType == APP.TENDER_TYPE.CREDIT)
				{
					ORDER.deliveryRule = payment.deliveryRule;
					ORDER.scheduledDeliveryDate = payment.scheduleDate;
					
					if(ORDER.tenderType == APP.TENDER_TYPE.CREDIT){
						ORDER.paymentTermId = payment.paymentTermId;
					}
					
					ORDER.payments = [];
				}
			}
			else
			{
				ORDER.tenderType = APP.TENDER_TYPE.MIXED;
			}
			
		}
		
					
		/* build split sales rep list */
		var splitSalesReps = [];
		var commission = null;
		
		for( var i=0; i< commissions.length; i++ ){
			
			commission = commissions[i];
			
			splitSalesReps.push({
				
				"id" : commission.user_id,
            	"name" : commission.username,
            	"amount" : commission.amount
				
			});
			
		}
		
		ORDER.splitSalesReps = splitSalesReps;			
		
		if(shoppingCart.priceListIncludeTax){
			ORDER.subTotal = ORDER.grandTotal;
		}
					
		/*offline/order.js*/
		//return APP.ORDER.saveOrder(order);
		
		var d = new Date();
		ORDER.timestamp = d.getTime();
		
		if(this.backdate == null){			
			
			//ORDER.dateOrdered = moment(d).format("YYYY-MM-DD HH:mm:ss");
			ORDER.dateOrdered = DateUtils.getCurrentDate( d );
			
		}
		else
		{
			ORDER.backdate = true;
			ORDER.dateOrdered = this.backdate;
		}
		
		if(ORDER.scheduledDeliveryDate == null){
			ORDER.scheduledDeliveryDate = ORDER.dateOrdered;
		}
		
		ORDER.comments = [];
		
		if( refOrder ){
			
			ORDER.comments = refOrder.comments;
			
		}		
		
		//set comment		
		if(comments != null && comments.length > 0){
			var comment = {
				"date": ORDER.dateOrdered ,
				"message" : comments,
				"user" : ORDER.salesRep,
				"userId" : ORDER.salesRepId
			};
			
			ORDER.comments.push(comment);
		}
		
		//reset reference order
		this.refOrder = null;
		this.backdate = null;
		
		
		//more details
		ORDER.c_currency_name = terminal['c_currency_name'];
		ORDER.ad_org_name = terminal['ad_org_name'];
		
		return ORDER;
	};
	
});