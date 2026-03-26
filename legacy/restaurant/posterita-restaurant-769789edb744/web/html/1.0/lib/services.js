angular.module('app').service('CustomerService', function( ShoppingCartService ){
	
	var service = this;
	
	service.default_customer = null;	
	service.current_customer = null;
	
	service.reset = function(){
		this.current_customer = this.default_customer;
	};
	
	service.getDefaultCustomer = function(){		
		return this.default_customer;		
	};
	
	service.setDefaultCustomer = function(customer){		
		this.default_customer = customer;
		this.current_customer = customer;
		return;
	};
		
	service.getCustomer = function(){
		
		/* return this.current_customer || this.default_customer; */
		return this.current_customer;
		
	};
	
	service.setCustomer = function(customer){
		
		/*console.log("Customer updated " + JSON.stringify(customer));*/
		
		var cart = ShoppingCartService.shoppingCart;
		
		var bp = null;
		
		if( typeof customer == "object" ){
			bp = customer;
		}
		
		this.current_customer = bp;			
		
		if(cart != null && bp != null){
			
			cart.setBp( bp );
			
		}		
		
	};
	
	service.saveCustomer = function(json){
		
		this.current_customer = json;
		
	};
	
	service.searchCustomer = function(searchTerm){
		
		var query = [
				     {"name":{likenocase:searchTerm}},
				     {"phone":{leftnocase:searchTerm}},
				     {"phone2":{leftnocase:searchTerm}},
				     {"identifier":{leftnocase:searchTerm}},
				     {"c_bpartner_id":{'==':searchTerm}}				     
				];				
		
		var results = APP.BP.cache({"iscustomer":"Y"},query).limit(5).get();
		
		return results;
		
	};
	
});

angular.module('app').service('ShoppingCartService', function(){
	
	var service = this;
	
	service.carts = new HashMap();
	
	service.getShoppingCart = function( orderType ){
		
		var cart = this.carts.get( orderType );
		
		if( cart == null){
			
			cart = new ShoppingCart( orderType );
			
			this.carts.put( orderType, cart );
			
		}
		
		this.shoppingCart = cart;
		
		return cart;
		
	}
	
	service.setShoppingCart = function( cart ){
		
		this.shoppingCart = cart;
		
	};
	
	service.reset = function(userTriggered){
		
		if(this.shoppingCart != null){
			this.shoppingCart.clearCart(userTriggered);
		}		
		
	};
	
});

angular.module('app').service('ClockInOutService', function(){
	
	var service = this;
	
	service.clockedInUsers = [];
	
	service.setClockedInUsers = function( users ){
		this.clockedInUsers = users;
	};
	
	service.isUserClockedIn = function(user_id){
		
		var user;
		
		for(var i=0; i<this.clockedInUsers.length; i++){
			
			user = this.clockedInUsers[i];
			
			if( user['user_id'] == user_id ){
				return true;
			}
		}
		
		return false;
		
	};
	
});

angular.module('app').service('ProductService', function(){
	
	var service = this;
	
	service.searchBarcode = function( searchTerm, limit){
		
		var query = {"upc":searchTerm};
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.search(searchTerm, limit);
			results = JSON.parse(results);
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
				
		return results;
	};
	
	service.search = function( searchTerm, limit){
		
		var query = [
				     {"upc":searchTerm},
				     {"sku":searchTerm},
				     {"name":{leftnocase:searchTerm}},
				     {"primarygroup":{leftnocase:searchTerm}},
				     {"product_category":{leftnocase:searchTerm}},
				     {"description":{likenocase:searchTerm}} 
				     
				];
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.search(searchTerm, "and ismodifier='N' and m_product_parent_id = 0", limit);
			results = JSON.parse(results);
			
			if(results.length == 0){
				
				results = window.PRODUCT_DB.search(searchTerm, "and ismodifier='N' and m_product_parent_id > 0", limit);
				results = JSON.parse(results);
				
			}
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
				
		return results;
	};
	
	service.distinct = function(query, column){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			var filter = "";
			
			var keys = Object.keys(query);
			var key = null;
			var value = null;
			
			for(var i=0; i< keys.length; i++){
				
				key = keys[i];
				value = query[key];
				/* escape single quote */
				key = key.replace("'", "''");
				value = value.replace("'", "''");
				
				filter += " and " + key + "='" + value  + "'";
			}
			
			results = window.PRODUCT_DB.distinct(column, filter);
			results = JSON.parse(results);
		}
		else
		{
			results = APP.PRODUCT.cache(query).distinct(column);
		}
		
		return results;
	};
	
	service.filter = function(query, limit){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			var filter = "";
			
			var keys = Object.keys(query);
			var key = null;
			var value = null;
			
			for(var i=0; i< keys.length; i++){
				
				key = keys[i];
				value = query[key];
				/* escape single quote */
				key = key.replace("'", "''");
				value = value.replace("'", "''");
				
				filter += " and " + key + "='" + value  + "'";
			}
			
			results = window.PRODUCT_DB.filter(filter + " and ismodifier='N' and m_product_parent_id = 0", limit);
			results = JSON.parse(results);
			
			if(results.length == 0){
				
				results = window.PRODUCT_DB.filter(filter + " and ismodifier='N' and m_product_parent_id > 0", limit);
				results = JSON.parse(results);
				
			}
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
		
		return results;
		
	};
	
	service.variants = function( m_product_parent_id ){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.filter("and m_product_parent_id = " + m_product_parent_id, 1000);
			results = JSON.parse(results);
		}
		else
		{
			results = APP.PRODUCT.cache({"m_product_parent_id" : {"==":m_product_parent_id}}).get();			
		}
		
		return results;
		
	};
	
});

angular.module('app').service('CommissionService', function(){
	
	var service = this;	
		
	service.commissions = new HashMap();
	
	service.active_user_id = null;
	service.amount = 0;
	
		
	service.updateUsers = function( json ){
		
		this.commissions.clear();
		
		for(var i=0; i<json.length; i++ ){
			
			user = json[i];
			
			commission = {
					
					amount : 0,
					user_id : user['user_id'],
					username : user['name'],
					active: false					
			};
			
			this.commissions.put( user['user_id'], commission );			
		}
		
		if(! this.commissions.hasItem( this.active_user_id ) ){
			
			var ids = this.commissions.keys();
			
			this.active_user_id = ids[0];
		}
		
		
		this.reset();	
	}
	
	service.setActive = function( id ){	
		
		console.log("Commission.setActive -> " + id);
		
		this.active_user_id = id;
		
		this.reset();	
		
	}
	
	service.setAmount = function(amount){
		
		if(amount < 0){
			
			amount = 0;			
		}
		
		this.amount = amount;
		
		this.reset();		
	}
	
	service.reset = function(){
		
		this.commissions.each(function(user_id, commission){
			
			commission.amount = 0;
			commission.active = false;
			
		});	
		
		var commission = this.commissions.get(this.active_user_id);
		
		if( commission != null ){
			
			commission.amount = this.amount;
			commission.active = true;
		}
		
	}
	
	service.getCommissions = function(){
		return this.commissions.toArray();
	}
	
	service.setCommissions = function( commissions ){
		
		this.commissions = new HashMap();
		
		var i, commission;
		
		for( i=0; i<commissions.length; i++ ){
			
			commission = commissions[i];
			
			this.commissions.put( commission['user_id'], commission );
			
		}		
		
	}
	
	service.getSplits = function(){
		
		var splits = [];
		
		this.commissions.each(function(user_id, commission){
			
			if( commission.amount > 0 ){
				
				splits.push( commission );				
			}			
		});
		
		if( splits.length == 0){
			
			var commission = this.commissions.get(this.active_user_id);
			splits.push( commission );	
		}
		
		return splits;
	}
	
	service.setCommission = function( user_id, amount ){
		
		var commission = this.commissions.get(user_id);
		commission.amount = amount;
		
	};
	
});

angular.module('app').service('OrderScreenService', function(){
	
	var screen = this;
	
	screen.bp = null;
	screen.sales_rep = null;
	screen.commissions = [];
	screen.comments = null;
	
});

angular.module('app').service('LoginService', function(){
	
	var service = this;
	
	service.login = function( username, password ){
		//todo		
	};
	
	service.logout = function(){
		//todo		
	};
	
});

angular.module('app').service('OrderService', function($http){
	
	var service = this;
	
	service.current_order = null;
	service.backdate = null;
	
	service.reset = function(){		
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
				
				"deliveryRule": "R",
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
			line.discountAmt = cartLine.discountAmt.toFixed(CURRENCY_PRECISION);
			line.discountMessage = cartLine.discountMessage;
			
			/* discount code */
			line.u_pos_discountcode_id = cartLine.u_pos_discountcode_id;			
			
			/* compute discount given */
			totalDiscountGiven = totalDiscountGiven.plus(cartLine.discountAmt);
			
			/* salesrep id */
			line.salesrep_id = cartLine.salesrep_id;
			line.timestamp = cartLine.timestamp;
			
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


angular.module('app').service('PurchaseService', function(){
	
	var service = this;
	
	service.document = null;
	
	service.setDocument = function( doc ){
		this.document = doc;
	};
	
	service.getDocument = function(){
		return this.document;
	};
	
});

angular.module('app').service('TableService', function($http, LoginService){
	
	var service = this;
	
	service.tables = [];	
	service.tableMap = {};
	service.activeTable = null;
	
	service.getActiveTable = function(){
		
		return this.activeTable;
	};
	
	service.setActiveTable = function( table ){
		
		this.activeTable = table;
	};
	
	service.getTable = function(table_id){
		
		var post = {};
		post['action'] = 'get-table';
		post['table_id'] = table_id;
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.getTables = function(){
		
		var post = {};
		post['action'] = 'get-tables';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.getAvailableTables = function(){
		
		var post = {};
		post['action'] = 'available-tables';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};
	
	service.switchTable = function(from_id, to_id){
		
		var post = {};
		post['action'] = 'switch-table';
		post['table_id'] = from_id;
		post['to_table_id'] = to_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
	
	service.reserveTable = function( table_id ){
		
		var post = {};
		post['action'] = 'reserve-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.cancelReservation = function( table_id ){
		
		var post = {};
		post['action'] = 'cancel-reservation';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.assignOrder = function( table_id, order_id ){
		
		var post = {};
		post['action'] = 'assign-order';
		post['table_id'] = table_id;
		post['order_id'] = order_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.clearTable = function( table_id ){
		
		var post = {};
		post['action'] = 'clear-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.updateTableStatus = function( table_id, status ){
		
		var post = {};
		post['action'] = 'update-table-status';
		post['table_id'] = table_id;
		post['status'] = status;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.mergeTables = function( table_id, child_table_ids ){
		
		var post = {};
		post['action'] = 'merge-tables';
		post['table_id'] = table_id;
		post['child_table_ids'] = child_table_ids;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};
	
	service.getTakeAwayNo = function(){
		
		var post = {};
		post['action'] = 'get-take-away-no';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
	
	service.getDineInNo = function(){
		
		var post = {};
		post['action'] = 'get-dine-in-no';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
		
	service.sendToKitchen = function( table_id ){
		
		var post = {};
		post['action'] = 'send-to-kitchen';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.checkoutTable = function( table_id ){
		
		var post = {};
		post['action'] = 'checkout-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.voidOrder = function( order_id, table_id ){
		
		var post = {};
		post['action'] = 'void-order';
		post['order_id'] = order_id;
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.lockTable = function( table_id ){
		
		var post = {};
		post['action'] = 'lock-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.unlockTable = function( table_id ){
		
		var post = {};
		post['action'] = 'unlock-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
		
});

angular.module('app').service('ViewOrderService', function(OrderService){
	
	var service = this;
	
	service.order = null;
	
	service.setOrder= function( order ){
		this.order = order;
	};
	
	service.getOrder = function(){
		return this.order;
	};	
	
	service.reset = function(){
		this.order = null;
	};
	
	service.getOpenAmt = function(){
		return OrderService.getOpenAmt( this.order );
	};
	
});
	
	
	