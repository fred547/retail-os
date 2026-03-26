angular.module('app').controller('OrderScreenController', function($scope, $modal, $state, $stateParams, $timeout, $window, LoginService, ProductService, ShoppingCartService, CommissionService, 
		OrderService, CustomerService, OrderScreenService, $http, TableService)
{	
	$window.alert = $scope.alert;
	
	$timeout(function(){
		$(".product-search-result").mCustomScrollbar({theme:"dark", scrollInertia:0, scrollButtons:{ enable:true }});
	});
	
	$scope.role = LoginService.role;
	
	//set customer
	var terminal = LoginService.terminal;
	var c_bpartner_id = terminal.c_bpartner_id | 0;
	
	if(c_bpartner_id > 0){
		var bp = APP.BP.getBPartnerById( c_bpartner_id );
		CustomerService.setCustomer(bp);
	}
	
	var preference = LoginService.terminal.preference;
	$scope.searchByBarcodeOnly = preference.searchByBarcodeOnly || false;
	$scope.trackManualProductEntry = preference.trackManualProductEntry || false;
	
	$scope.orderType = 'POS Order';
	
	$scope.showGrid = ( localStorage.showGrid && localStorage.showGrid == "true" );
	
	$scope.toggleGrid = function(){
		$scope.showGrid = !$scope.showGrid;
		localStorage.showGrid = $scope.showGrid;
	};
		
	jQuery("#search-product-textfield").focus();
	
	//deduce orderType from $stateParams
	if( $stateParams.action && $stateParams.action == 'refundOrder' ){
		console.log($stateParams.action);
		$scope.orderType = 'Customer Returned Order';
	}
	
	var cart = ShoppingCartService.getShoppingCart( $scope.orderType );	
	$scope.shoppingCart = cart;
	
	$scope.$on('sales-rep-change', function(event, data)
	{
		cart.setSalesRep(data);
	});
	
	if( WATCH_CART_FLAG == false ){
		
		jQuery(cart).on("cart.addToCart", function(e, line){
			
			/* track Manual Product Entry */
			if( $scope.trackManualProductEntry === true && $scope.searchByBarcodeOnly === true && $scope.barcodeEntry === false )
			{
				// cartlog -> manual entry
				var qty  = line.qty;
				var amount = line.lineNetAmt;
				var description = line.getLineInfo();
				
				jQuery(cart).trigger('cart.log', { "action" : "Manual Entry", "qty" : qty, "amount" : amount, "description" : description });
			}
			
			//console.log("cart.addToCart - Product: " + line.description);
			POLE_DISPLAY.display(line.qty + "x " + line.description, formatPoleDisplayLine("Total",cart.grandTotal.toString()),	"cart.addToCart", cart);
		});
		
		jQuery(cart).on("cart.removeFromCart", function(e, line){
			//console.log("cart.removeFromCart - Product: " + line.description);
			POLE_DISPLAY.display("-" + line.qty + "x " + line.description , formatPoleDisplayLine("Total",cart.grandTotal.toString()), "cart.removeFromCart", cart);
		});
			
		jQuery(cart).on("cart.updateQty", function(e, line){
			//console.log("cart.updateQty - Product: " + line.description);
			POLE_DISPLAY.display(line.qty + "x " + line.description , formatPoleDisplayLine("Total",line.shoppingCart.grandTotal.toString()), "cart.updateQty", cart);
		});
		
		jQuery(cart).on("cart.update", function(e, cart){
			//console.log("cart.update - Total: " + cart.grandTotal.toString());
			
			POLE_DISPLAY.display(formatPoleDisplayLine("Total",cart.grandTotal.toString()), "", "cart.update", cart);
		});
		
		jQuery(cart).on("cart.updateTotal", function(e, cart){
			//set focus on search product
			jQuery("#search-product-textfield").focus();
		});
		
		
		jQuery(cart).on("cart.clear", function(e, cart){
			//console.log("cart.clear - Total: " + cart.grandTotal.toString());
			
			if(CAN_CLEAR_TOTAL){
				POLE_DISPLAY.display(formatPoleDisplayLine("Total","0.00"), "", "cart.clear", cart);
			}
			
		});
		
		jQuery(cart).on("cart.clearDiscountOnTotal", function(e, line){
			
			$scope.info("Discount on total was cleared.");
			
		});
		
		jQuery(cart).on("cart.log", function(e, log){
			
			var event = log.action;
			var qty = new BigNumber(log.qty);
			var amount = new BigNumber(log.amount);
			var description = log.description;
			
			var terminal = LoginService.terminal;
			var user = LoginService.user;
			var time = DateUtils.getCurrentDate(); 
			
			var post = {};
			post['action'] = "cartLog";
			post['user_id'] = user.id;
			post['terminal_id'] = terminal.id;
			post['event'] = event;
			post['date_logged'] = time;
			post['qty'] = qty.float();
			post['amount'] = amount.float();
			post['description'] = description;
			
			post = JSON.stringify(post);
			jQuery.get("/system?json=" + post,
			{}, function(json, textStatus, jqXHR)
			{
				if (json == null || jqXHR.status != 200)
				{
					console.error("Failed to log cart operation!");
					return;
				}
				if (json.error)
				{
					console.error("Failed to log cart operation! " + json.error);
					return;
				}
			});
			
		});
		
		WATCH_CART_FLAG = true;
	}
	
	
	
	
	
	//set tax
	var terminal = LoginService.terminal;
	var c_tax_id = terminal['c_tax_id'];
	var tax = APP.TAX.getTaxById(c_tax_id);
	
	$scope.shoppingCart.tax = tax;
	$scope.shoppingCart.priceListIncludeTax = (terminal['istaxincluded'] == 'Y');
	
	$scope.currencySymbol = terminal['c_currency_name'];
	
	// watch shopping cart changes
	$scope.$watch(function(scope)
	{
		return scope.shoppingCart.subTotal;
	}, function(newValue, oldValue)
	{
		CommissionService.setAmount(newValue + '');
	});
	
	$scope.productSearchTerm = "";
	$scope.productSearchSelectedId = -1; /*cue for active product clicked by user*/
	$scope.barcodeEntry = false;
	
	$scope.filterProduct = function(query)
	{
		var results = ProductService.filter(query, 20);
		// no match
		if (results.length == 0)
		{
			$scope.alert(I18n.t("no.product.found"), function(){
				jQuery("#search-product-textfield").select();
			});
			return;
		}
		$scope.productSearchList = results;
		$scope.productSearchTerm = "";
		$scope.productSearchSelectedId = -1;
		$scope.barcodeEntry = false;
		
	};
	
	$scope.searchBarcode = function(searchTerm){
		
		if(searchTerm.length == 0)
		{
			$scope.alert("Barcode is required!", function(){
				jQuery("#search-product-textfield").select();
			});
			return;
		}
		
		if( $scope.searchWeightBarcode(searchTerm) )
		{
			return;
		}
		
		var results = ProductService.searchBarcode(searchTerm, 20);
		// no match
		if (results.length == 0)
		{
			$scope.alert(I18n.t("no.product.found"), function(){
				jQuery("#search-product-textfield").select();
			});
			return;
		}
		if (results.length == 1)
		{
			// check barcode
			if (results[0].upc == searchTerm)
			{
				$scope.barcodeEntry = true;
				
				this.addToCart(results[0]);
			}
		}
		$scope.productSearchList = results;
		$scope.productSearchTerm = "";		
		
		//console.log("Found " + results.length);
	};
	
	$scope.searchProduct = function(searchTerm)
	{	
		if( $scope.searchWeightBarcode(searchTerm) )
		{
			return;
		}
		
		var results = ProductService.search(searchTerm, 20);
		// no match
		if (results.length == 0)
		{
			$scope.alert(I18n.t("no.product.found"), function(){
				jQuery("#search-product-textfield").select();
			});
			return;
		}
		
		$scope.barcodeEntry = false;
		
		if (results.length == 1)
		{
			// check barcode
			if (results[0].upc == searchTerm)
			{
				$scope.barcodeEntry = true;
				this.addToCart(results[0]);
			}
		}
		$scope.productSearchList = results;
		$scope.productSearchTerm = "";
		
		//console.log("Found " + results.length);
	};
	
	// weight barcode feature
	$scope.searchWeightBarcode = function( searchTerm ){
				
		if(/22[0-9]{11}/.test(searchTerm))
		{
			var barcode = searchTerm.substr(2,5);
			var qty = searchTerm.substr(7,5);
			
			qty = new BigNumber(qty).dividedBy(1000);
			
			var results = ProductService.searchBarcode(barcode, 20);
			
			if(results.length == 0) return false;
			
			if (results.length == 1)
			{
				var product = results[0];
				
				//validate unit of measure
				var scale = product.stdprecision;
				
				var qtyAsStr = "" + qty;
				
				//set scale based on uom
				if( scale == 0 )
				{						
					if(qtyAsStr.match(/\d*\.\d+/g)){
						$scope.alert("Product cannot be sold in fractions! Check product's 'Unit of Measure'", function(){
						});
						return true;
					}
					
				}
				
				$scope.barcodeEntry = true;
				this.addToCart(product, qty);
				
				$scope.productSearchList = results;
				$scope.productSearchTerm = "";
			}
			
			return true;
		}
		
		return false;		
		
	};
	
		
	$scope.productSearchList = [];
	$scope.addToCart = function(product, qtyEntered)
	{
		var qty = qtyEntered || 1;
		
		/* query product price */
		var price = APP.PRODUCT_PRICE.getProductPrice( product.id, $scope.shoppingCart.pricelistId, $scope.shoppingCart.default_pricelistId, 0 );
		
		if(price){
			product.pricestd = price.pricestd;
			product.pricelist = price.pricelist;
			product.pricelimit = price.pricelimit;
		}		
		
		$scope.productSearchSelectedId = product['m_product_id']; /* update cue */
		
		/* check for lot and expiry */
		if(product.isbatchandexpiry == 'Y'){
			
			$modal.open(
			{
				templateUrl: '/html/popups/order-screen/lot-and-expiry.html',
				// size: 'sm',
				// scope : $scope,
				controllerAs: '$ctrl',
				resolve:
				{
					product: function()
					{
						return angular.copy(product);
					},
					shoppingCart: function()
					{
						return $scope.shoppingCart;
					}
				},
				controller: function($scope, $modalInstance, LoginService, shoppingCart, product)
				{
					var product_id = product['m_product_id'];
					
					$scope.formatDate = function(date){
		        		 return moment(date, "YYYY-MM-DD").format("DD-MMM-YYYY");
		        	};
		        						
					var lots = APP.ATTRIBUTESET_INSTANCE.search({ 'm_product_id' : product_id });
					this.lots = [];
					
					var lot;
					for(var i=0; i<lots.length; i++){
						lot = lots[i];
						
						if(moment().isBefore(lot.expirydate) && lot.qty > 0){
							this.lots.push(lot);
						}
					}
					
					/*lots.filter(x => moment().isBefore(x.expirydate) && x.qty > 0);*/
										
					this.add = function(lot){						
						
						var price = APP.PRODUCT_PRICE.getProductPrice(product_id, shoppingCart.pricelistId, shoppingCart.default_pricelistId, lot.m_attributesetinstance_id);
						
						console.log("Lot: ", lot, "Price: ", price);						
						
						product.pricestd = price.pricestd;
						product.pricelist = price.pricelist;
						product.pricelimit = price.pricelimit;
						
						var line = new ShoppingCartLine(shoppingCart, product, 1);
						line.setLineId(shoppingCart.lineCount++);
						line.m_attributesetinstance_id = lot.m_attributesetinstance_id;
						shoppingCart.addLine( line );
						
						//shoppingCart.addToCart(productId, qty, description, price, modifiers, lot);						
						$modalInstance.close();
					}
				}
			});
			
			return;
		}
		
		if (product.editpriceonfly == 'Y' || product.editdesconfly == 'Y')
		{
			$modal.open(
			{
				templateUrl: '/html/popups/order-screen/edit-product-on-fly.html',
				// size: 'sm',
				// scope : $scope,
				controllerAs: '$ctrl',
				resolve:
				{
					product: function()
					{
						return product;
					},
					qty: function()
					{
						return qty;
					},
					shoppingCart: function()
					{
						return $scope.shoppingCart;
					}
				},
				controller: function($scope, $modalInstance, shoppingCart, product, qty)
				{
					this.qty = qty;
					this.product = product;
					this.price = product['pricestd'];
					this.description = product['description'];
					this.apply = function()
					{
						var product_id = product['m_product_id'];
						shoppingCart.addToCart(product_id, this.qty, this.description, this.price);
						$modalInstance.close();
					}
				}
			});
		}
		else if (product.ismodifiable == 'Y')
		{
			$modal.open(
			{
				templateUrl: '/html/popups/order-screen/select-modifiers.html',
				// size: 'sm',
				// scope : $scope,
				controllerAs: '$ctrl',
				resolve:
				{
					product: function()
					{
						return product;
					},
					qty: function()
					{
						return qty;
					},
					shoppingCart: function()
					{
						return $scope.shoppingCart;
					}
				},
				controller: function($scope, $modalInstance, shoppingCart, product, qty)
				{
					this.qty = qty;
					this.product = product;
					var product_id = product['m_product_id'];
					var mappings = APP.PRODUCT_MODIFIER_GROUP.search(
					{
						'product_id': product_id
					});
					var modifier_groups = [];
					var modifier_group, mapping, group_id;
					var i;
					for (i = 0; i < mappings.length; i++)
					{
						mapping = mappings[i];
						group_id = mapping['group_id'];
						modifier_group = APP.MODIFIER_GROUP.getModifierGroupById(group_id);
						
						if(modifier_group != null)
						{
							modifier_groups.push(modifier_group);
						}
						
					}
					this.modifier_groups = modifier_groups;
					this.setDefaults = function()
					{
						var i, j, modifier_group, modifier;
						// setting defaults
						for (i = 0; i < this.modifier_groups.length; i++)
						{
							modifier_group = this.modifier_groups[i];
							for (j = 0; j < modifier_group.lines.length; j++)
							{
								modifier = modifier_group.lines[j];
								modifier.active = false;
							}
							// check first child
							if (modifier_group.isExclusive == 'Y' || modifier_group.isMandatory == 'Y')
							{
								modifier_group.lines[0].active = true;
							}
						}
					};
					this.onSelect = function(modifier_group, selected_modifier)
					{
						var i, modifier;
						for (i = 0; i < modifier_group.lines.length; i++)
						{
							modifier = modifier_group.lines[i];
							if (modifier_group.isExclusive == 'Y')
							{
								modifier.active = false;
							}
							if (modifier.groupLineId == selected_modifier.groupLineId)
							{
								selected_modifier.active = !selected_modifier.active;
							}
						}
					};
					this.apply = function()
					{
						var modifiers = [];
						var i, j, modifier_group, modifier;
						for (i = 0; i < this.modifier_groups.length; i++)
						{
							modifier_group = this.modifier_groups[i];
							for (j = 0; j < modifier_group.lines.length; j++)
							{
								modifier = modifier_group.lines[j];
								if (modifier.active == true)
								{
									modifiers.push(modifier);
								}
							}
						}
						var product_id = product['m_product_id'];
						shoppingCart.addToCart(product_id, this.qty, null, null, modifiers);
						$modalInstance.close();
					};
					this.reset = function()
					{
						this.setDefaults();
					};
					this.reset(); // set defaults
				}
			});
		}
		else if(product.isparent == 'Y')
		{
			//display childs
			var results = ProductService.variants( product['m_product_id'] );
			
			$scope.productSearchList = results;
			$scope.productSearchTerm = "";
			$scope.productSearchSelectedId = -1;
		}
		else
		{
			var product_id = product['m_product_id'];
			$scope.shoppingCart.addToCart(product_id, qty);
		}
	};
	$scope.reset = function(userTriggered)
	{
		OrderScreenService.comments = null;
		ShoppingCartService.reset(userTriggered);
		CustomerService.reset();
		CommissionService.reset();
		OrderService.reset();
		
		$scope.$broadcast('new-customer-created', CustomerService.getCustomer());
	};
	$scope.saveOrder = function()
	{
		var store = LoginService.store;
		var terminal = LoginService.terminal;
		var customer = CustomerService.getCustomer();
		var commissions = CommissionService.getSplits();
		var comments = OrderScreenService.comments;
		var shoppingCart = ShoppingCartService.shoppingCart;
		var salesRepId = CommissionService.active_user_id;
		
		var salesRep = APP.USER.getUserById(salesRepId);
		
		var refOrder = OrderService.refOrder;
		
		/*check customer*/
		if( customer == null){
			
			$scope.alert(I18n.t("Customer is required!"), function(){
				jQuery("input.customer-search-textfield").focus();
			});
			
			return;
		}
		
		/* restaurant allow update from multiple terminals */
		/* validate order terminal */
		/*
		if( refOrder != null){
			
			var o = APP.ORDER.getOrderById(refOrder.uuid)
			
			if( terminal.u_posterminal_id != o.terminalId ){				
				
				var t = APP.TERMINAL.getTerminalById(o.terminalId);
				
				$scope.alert("Terminal mismatch! Order belongs to terminal - " + t.u_posterminal_name , function(){
				});
				
				return;
				
			}
		}
		*/
		
		var order = OrderService.checkout(store, terminal, salesRep, customer, commissions, comments, shoppingCart, [], refOrder );
		order["docAction"] = "DR";
		order["docStatusName"] = "Drafted",
		order["tenderType"] = "Cash";
		
		var commandInfo = $scope.commandInfo;
		
		if( commandInfo == null ){
			alert("commandInfo cannot be null!!!");
			return;
		}
		
		//save command info
		order["commandInfo"] = commandInfo;
		
		//save table info in reference
		if(commandInfo['type'] == "D"){			
			var table_id = commandInfo['tableId'];					
			order['referenceNo'] = "Table #" + table_id;
		}
				
		/* Restaurant */	
		var _saveOrder = function(callback)
		{
			$scope.showModal();
			
			APP.ORDER.saveOrder(order).done(function(msg, order)
			{
				/* Restaurant */
				var order_id = order.uuid;
				
				if(callback){
					callback(order);
				}
				
				//assign order to table if any
				if(commandInfo['type'] == "D"){
					
					var table_id = commandInfo['tableId'];					
					TableService.assignOrder(table_id, order_id);
				}			
				/* Restaurant */		
				
				console.log("processing payment ..");
				//OrderService.setOrder(order);
				$scope.reset();
				$timeout(function()
				{
					$state.go("view-order", {
						"order" : angular.copy(order)
					});
				});
				
			}).fail(function(msg){
				//failed to create
				$scope.alert(msg);
				
			}).always(function()
			{
				$scope.closeModal();
			});
		};
		
		
		if(commandInfo['type'] == "D"){
			
			var title = ('Table #' + commandInfo['tableId']);			
			TableService.sendToKitchen( commandInfo['tableId'] );			
			
			_saveOrder(function(order){
				APP.RESTAURANT.printKitchenReceipts( title, salesRepId, shoppingCart, order );
			});
			
		}
		else if(commandInfo['type'] == "T"){
			
			var takeAwayNo = commandInfo['takeAwayId'];
			
			if( takeAwayNo == 0 ){
				
				TableService.getTakeAwayNo().then(function (response){
					if(response.data){
						
						var takeAwayNo = response.data;
						
						//update order takeAwayId
						order["commandInfo"]["takeAwayId"] = takeAwayNo;
						
						_saveOrder(function(order){
							APP.RESTAURANT.printKitchenReceipts( "Take-Away #" + takeAwayNo , salesRepId, shoppingCart, order );						
						});
					}
				});
				
			}
			else
			{
				_saveOrder(function(order){
					APP.RESTAURANT.printKitchenReceipts( "Take-Away #" + takeAwayNo , salesRepId, shoppingCart, order );						
				});
			}
		}
		else
		{
			alert("Invalid command type: " + commandInfo['type']);
			return;
		}							
		
		/* Restaurant */				
		
	};
	
	$scope.beforeCheckOut = function(){
		
		var store = LoginService.store;
		var terminal = LoginService.terminal;
		// var salesRep = LoginService.user;
		var customer = CustomerService.getCustomer();
		
		/*check customer*/
		if( customer == null){
			
			$scope.alert(I18n.t("Customer is required!"), function(){
				jQuery("input.customer-search-textfield").focus();
			});
			
			return;
		}
		
		var parent_scope = $scope;
		
		/*check posterita cms*/
		if( store.enablecms && store.enablecms == true ){
			/*check default customer*/
			if( terminal.c_bpartner_id == customer.c_bpartner_id ){
				
				/*show confirmation*/
				$scope.confirm("Does customer have a Posterita Loyalty Card?", function(result){
					
					if(result == true)
					{
						$modal.open(
						{
							templateUrl: '/html/popups/posterita-cms-customer.html',
							// size: 'sm',
							//scope : $scope,
							backdrop: 'static',
							controllerAs: 'ctrl',
							controller: function($rootScope, $scope, $modalInstance, CustomerService)
							{
								var ctrl = this;
								
								this.isValid = function()
								{
									var field = ctrl.card_no || '';
									return field;
								};
								
								this.search = function(card_no)
								{
									var results = APP.BP.cache({"identifier":card_no}).get();
									
									if(results.length > 0){
										
										var bp = results[0];
										
										CustomerService.setCustomer(bp);
										$rootScope.$broadcast('new-customer-created', bp);
										
										$modalInstance.close();
										
										$scope.info((I18n.t("customer")+": "+ bp.name), parent_scope.checkOut );
									}
									else
									{
										//search online
										
										$scope.showModal();
										
										var post = { 'identifier' : card_no };
										post = JSON.stringify(post);
										
										BPService.searchCMS(post).done(function(bp){
											
											bp['id'] = bp['c_bpartner_id'];
											
											APP.BP.cache.insert(bp);
											parent_scope.selectedCustomer = bp;
											CustomerService.setCustomer(bp);
											$rootScope.$broadcast('new-customer-created', bp);
											
											$modalInstance.close();											
											
											$scope.info((I18n.t("customer")+": "+ bp.name), parent_scope.checkOut );
											
										}).fail(function(error){
											
											$scope.alert(error);
											
										}).always(function(){
											
											$scope.closeModal();
											
										});	
									}
									
																	
								}
							}
						});
					}
					else
					{
						$scope.checkOut();
					}
				});
				
				return;
			}
		}
		
		$scope.checkOut();
	};
	
	$scope.checkOut = function()
	{
		var store = LoginService.store;
		var terminal = LoginService.terminal;
		// var salesRep = LoginService.user;
		var customer = CustomerService.getCustomer();
		var commissions = CommissionService.getSplits();
		var comments = OrderScreenService.comments;
		var shoppingCart = ShoppingCartService.shoppingCart;
		var salesRepId = CommissionService.active_user_id;		
		
		var salesRep = APP.USER.getUserById(salesRepId);
		
		var refOrder = OrderService.refOrder;
		
		/*check customer*/
		if( customer == null){
			
			$scope.alert(I18n.t("Customer is required!"), function(){
				jQuery("input.customer-search-textfield").focus();
			});
			
			return;
		}
		
		/*check open amount*/
		if( shoppingCart.grandTotal.float() == 0 ){
			
			processPayment({
 			   "tenderType" : "Cash",
 			   "amountTendered" : 0,
 			   "amountRefunded" : 0,
 			   "payAmt" : 0	        		        			   
 		   });
			
			return;
		}
		
		POLE_DISPLAY.display(formatPoleDisplayLine("Total",cart.grandTotal.toString()), "", "cart.showTotal", cart);

		function processPayment(payment)
		{
			var changeText = null;
			
			var paidText = formatPoleDisplayLine("Paid", "" + new Number(payment["payAmt"]).toFixed(2));
			
			if( payment["tenderType"] == "Cash" )
			{
				changeText = formatPoleDisplayLine("Change D.", "" + new Number(payment["amountRefunded"]).toFixed(2));
				paidText = formatPoleDisplayLine("Cash T.", "" + new Number(payment["amountTendered"]).toFixed(2));
			}			
			
			if(changeText != null){
				
				POLE_DISPLAY.display( paidText , changeText, "cart.showChange", payment["amountRefunded"] );
			}
			else
			{
				POLE_DISPLAY.display( paidText , changeText, "cart.showPaid", payment["payAmt"] );
			}
			
			if( payment_modal ){
				
				payment_modal.close();
				//current_payment_modal.close();
			}
			
			$scope.showModal();
			
			var payments = [];
			payments.push(payment);
			
			var order = OrderService.checkout(store, terminal, salesRep, customer, commissions, comments, shoppingCart, payments, refOrder );
			
			if(order == null){
				return;
			}
			
			/* Restaurant */	
			var commandInfo = $scope.commandInfo;
			
			if( commandInfo == null ){
				alert("commandInfo cannot be null!!!");
				return;
			}
			
			//save command info
			order["commandInfo"] = commandInfo;
			
			//save table info in reference
			if(commandInfo['type'] == "D"){			
				var table_id = commandInfo['tableId'];					
				order['referenceNo'] = "Table #" + table_id;
			}
			
			var _saveOrder = function(callback){
			
				jQuery( document ).trigger("order:checkout", order);
				
				APP.ORDER.saveOrder(order).done(function(msg, order)
				{
					var order_id = order.uuid;
					
					if(callback){
						callback(order);
					}
					
					/* Restaurant */
					//assign order to table if any
					if( commandInfo && commandInfo['type'] == "D" ){
						
						var table_id = commandInfo['tableId'];
						
						TableService.checkoutTable( table_id );
						
						//No need to assign table as it is always cleared after checkout
						//TableService.assignOrder(table_id, order_id);
					}			
					/* Restaurant */
					
					console.log("processing payment ..");
					//OrderService.setOrder(order);
					if (APP.ORDER.getOpenAmt(order).float() == 0.0)
					{
						var receipt = APP.ORDER.getReceiptJSON(order);					
						
						if(receipt.printReceipt == false){
							
							if(receipt.openDrawer == true){
								
								PrinterManager.print([
									['OPEN_DRAWER']
								]);
								
							}
							
						}
						else
						{
							PrinterManager.printReceipt(receipt, true);
							jQuery( document ).trigger("order:paid", angular.copy(order));
						}
						
						
						
						//check for voucher
						if ( order.tenderType == "Voucher" ){
							
							if ( order.orderType == "Customer Returned Order" || ( order.orderType == "POS Order" && order.grandTotal < 0 )){
								
								$scope.confirm("Do you want to print voucher?", function(result){
									
									if(result == true){
										var voucher = PrinterManager.getVoucherPrintFormat(receipt);
										PrinterManager.print(voucher);
									}
									
									
								});
							}
						}
												
					}
					
					/* pole display flag */
					CAN_CLEAR_TOTAL = false;
					
					$scope.reset();
					
					CAN_CLEAR_TOTAL = true;
					
					$timeout(function()
					{
						$state.go("view-order", {
							"order" : order
						});
					});
					
				}).fail(function(msg){
					//failed to create
					$scope.alert(msg);
					
				}).always(function(){
					
					$scope.closeModal();
				});
				
			}; //_saveOrder
			
			if(commandInfo['type'] == "D"){
				
				var title = ('Table #' + commandInfo['tableId']);						
								
				_saveOrder(function(order){
					APP.RESTAURANT.printKitchenReceipts( title, salesRepId, shoppingCart, order );
				});
				
			}
			else if(commandInfo['type'] == "T"){
				
				var takeAwayNo = commandInfo['takeAwayId'];
				
				if( takeAwayNo == 0 ){
					
					TableService.getTakeAwayNo().then(function (response){
						if(response.data){
							
							var takeAwayNo = response.data;
							
							//update order takeAwayId
							order["commandInfo"]["takeAwayId"] = takeAwayNo;							
														
							_saveOrder(function(order){
								APP.RESTAURANT.printKitchenReceipts( "Take-Away #" + takeAwayNo , salesRepId, shoppingCart, order );
							});
						}
					});
					
				}
				else
				{
										
					_saveOrder(function(order){
						APP.RESTAURANT.printKitchenReceipts( "Take-Away #" + takeAwayNo , salesRepId, shoppingCart, order );
					});
				}
			}
			else
			{
				alert("Invalid command type: " + commandInfo['type']);
				return;
			}							
			
			/* Restaurant */			
			
		}
		var current_payment_modal;
		var payment_modal = $modal.open(
		{
			templateUrl: '/html/popups/order-screen/payment-panel.html',
			//size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{},
			controller: function( $scope, $modalInstance, ShoppingCartService, LoginService )
			{
				var orderType = ShoppingCartService.shoppingCart.orderType;
				this.orderType = orderType;
				
				var preference = LoginService.terminal.preference;
				var tender_types = preference.acceptPaymentRule;				
				
				var allowTypes = "BXSPMVEGLZJYTUI";
				
				/*
					CARD : 'K',
					CASH : 'B',
					CHEQUE : 'S',
					CREDIT : 'P',
					MIXED : 'M',
					VOUCHER : 'V',
					EXTERNAL_CARD : 'E',
					GIFT_CARD : 'G',
					SK_WALLET : 'W',
					ZAPPER : 'Z',
					LOYALTY : 'L'
				 */
				
				var amountDue = ShoppingCartService.shoppingCart.grandTotal.float();
				
				if( orderType == 'Customer Returned Order' ){
					
					if( amountDue < 0 ){
						
						$scope.alert("Return amount cannot be less than zero!");
						
						return;						
					}
					
					allowTypes = "BV";					
					
				}
				else
				{
					if( amountDue < 0 ){
						
						allowTypes = "BV";	
					}					
				}
				
				tender_types = tender_types.split("");
				
				var x = "";
				
				for(var i=0; i<tender_types.length; i++){
					
					if( allowTypes.indexOf(tender_types[i]) != -1 ){
						
						x = x + tender_types[i];
					}
				}
				
				this.tendersTypes = x;
				
				
				$scope.cashPayment = function()
				{
					var total = ShoppingCartService.shoppingCart.grandTotal.float();
					
					if( orderType == 'Customer Returned Order' || ( orderType == 'POS Order' && total <= 0 ) ){						
						
						processPayment(
						{
							"tenderType": "Cash",
							"amountTendered": total,
							"amountRefunded": 0,
							"payAmt": total
						});
						
						return;
						
					}
					
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/cash.html',
						 size: 'md',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'cashModal topModal',
						resolve:
						{},
						controller: function($scope, $modalInstance, ShoppingCartService)
						{
							this.error = null;
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							$scope.isValid = function()
							{
								var amount = $scope.amount || 0;
								return amount >= $scope.total;
							};
							
							//keypad
							$scope.amount = 0;
							$scope.add = function(value)
							{
								if( $scope.amount == undefined )
								{
									$scope.amount = 0;
								}
								
								var amt = new BigNumber($scope.amount).plus(value).float(2);
								console.log(amt);
								$scope.amount = amt;
							};
							$scope.clear = function()
							{
								$scope.amount = 0;
							};
							
							$scope.exactAmount = function() {
								
								var total = ShoppingCartService.shoppingCart.grandTotal.float(2);
								$scope.amount = total;
							};//keypad
							
							$scope.acceptPayment = function()
							{
								var amountRefunded = new BigNumber($scope.amount).minus($scope.total).float(2);
								processPayment(
								{
									"tenderType": "Cash",
									"amountTendered": $scope.amount,
									"amountRefunded": amountRefunded,
									"payAmt": $scope.total
								});
								$modalInstance.close();
							};
						}
					});
				}; // cash payment
				$scope.creditCardPayment = function()
				{
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/credit-card.html',
						// size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve:
						{},
						controller: function($scope, $modalInstance, ShoppingCartService)
						{
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							$scope.acceptPayment = function()
							{
								processPayment(
								{
									"tenderType": "Card",
									"payAmt": $scope.total
								});
							};
						}
					});
				}; // credit card payment
				$scope.checkPayment = function()
				{
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/check.html',
						// size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve:
						{},
						controller: function($scope, $modalInstance, ShoppingCartService)
						{
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							$scope.isValid = function()
							{
								var field = $scope.chequeNo || '';
								return field;
							};
							$scope.acceptPayment = function()
							{
								processPayment(
								{
									"tenderType": "Cheque",
									"chequeNo": $scope.chequeNo,
									"payAmt": $scope.total
								});
								$modalInstance.close();
							};
						}
					});
				}; // check payment
				
				$scope.mixPayment = function()
				{
					var preference = LoginService.terminal.preference;
					var showDeliveryOption = preference.hasOwnProperty('showDeliveryOption') ? preference.showDeliveryOption : true;
					
					var DELIVER_NOW = "O";
					
					$scope.confirm("Do you want to proceed with Mix Payment?", function(result){
						
						if(result == false) return;
						
						
						if( showDeliveryOption ){
							
							current_payment_modal = $modal.open(
							{							
								templateUrl: '/html/popups/order-screen/delivery.html',
								// size: 'sm',
								// scope : $scope,
								controllerAs: '$ctrl',
								windowClass: 'topModal',
								resolve:
								{},
								controller: function($scope, $modalInstance, ShoppingCartService, $timeout)
								{
									self = this;
									self.opened = {};
									self.open = function($event) {			
										$event.preventDefault();
										$event.stopPropagation();
										self.opened = {};
										self.opened[$event.target.id] = true;									    
									};										
									
									$scope.tenderType = "Mixed";
									$scope.format = 'dd-MM-yyyy';
									$scope.deliveryRule = DELIVER_NOW; //deliver Now
										  
									
									$scope.acceptPayment = function()
									{
										$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
										var scheduleDate = $scope.scheduleDate;
										var deliveryRule = $scope.deliveryRule;
										
										if(deliveryRule != DELIVER_NOW && (scheduleDate == '' || scheduleDate == null)){
											$scope.alert("Schedule Date is required!", function(){
												$timeout(function(){
													jQuery("#schedule_date").trigger("click");
												}, 250 );												
											});
											return;
										}
										
										processPayment(
										{
											"tenderType": "Mixed",
											"payAmt": $scope.total,
											"scheduleDate" : deliveryRule == DELIVER_NOW ? null : scheduleDate,
											"deliveryRule" : deliveryRule
										});
										$modalInstance.close();
									};
								}
							});
							
						}
						else
						{
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							var scheduleDate = $scope.scheduleDate;
							
							processPayment(
							{
								"tenderType": "Mixed",
								"payAmt": $scope.total,
								"scheduleDate" : null,
								"deliveryRule" : DELIVER_NOW
							});
						}
						
						
					});
					
				}; // mix payment
				
				$scope.onCreditPayment = function()
				{
					var customer = CustomerService.current_customer;
					var grandTotal = ShoppingCartService.shoppingCart.grandTotal.float();
					
					var _processCustomerCredit = function(customer, grandTotal){
						
						var creditLimit = customer.so_creditlimit;
						var creditStatus = customer.socreditstatus;
						var openBalance = customer.totalopenbalance;
						
						
						if( creditLimit == 0){
							
							$scope.alert(I18n.t("invalid.credit.status.reason.credit.limit"));
							return;
						}
						
						if( creditStatus == "X"){
							
							$scope.alert(I18n.t("invalid.credit.status.reason.no.credit.check"));
							return;
						}
						
						if(new BigNumber(openBalance).plus(grandTotal).float(2) > new BigNumber(creditLimit).float(2)){
							
							$scope.alert(I18n.t("invalid.credit.status.reason.credit.limit.less.than.grandtotal"));
							return;
						}
						
						current_payment_modal = $modal.open(
						{
							templateUrl: '/html/popups/order-screen/delivery.html',
							// size: 'sm',
							// scope : $scope,
							controllerAs: '$ctrl',
							windowClass: 'topModal',
							resolve:
							{},
							controller: function($scope, $modalInstance, ShoppingCartService, CustomerService, LoginService, $timeout)
							{
								self = this;
								self.opened = {};
								self.open = function($event) {			
									$event.preventDefault();
									$event.stopPropagation();
									self.opened = {};
									self.opened[$event.target.id] = true;									    
								};	
								
								var DELIVER_NOW = "O";
								  
								$scope.tenderType = "Credit";
								$scope.format = 'dd-MM-yyyy';
								$scope.deliveryRule = DELIVER_NOW; //deliver Now
								
								$scope.paymentTerms = LoginService.store.paymentTerms || [];
								$scope.paymentTerm = null;	
								
								$scope.acceptPayment = function()
								{
									var paymentTermId = 0;
									var scheduleDate = $scope.scheduleDate;
									var deliveryRule = $scope.deliveryRule;
									
									if($scope.paymentTerm != null){
										paymentTermId = $scope.paymentTerm['c_paymentterm_id'];
									}
									
									if(paymentTermId == 0){
										$scope.alert("Payment Term is required!", function(){
											document.getElementById("paymentTerm_list").focus();
										});
										return;
									}
									
									if(deliveryRule != DELIVER_NOW && (scheduleDate == '' || scheduleDate == null)){
										$scope.alert("Schedule Date is required!", function(){
											$timeout(function(){
												jQuery("#schedule_date").trigger("click");
											}, 250 );												
										});
										return;
									}
									
									processPayment(
									{
										"tenderType": "Credit",
										"payAmt": 0,
										"scheduleDate" : deliveryRule == DELIVER_NOW ? null : scheduleDate,
										"deliveryRule" : deliveryRule,
										"paymentTermId" : paymentTermId
									});
									$modalInstance.close();
								};
							}
						});
						
					};
					
					$scope.showModal();
					
					var post = { 'id' : customer['c_bpartner_id'] };
					post = JSON.stringify(post);
					
					BPService.get(post).done(function(bp){
						
						_processCustomerCredit(bp, grandTotal);	
						
						
					}).fail(function(error){
						
						$scope.alert(error);
						
					}).always(function(){
						
						$scope.closeModal();
						
					});	
					
				}; // on credit payment				
				
				$scope.giftCardPayment = function()
				{
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/gift-card.html',
						// size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve:
						{},
						controller: function($scope, $modalInstance, ShoppingCartService)
						{
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							$scope.isValid = function()
							{
								var fields = ($scope.giftCardNo || '');
								return fields;
							};
							$scope.acceptPayment = function()
							{
								var post = {};
								post["cardNo"] = $scope.giftCardNo; /* 8500000007976 */
								//post["cardCvv"] = $scope.giftCardCVV;
								post["cardCvv"] = '';
								post["amount"] = $scope.total;
								post = JSON.stringify(post);
								GiftCardService.validatePaymentAmount(post).done(function(response)
								{
									if (response["ok"] == true)
									{
										processPayment(
										{
											"tenderType": "Gift Card",
											"giftCardNo": $scope.giftCardNo,
											"giftCardCVV": "",
											"payAmt": $scope.total
										});
										$modalInstance.close();
									}
									else
									{
										$scope.alert(response["reason"]);
									}
								}).fail(function(msg)
								{
									// failed
									// to
									// create
									$scope.alert(msg);
								});
							};
						}
					});
				}; // gift card payment
				$scope.voucherPayment = function()
				{
					
					var total = ShoppingCartService.shoppingCart.grandTotal.float();
					
					if( orderType == 'Customer Returned Order' || ( orderType == 'POS Order' && total < 0 ) ){						
						
						processPayment(
						{
							"tenderType": "Voucher",
							"voucherNo": "",
							"payAmt": total
						});
						
						return;
						
					}

					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/voucher.html',
						// size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve: {},
						controller: function($scope, $modalInstance, ShoppingCartService, LoginService, $timeout)
						{
							$scope.stores = APP.STORE.searchStores({});				
     		        	   	$scope.current_store_id = LoginService.terminal.ad_org_id;
     		        	    
     		        	   	$timeout(function(){
    		        		   $scope.voucherStoreId = LoginService.terminal.ad_org_id;
     		        	   	});
     		        	   
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							
							$scope.isValid = function(){
     		        		   
     		        		   var voucherNo = $scope.voucherNo || '';
     		        		   var orgId = $scope.voucherStoreId || '';
     		        		   
     		        		   return voucherNo.length > 0 && orgId.length > 0;	 		        		   
     		        	   };
     		        	   
							$scope.acceptPayment = function()
							{
								var post = {};
								post["voucherNo"] = $scope.voucherNo;
								post["amount"] = $scope.total;
								post["orgId"] = $scope.store_id;
								post = JSON.stringify(post);
								
								VoucherService.validatePaymentAmount(post).done(function(response)
								{
									if (response["ok"] == true)
									{
										var voucherId = response["voucherId"];
										
										processPayment(
										{
											"tenderType": "Voucher",
											"voucherId" : voucherId,
											"payAmt": $scope.total
										});
										$modalInstance.close();
									}
									else
									{
										$scope.alert(response["reason"]);
									}
								}).fail(function(msg)
								{
									// failed
									// to
									// create
									$scope.alert(msg);
								});
							};
						}
					});
				}; // voucher payment
				
				$scope.loyaltyPayment = function()
				{
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/loyalty.html',
						// size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve:
						{},
						controller: function($scope, $modalInstance, ShoppingCartService, CustomerService)
						{
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							var customer = CustomerService.current_customer;
							var c_bpartner_id = customer['c_bpartner_id'];
							$scope.bp = APP.BP.getBPartnerById(c_bpartner_id);
							var post = {};
							post["bpId"] = $scope.bp.c_bpartner_id;
							post = JSON.stringify(post);
							LoyaltyService.getLoyaltyInfo(post).done(function(json)
							{
								if (json["isOk"] == true)
								{
									$scope.loyaltyPoints = json["loyaltyPoints"];
									$scope.loyaltyPointsEarned = json["loyaltyPointsEarned"];
									$scope.loyaltyPointsSpent = json["loyaltyPointsSpent"];
								}
								else
								{
									$scope.alert(json["reason"]);
									
									$modalInstance.close();
								}
							}).fail(function(error)
							{
								$scope.alert(error);
							});
							
							$scope.acceptPayment = function()
							{
								var diff = $scope.loyaltyPoints - $scope.total;
								if (diff < 0.0)
								{
									$modalInstance.close();
									$scope.alert(I18n.t("loyalty.points.is.less.than.order.total")+ " " + new Number($scope.loyaltyPoints).toFixed(2) + " " + I18n.t("order.total")+ " " + new Number($scope.total).toFixed(2));
									return;
								}
								processPayment(
								{
									"tenderType": "Loyalty",
									"payAmt": $scope.total
								});
								$modalInstance.close();
							};
						}
					});
				}; // loyalty payment
				
				$scope.externalCard = function(title, tenderType)
				{
					current_payment_modal = $modal.open(
					{
						templateUrl: '/html/popups/order-screen/external-payment.html',
						//size: 'sm',
						// scope : $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						resolve: 
						{
							title : function(){
								return title;
							},
							
							tenderType : function(){
								return tenderType;
							}
						},
						controller: function($scope, $modalInstance, ShoppingCartService, title, tenderType)
						{
							$scope.title = title;
							$scope.total = ShoppingCartService.shoppingCart.grandTotal.float();
							$scope.acceptPayment = function()
							{
								processPayment(
								{
									"tenderType": tenderType,
									"payAmt": $scope.total
								});
								$modalInstance.close();
							};
						}
					});
				}; 
				
				$scope.externalCardPayment = function(){
					$scope.externalCard("External Card", APP.TENDER_TYPE.EXTERNAL_CARD);
				}; // external credit card payment
				
				$scope.mcbJuicePayment = function(){
					$scope.externalCard("MCB Juice", APP.TENDER_TYPE.MCB_JUICE);
				};//mcb juice payment
				
				$scope.mytMoneyPayment = function(){
					$scope.externalCard("MY.T Money", APP.TENDER_TYPE.MY_T_MONEY);
				};//myt money
				
				$scope.emtelMoneyPayment = function(){
					$scope.externalCard("Blink", APP.TENDER_TYPE.EMTEL_MONEY);
				};//emtel money payment
				
				$scope.giftsMuPayment = function(){
					$scope.externalCard("Gifts.mu", APP.TENDER_TYPE.GIFTS_MU);
				};//gifts.mu payment
				
				$scope.mipsPayment = function(){
					$scope.externalCard("MIPS", APP.TENDER_TYPE.MIPS);
				};//mips payment
			}
		});
	};
	$scope.keyPad = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/order-screen/keypad.html',
			// size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			windowClass: 'my-modal-popup topModal',
			resolve:
			{},
			controller: function($scope, $modalInstance)
			{
				$scope.amount = 0;
				$scope.add = function(value)
				{
					var amt = new BigNumber(this.amount).plus(value).float(2);
					console.log(amt);
					this.amount = amt;
				};
				$scope.clear = function()
				{
					this.amount = 0;
				};
				$scope.exactAmount = function() {};
			}
		});
	};
	$scope.discountOnTotal = function()
	{
		var role = LoginService.role;		
		
		/* check for discount code */
		if( ShoppingCartService.shoppingCart.discountCode != null )
		{
			$scope.info("Business partner has discount code. All other discounts are not applicable.");
			return;
		}
		
		if (role.isdiscountallowedontotal == 'N') {
			
			$scope.alert("Your role does not allow you to give discount on total!");
			return;
		}		
		
		$modal.open(
		{
			templateUrl: '/html/popups/discount-on-total.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{},
			controller: function($scope, $modalInstance, ShoppingCartService)
			{
				var grandTotal = ShoppingCartService.shoppingCart.grandTotal;
				var discountOnTotal = ShoppingCartService.shoppingCart.discountOnTotal;
				
				var discount = discountOnTotal.times(100).dividedBy(discountOnTotal.plus(grandTotal));
				
				grandTotal = grandTotal.float();
				discountOnTotal = discountOnTotal.float();
				discount = discount.float();
				
				
				var $ctrl = this;
				var data = {
					discount: discount,
					amountOff: discountOnTotal,
					total: grandTotal,
					'grandTotal': new BigNumber(grandTotal + discountOnTotal).float()
				};
				$ctrl.reset = function()
				{
					this.data = angular.copy(data);
					
				};
				$ctrl.reset();
				$ctrl.apply = function()
				{
					//upsell
					
					if ($ctrl.data.discount > role.userdiscount) {
						
						$scope.alert("Discount is greater than discount limit!");
						return;
					}
					
					if($ctrl.data.discount < 0.0)
					{
						$scope.alert("Discount amount cannot be negative!");
						return;
					}
					
					var discountAmt = $ctrl.data.amountOff;
					
					
					/*
					var cart = ShoppingCartService.shoppingCart;
					var previousDiscountOnTotal = cart.discountOnTotal;
					
					if(previousDiscountOnTotal != 0.0 )
					{
						$scope.alert("You have already given discount on total! Please clear previous discount on total. Click reset to clear previous discount.");
						return;
					}	
					*/			
										
					ShoppingCartService.shoppingCart.setDiscountOnTotal(discountAmt);
					$modalInstance.close();
				};
				$ctrl.onDiscountChange = function(value)
				{
					value = value || 0;
					value = new BigNumber(value);
					value = value.negate().plus(100).dividedBy(100);
					var grandTotal = $ctrl.data.grandTotal;
					grandTotal = new BigNumber(grandTotal);
					var total = grandTotal.times(value);
					var amountOff = grandTotal.minus(total);
					$ctrl.data.total = total.float();
					$ctrl.data.amountOff = amountOff.float();
				};
				$ctrl.onAmountOffChange = function(value)
				{
					value = value || 0;
					value = new BigNumber(value);
					var grandTotal = $ctrl.data.grandTotal;
					grandTotal = new BigNumber(grandTotal);
					var total = grandTotal.minus(value);
					var discount = value.dividedBy(grandTotal).times(100);
					$ctrl.data.total = total.float();
					$ctrl.data.discount = discount.float();
				};
				$ctrl.onTotalChange = function(value)
				{
					value = value || 0;
					value = new BigNumber(value);
					var grandTotal = $ctrl.data.grandTotal;
					grandTotal = new BigNumber(grandTotal);
					var amountOff = grandTotal.minus(value);
					var discount = amountOff.dividedBy(grandTotal).times(100);
					$ctrl.data.discount = discount.float();
					$ctrl.data.amountOff = amountOff.float();
				};
			}
		});
	};
	// parse hash parameters
	if (!$stateParams.action)
	{
		return;
	}
	
	var action = $stateParams.action;
	var param_order = $stateParams.order;
	
	$scope.action = action;
	
	if ('copyOrder' == action || 'invokeOrder' == action || 'exchangeOrder' == action || 'refundOrder' == action)
	{
		var order = param_order;
		
		if( order == null && 'refundOrder' == action ){
			return;
		}
		
		if (order == null)
		{
			$scope.alert(I18n.t("failed.to.load.order"));
			return;
		}
		// reset customer
		$scope.reset();
		//clear previous cart	
		if( ShoppingCartService.shoppingCart != null ){
			ShoppingCartService.reset(false);
		}
		
		if( 'refundOrder' != action ){
			
			$scope.shoppingCart = ShoppingCartService.getShoppingCart( order['orderType'] );
			
		}
		
		// load shopping cart
		var shoppingCart = ShoppingCartService.shoppingCart;
		
		// set customer
		if ('invokeOrder' == action || 'exchangeOrder' == action || 'refundOrder' == action)
		{
			var customer = APP.BP.getBPartnerById(order['bpartnerId']);
			CustomerService.setCustomer(customer);
			
			if('invokeOrder' == action)
			{
				var refOrder = {
						"uuid" : order["uuid"],
						"documentNo" : order["documentNo"],
						"comments" : order["comments"]
				};
				
				OrderService.refOrder = refOrder;
			}
			
		}
		
		var negateQty = ('exchangeOrder' == action);
		for (var i = 0; i < order.lines.length; i++)
		{
			var line = order.lines[i];
			var qtyEntered = line.qtyEntered;
			// remove any previous returns
			if (line.qtyReturned)
			{
				qtyEntered = qtyEntered - line.qtyReturned;
			}
			if (qtyEntered == 0)
			{
				continue;
			}
			if (negateQty)
			{
				qtyEntered = -qtyEntered;
			}
			// check if gift, coupon, or promotion
			if (line.productName == 'Gift' || line.productName == 'Coupon' || line.productName == 'Redeem Promotion')
			{
				continue;
			}
			// check if product exists
			var product = APP.PRODUCT.getProductById(line.id);
			if (product == null)
			{
				// alert(I18n.t("product.not.found",
				// line.description));
				continue;
			}
			
			if(line.m_attributesetinstance_id){
				
				var m_product_id = line.id;
				var m_attributesetinstance_id = line.m_attributesetinstance_id;
				
				var product = APP.PRODUCT.getProductById(m_product_id);
				
				product.pricestd = new BigNumber(line.priceEntered);
				product.pricelist = new BigNumber(line.priceList);
				product.pricelimit = new BigNumber(line.priceLimit);
				
				var cartline = new ShoppingCartLine(shoppingCart, product, qtyEntered);
				cartline.setLineId(shoppingCart.lineCount++);
				cartline.m_attributesetinstance_id = m_attributesetinstance_id;
				shoppingCart.addLine( cartline );
			}
			else 
			{
				shoppingCart.addToCart(line.id, qtyEntered, line.description, line.priceEntered);
			}			
			
			var lineId = shoppingCart.lastUpdatedLineId;
			if ('copyOrder' != action)
			{
				if (negateQty)
				{
					shoppingCart.setDiscountOnLine(lineId, (line.discountAmt * -1));
				}
				else
				{
					shoppingCart.setDiscountOnLine(lineId, line.discountAmt);
				}
			}
			shoppingCart.setTax(lineId, line.taxId);
			var shoppingCartLine = shoppingCart.getLine(lineId);
			shoppingCartLine.product = product;
			if ('exchangeOrder' == action)
			{
				shoppingCartLine.exchangeLine = true;
			}
			// orderline reference
			if ('exchangeOrder' == action || 'refundOrder' == action)
			{
				shoppingCartLine.ref_orderline_id = line.c_orderline_id;
			}
			// modifiers
			if (line.modifiers)
			{
				for (var j = 0; j < line.modifiers.length; j++)
				{
					var modifier = line.modifiers[j];
					var product = APP.PRODUCT.getProductById(modifier.id);
					var qtyEntered = modifier.qtyEntered;
					if (negateQty)
					{
						qtyEntered = -qtyEntered;
					}
					var qty = new BigNumber(qtyEntered);
					var mline = new ShoppingCartLine(shoppingCart, product, qty);
					mline.modifier = modifier.modifierId;
					mline.product = product;
					shoppingCartLine.modifiers.push(mline);
				}
			}
			
			shoppingCartLine.editable = false;
		}
	}
	
	/* Restaurant */
	//check command-info 
	/*
	 * 	commandInfo : {
	 * 	type: "D", 
	 * 	tableId : 1
	 * }
	 * 
	 * commandInfo : {
	 * 	type: "T",
	 * 	customer : 'xxxxx',
	 * 	phone : '999-9999'
	 * 	time : '13:45',
	 * 	takeAwayId : 7
	 * }	
	 * 	
	 */	
	 
	$scope.shoppingCart.seperateLines = true;
	
	$scope.commandInfo = null;
	
	if( $stateParams.commandInfo != null ){	
		$scope.commandInfo = $stateParams.commandInfo;
		//console.log( $scope.commandInfo );
	}
	
	$scope.getTitle = function(){
		
		var title = "XXXX";
		
		var info = $scope.commandInfo;
		
		if( info != null ){
			
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
		}
		
		return title;
	}	
	
	/* Restaurant */
	
	
});
