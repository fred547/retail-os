angular.module('app').controller('GliderController', function($scope, ProductService)
{
	var ctrl = this;
	ctrl.glider = {
		primarygroup: null,
		group1: null,
		group2: null,
		tiles: null,
		level: 0,
		refresh: function()
		{
			var query = {};
			if (this.level == 3)
			{
				var query = {
					"primarygroup": this.primarygroup,
					"group1": this.group1,
					"group2": this.group2
				};
				this.tiles = [this.group2];
			}
			else if (this.level == 2)
			{
				query = {
					"primarygroup": this.primarygroup,
					"group1": this.group1
				};
				this.tiles = ProductService.distinct( query, "group2" );
			}
			else if (this.level == 1)
			{
				query = {
					"primarygroup": this.primarygroup
				};
				this.tiles =  ProductService.distinct( query, "group1" );
			}
			else
			{
				this.tiles =  ProductService.distinct( query, "primarygroup" );
			}						
			
			$scope.filterProduct(query);
		},
		setLevel: function(level, attr)
		{
			if (level == 1)
			{
				this.primarygroup = attr;
			}
			else if (level == 2)
			{
				this.group1 = attr;
			}
			else if (level == 3)
			{
				this.group2 = attr;
			}
			else
			{
				return;
			}
			this.level = level;
			this.refresh();
		},
		getTiles: function()
		{
			return this.tiles;
		},
		back: function()
		{
			if (this.level > 0)
			{
				this.level = this.level - 1;
				this.refresh();
			}
		},
		home: function()
		{
			this.level = 0;
			this.refresh();
		}
	};
	
	ctrl.glider.tiles =  ProductService.distinct( {}, "primarygroup" ); //render initial tiles
});
angular.module('app').controller('ClockController', function($scope, $interval, dateFilter)
{
	var ctrl = this;
	var refreshClock = function()
	{
		ctrl.date = dateFilter(new Date(), 'd MMM yy');
		ctrl.time = dateFilter(new Date(), 'h:mm:ss a');
	}
	refreshClock();
	var stop = $interval(refreshClock, 1000);
	$scope.$on('$destroy', function()
	{
		$interval.cancel(stop);
	});
});
angular.module('app').controller('UserInfoController', function($scope, $modal, $location, LoginService)
{
	var ctrl = this;
	ctrl.TERMINAL = LoginService.terminal.u_posterminal_name;
	ctrl.STORE = LoginService.store.name;
	ctrl.USER = LoginService.user.name;
	ctrl.ROLE = LoginService.role.name;
	
	ctrl.logout = function()
	{
		$scope.confirm("Do you want to logout?", function(result){
			if(result == true){
				
				localStorage.removeItem('#LOGIN-DETAILS');
				
				$location.path("/login").search({});
			}			
		});
	};
	
	ctrl.showUserInfo = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/terminal-info.html',
			//size: 'sm',
			scope: $scope,			
			controller: function($scope, $modalInstance, LoginService)
			{
				var ctrl = this;
				ctrl.TERMINAL = LoginService.terminal.u_posterminal_name;
				ctrl.STORE = LoginService.store.name;
				ctrl.USER = LoginService.user.name;
				ctrl.ROLE = LoginService.role.name;
			},
			controllerAs: 'ctrl'
		});
	};
});
angular.module('app').controller('ShoppingCartController', function($scope, $modal, LoginService)
{	
	$scope.setShoppingCartSelectedIndex = function( index ){
		
		$scope.shoppingCart.selectedIndex = index;
		
	};
	
	$scope.editQty = function(line)
	{
		if(line.editable == false)
		{
			return;
		}
		
		$scope.setShoppingCartSelectedIndex(line.lineId);
		
		var product = line.product;
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		$modal.open(
		{
			templateUrl: '/html/popups/item-line.html',
			// size: 'sm',
			// scope : $scope,
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, line)
			{
				
				var $ctrl = this;
				var initialQty = parseFloat(line.qty.val);
				var allowSplit = true;
				
				/* add split validation based on uom scale */
				if(line.product.stdprecision == 0)
				{
					allowSplit = ( initialQty < -1 || initialQty > 1 );
				}
				else
				{
					allowSplit = ( initialQty != 0.0 );
				}
				
				$ctrl.qty = initialQty;
				
				$ctrl.isValid = function()
				{
					return allowSplit;
				};
				
				
				$ctrl.apply = function(qty)
				{
					var qtyEntered = $ctrl.qty;
					
					//set scale based on uom
					if( line.product.stdprecision == 0 )
					{
						qtyEntered = parseInt(qtyEntered);
					}
					else
					{
						qtyEntered = parseFloat(qtyEntered);
					}
					
					qtyEntered = new BigNumber(qtyEntered);
					
					line.shoppingCart.updateQty(line.lineId, qtyEntered);
					$modalInstance.close();
				};
				
				$ctrl.splitLine = function()
				{
					$modalInstance.close();
					
					$modal.open(
						{
							templateUrl: '/html/popups/split-line.html',
							//size: 'lg',
							// scope : $scope,
							controllerAs: '$ctrl',
							resolve:
							{
								line: function()
								{
									return line;
								}
							},
							controller: function($scope, $modalInstance, line)
							{
								$scope.line = line;
								$scope.apply = function()
								{
									
									if(isNaN($scope.qty)){
										$scope.alert(I18n.t('invalid.qty'));						
										return;					
									}
									
									if( ( $scope.line.qty > 0 && $scope.qty >= $scope.line.qty ) /* positive qty */
											|| ( $scope.line.qty < 0 && $scope.qty <= $scope.line.qty ) ) /* negative qty */
									{
										$scope.alert(I18n.t('qty.entered.must.be.less.than') +" "+ $scope.line.qty + '!');						
										return;	
									}
									
									line.shoppingCart.splitLines($scope.line.lineId, $scope.qty);
									$modalInstance.close();
								};
							}
						});
					
				};				
				
			},
			controllerAs: '$ctrl',
		});
	};
	$scope.editPrice = function(line)
	{
		/* check for discount code */
		/*
		if( line.shoppingCart.discountCode != null )
		{
			$scope.info("Business partner has discount code. All other discounts are not applicable.");
			return;
		}
		*/
		
		/*
		if(line.editable == false)
		{
			return;
		}
		*/
		
		$scope.setShoppingCartSelectedIndex(line.lineId);
		
		var product = line.product;
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		$modal.open(
		{
			templateUrl: '/html/popups/item-line-discount.html',
			// size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, LoginService, line, $timeout)
			{
				$scope.role = LoginService.role;
				
				var calculateDiscount = function(newPrice, oldPrice)
				{
					var priceEntered = new BigNumber(newPrice);
					var priceList = new BigNumber(oldPrice);
					var discountPercentage = priceList.minus(priceEntered);
					discountPercentage = discountPercentage.times(100);
					discountPercentage = discountPercentage.dividedBy(priceList);
					return discountPercentage;
				}
				
				//boms
				$scope.isBom = false;
				if(line.boms && line.boms.length > 0){
					$scope.isBom = true;
				}
				
				var priceStd = new BigNumber(line.product.pricestd);
				var priceList = new BigNumber(line.product.pricelist);
				var priceLimit = new BigNumber(line.product.pricelimit);
				
				var taxIncluded = line.shoppingCart.priceListIncludeTax;
				
				var priceEntered = line.priceEntered;
				var total = taxIncluded ? line.lineNetAmt : line.lineAmt;
				
				if($scope.isBom){
					
					var bom = null;
					
					for(var i=0; i<line.boms.length; i++){
						
						bom = line.boms[i];
						
						priceStd = priceStd.plus( new BigNumber(bom.product.pricestd).times(bom.qty).dividedBy(line.qty) );
						priceList = priceList.plus( new BigNumber(bom.product.pricelist).times(bom.qty).dividedBy(line.qty) );
						priceLimit = priceLimit.plus( new BigNumber(bom.product.pricelimit).times(bom.qty).dividedBy(line.qty) );
						
						priceEntered = priceEntered.plus( new BigNumber(bom.priceEntered).times(bom.qty).dividedBy(line.qty) );
						total = total.plus( taxIncluded ? bom.lineNetAmt : bom.lineAmt );
					}
					
				}
				
				var initialDiscountPercentage = calculateDiscount(priceStd, priceList);
				var discountPercentage = calculateDiscount(priceEntered, priceList);
				
				
				var data = {
					'price': priceEntered.float(2),
					'total': total.float(2),
					'discount': discountPercentage.float(2),
					'initialDiscount' : initialDiscountPercentage.float(2),
					'qty': line.qty.float(2),
					'pricestd': priceStd.float(2),
					'pricelist': priceList.float(2),
					'pricelimit': priceLimit.float(2),
					'discountCode': line.discountCode
				};
				
				var store = LoginService.store;
				var discountCodeList = store['discountCodes'];
				
				if( discountCodeList != null && discountCodeList.length > 0 ){	
					
					var codes = [
						{'u_pos_discountcode_id':0, 'name':'', 'percentage':-1000}
					];
					
					/* discount code */
					var discountcodes = line.product.discountcodes || "{}";
					discountcodes = discountcodes.substr(1, discountcodes.length - 2);
					
					var array = [];
					
					if(discountcodes.length > 0){
						array = discountcodes.split(",");
					}
					
					var u_pos_discountcode_id, discountCode;
					
					for(var i=0; i<discountCodeList.length; i++){
						
						discountCode = discountCodeList[i];
						u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
						
						if( array.indexOf(u_pos_discountcode_id + '') >= 0 ){
							codes.push(discountCode);
						}						
					}			
					
					
					if( line.shoppingCart.discountCode != null ){
						
						codes.push( line.shoppingCart.discountCode );
					}
					
					$scope.codes = codes;
				}
				
				$scope.applyDiscountCode = function(){
					
					var discountCode = $scope.data['discountCode'];
					
					line.shoppingCart.applyDiscountCode(line.lineId, discountCode);
					
					$modalInstance.close();
					
				};
				
				data.discountAmt = (data.pricelist - data.price) * data.qty;
				
				$timeout(function(){
					$scope.data = angular.copy(data);
				});
				
				
				$scope.reset = function()
				{
					$scope.onPriceChange( $scope.data.pricestd );
				};
				
				$scope.onPriceChange = function(newValue)
				{
					var price = newValue || 0;
					var discountPercentage = calculateDiscount(price, $scope.data.pricelist);
					discountPercentage = discountPercentage.float(2);
					
					if( price != 0){
						$scope.data.price = price;
					}
					
					$scope.data.discount = discountPercentage;
					$scope.data.total = new BigNumber(price * $scope.data.qty).float(2);
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - price) * $scope.data.qty).float(2);
				}
				$scope.onTotalChange = function(newValue)
				{
					var total = newValue || 0;
					$scope.data.price = total / $scope.data.qty;
					var discountPercentage = calculateDiscount($scope.data.price, $scope.data.pricelist);
					discountPercentage = discountPercentage.float(2);
					$scope.data.discount = discountPercentage;
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - $scope.data.price) * $scope.data.qty).float(2);
				}
				$scope.onDiscountChange = function(newValue)
				{
					var discount = newValue || 0;
					discount = 100 - discount;
					discount = discount / 100;
					$scope.data.price = new BigNumber(discount * $scope.data.pricelist).float(2);
					$scope.data.total = new BigNumber($scope.data.price * $scope.data.qty).float(2);
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - $scope.data.price) * $scope.data.qty).float(2);
				}
				
				var aggregateDiscount = function(discount1, discount2){
					
					var d1 = new BigNumber(100).minus(discount1);
					var d2 = new BigNumber(100).minus(discount2);
					
					var d3 = d1.times(d2).dividedBy(100);
					var d4 = new BigNumber(100).minus(d3);
					
					return d4.float(2);
				};
				
				$scope.override = function(){
					
					$scope.input("Override discount limit", "Enter PIN", function(pin){
						
						var users = APP.USER.searchUsers({
								'isactive' : 'Y',
								'userpin' : pin
						});
						
						if(users.length == 0){
							$scope.alert("Invalid PIN!");
						}
						else
						{
							var user = users[0];
							
							var ad_role_id = user['ad_role_id'];
							var role = APP.ROLE.getRoleById(ad_role_id);
							
							if(role == null){
								$scope.alert("Role not found!");
							}
							else if( role.iactive == 'N' ){
								$scope.alert("Role has been deactivated!");
							}
							else
							{
								$scope.role = role;
								console.log("Discount limit " + role.userdiscount + "%");
							}
						}
						
					}, false, true);
					
				};
				
				$scope.apply = function()
				{
					var role = $scope.role; /* role can be overriden */
					var data = $scope.data;					
					
					var discountLimit = null;
										
					if( role.discountoncurrentprice == 'Y' ){
						
						//combine user discount and initial product discount
						discountLimit = aggregateDiscount( role.userdiscount , data.initialDiscount );
					}
					else
					{
						//initial product discount can override user discount
						discountLimit = ( data.initialDiscount > role.userdiscount ) ? data.initialDiscount : role.userdiscount;
					}					
					
										
					if( data.discount > discountLimit )
					{
						$scope.alert("Discount is greater than discount limit");
						return;
					}
										
					if( role.allow_upsell == 'Y' )
					{
						//do nothing
					}
					else
					{
						if( role.overwritepricelimit == 'N' )
						{
							if( data.pricelimit > data.price )
							{
								$scope.alert( "The price limit " + data.pricelimit + " has exceeded by the price entered: " + data.price );
								return;
							}
						}
					}										
					
					line.shoppingCart.setDiscountOnLine(line.lineId, $scope.data.discountAmt);
					//line.setDiscountAmt($scope.data.discountAmt);
					
					$modalInstance.close();
				};
				$scope.close = function()
				{
					$modalInstance.close();
				};
			}
		});
	};
	
	$scope.showLineInfo = function(line){
		
		if(line.editable == false)
		{
			return;
		}
		
		var product = line.product;
		
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		
		$modal.open(
		{
			templateUrl: '/html/popups/shoppingcart-line-comment.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, line)
			{
				this.product = line.product;
				this.comments = line.comments || '';
								
				this.addComment = function(comments)
				{	
					line.comments = comments;
					
					$modalInstance.close();
				};
				
				this.suite = function()
				{
					line.suite = true;					
					$modalInstance.close();
				};
				
				this.isValid = function()
				{
					var field = this.comments;
					return field;
				};
			}
		}); 
	};
	
	$scope.showProductInfo = function(product)
	{
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		
		$modal.open(
		{
			templateUrl: '/html/popups/product-info.html',
			size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				product: function()
				{
					return product;
				}
			},
			controller: function($scope, $http, $modalInstance, product, LoginService)
			{
				$scope.product = product;
				$scope.stocks = [];
				
				/*discount code*/
				var discountcodes = product.discountcodes || "{}";
				discountcodes = discountcodes.substr(1, discountcodes.length - 2);
				
				var array = [];
				
				if(discountcodes.length > 0){
					array = discountcodes.split(",");
				}					
				
				var store = LoginService.store;
				var discountCodeList = store['discountCodes'];
				
				var u_pos_discountcode_id, discountCode;
				var codes = [];
				
				for(var i=0; i<discountCodeList.length; i++){
					
					discountCode = discountCodeList[i];
					u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
					
					if( array.indexOf(u_pos_discountcode_id + '') >= 0 ){
						codes.push(discountCode);
					}						
				}
				
				$scope.discountCodes = codes;
				
				$scope.status_message = "Loading ...";
				$scope.mapping_status_message = "Loading ...";
								
				$scope.close = function()
				{
					$modalInstance.close();
				};
				
				//request stock
				var post = {};
				post['m_product_id'] = product['id'];
				post = JSON.stringify(post);
				
				var url = "/service/Product/stock?json=" + post;
				
				$http.post(url).then(function(response)
				{
					//check for error
					if( response.data.error ){
						
						$scope.status_message = response.data.error;
						return;
					}
					
					$scope.stocks = response.data;
					$scope.status_message = "";
					
				}, function(error)
				{
					$scope.status_message = error;
				});
				
				
				//request mappings
				var post = {};
				post['m_product_id'] = product['id'];
				post = JSON.stringify(post);
				
				var url = "/service/Product/mappings?json=" + post;
				
				$http.post(url).then(function(response)
				{
					//check for error
					if( response.data.error ){
						
						$scope.mapping_status_message = response.data.error;
						return;
					}
					
					$scope.mappings = response.data.mappings;
					$scope.mapping_status_message = "";
					
				}, function(error)
				{
					$scope.mapping_status_message = error;
				});
			}
		});
	};
	
	$scope.removeLine = function(line)
	{
		var _removeLine = function(){
			
			//get confirmation
			$scope.confirm("Do you want to void line - "+ line.product.name +" ?", function(result){
				
				if(result == true){
					
					$scope.shoppingCart.addToCart(line.product.m_product_id, 0 - line.qty.float(), "Void - " + line.description, null, null);
					
					line.voided = true;
				}
			});
			
		};
		
		if(line.editable == false)
		{
			var role = LoginService.role;
			
			if("Restaurant Coordinator" == role.name || "Administrator" == role.name || "Marketer" == role.name){
				
				_removeLine();			
			}
			else
			{
				$scope.pin(function(pin){
					
					//validate PIN			
					var user = APP.USER.getUserByPin(pin);						
					
					if(user == null){
						alert("Invalid PIN!");
					}
					else
					{
						if(user.isactive == 'N'){
							alert("User is not active!");
							return;
						}
						
						var role = APP.ROLE.getRoleById(user.ad_role_id);
						
						if("Restaurant Coordinator" == role.name || "Administrator" == role.name){
							_removeLine();
						}
						else
						{
							alert("Only Restaurant Coordinator can remove lines!");
						}
					}
				});
			}
		}
		else
		{
			$scope.shoppingCart.removeFromCart(line.lineId);
		}		
		
	};	
	
});

angular.module('app').controller('CustomerController', function($scope, $modal, $timeout, CustomerService, LoginService)
{	
	if (CustomerService.default_customer == null)
	{
		var terminal = LoginService.terminal;
		var c_bpartner_id = terminal['c_bpartner_id'];
		CustomerService.default_customer = APP.BP.getBPartnerById(c_bpartner_id);
		CustomerService.setDefaultCustomer(bp);
	}
	// autocomplete
	$scope.selectedCustomer = CustomerService.getCustomer();
	
	$scope.searchCustomers = function(term)
	{
		var customers = CustomerService.searchCustomer(term);
				
		return customers;
	};
	
	$scope.$watch('selectedCustomer', function(newValue, oldValue, scope)
	{
		if( typeof newValue == 'string' ){
			
			CustomerService.setCustomer(null);
			
			return;
		}
		
		CustomerService.setCustomer(newValue);
		if(typeof shoppingCart != 'undefined'){
			shoppingCart.setBp(newValue);
		}
	});
	
	$scope.$on('new-customer-created', function(event, data)
	{
		$scope.selectedCustomer = data;
	});
	
	$scope.$on('set-customer', function(event, data)
	{
		$scope.selectedCustomer = data;
	});	
	
	$scope.createCustomer = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/create-customer.html',
			// size: 'lg',
			scope: $scope,
			controllerAs: '$ctrl',
			resolve:
			{},
			controller: function($scope, $modalInstance)
			{
				$scope.save = function()
				{
					var post = {};
					post["value"] = $scope.value || '';
					post["title"] = $scope.title || '';
					post["name"] = $scope.name  || $scope.value;
					post["email"] = $scope.email || '';
					post["phoneNo"] = $scope.phoneNo || '';
					post["address"] = $scope.address || '';
					post["city"] = $scope.city || '';
					post["mobileNo"] = $scope.mobileNo || '';
					post["countryId"] = LoginService.store.c_country_id;
					post["gender"] = 'Male';
					post["dob"] = $scope.dob || '';
					post["custom1"] = $scope.custom1 || '';
					post["custom2"] = $scope.custom2 || '';
					post["custom3"] = $scope.custom3 || '';
					post["custom4"] = $scope.custom4 || '';
					post["notes"] = $scope.notes || '';
					post["postal"] = $scope.postal || '';
					post["emailreceipt"] = 'Y';
					
					//hack
					post["emailReceipt"] = 'true';
					
					
					if( $scope.value == undefined )
					{
						$scope.alert("Customer ID is required!");
						return;
					}
					
					if( $scope.name == undefined )
					{
						$scope.alert("Name is required!");
						return;
					}
					
					post = JSON.stringify(post);
					
					$scope.showModal();
					
					// call BP online service
					BPService.create(post).done(function(bp)
					{
						// created
						APP.BP.cache.insert(bp);
						$scope.selectedCustomer = bp;
						CustomerService.setCustomer(bp);
						$scope.$emit('new-customer-created', bp);
						
						$modalInstance.close();
						$scope.closeModal();
						
						$scope.info(I18n.t("customer")+" "+ bp.name +" "+ I18n.t("created"));
						
					}).fail(function(msg)
					{
						$scope.closeModal();
						// failed to create
						$scope.alert(msg);
					});
				};
				$scope.close = function()
				{
					$modalInstance.close();
				};
			}
		});
	};
	$scope.customerInfo = function()
	{
		var selectedCustomer = $scope.selectedCustomer;
		$modal.open(
		{
			templateUrl: '/html/popups/customer-info.html',
			size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				customer: function()
				{
					return selectedCustomer;
				}
			},
			controller: function($scope, $modalInstance, $http, customer)
			{
				$scope.customer = customer;
				
				var post = {};
				post['bpId'] = customer['c_bpartner_id'];
				post = JSON.stringify(post);
				
				var url = "/service/Loyalty/getLoyaltyInfo?json=" + post;
				
				$http.post(url).then(function(response)
				{
					//check for error
					if( response.data.error ){
						
						var error = response.data.error;
						return;
					}
					
					var loyaltyInfo = response.data;
					
					customer.enableloyalty = loyaltyInfo['enableLoyalty'];
					customer.loyaltypoints = loyaltyInfo['loyaltyPoints']; 
					customer.loyaltypointsearned = loyaltyInfo['loyaltyPointsEarned']; 
					customer.loyaltypointsspent = loyaltyInfo['loyaltyPointsSpent']; 
					customer.loyaltystartingpoints = loyaltyInfo['loyaltyStartingPoints'];
					
				}, function(error)
				{
					//$scope.status_message = error;
				});
			}
		});
	};
});
angular.module('app').controller('OrderScreenButtonsController', function($scope, $modal, $location, OrderService, OrderScreenService, CommissionService, ShoppingCartService, LoginService, CustomerService)
{
	// loadOrder
	$scope.loadOrder = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/load-order.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function( $scope, $modalInstance, LoginService )
			{
				$scope.stores = APP.STORE.searchStores({});				
				$scope.current_store_id = LoginService.terminal.ad_org_id;
				$scope.store_id = LoginService.terminal.ad_org_id;
				
				$scope.order_no = "";
				
				$scope.close = function()
				{
					$modalInstance.close();
				};
				$scope.load = function(orgId, documentNo)
				{
					var orders = APP.ORDER.searchOrders(
					{
						'documentNo': documentNo,
						'orgId' : orgId,
						
					});
					
					if (orders.length != 0)
					{
						var order = orders[0];
						if (order.docAction == 'DR')
						{
							$location.path("/order-screen").search(
							{
								"action": "invokeOrder",
								"uuid": order.uuid
							});
						}
						else
						{
							OrderService.setOrder(order);
							$location.path("/view-order");
						}
						$scope.close();
					}
					else
					{
						
						$scope.showModal();
						
						//search online
						var post = {};
	                	post["ad_org_id"] = orgId;
	                	post["documentno"] = documentNo;
	                	
	                	post = JSON.stringify(post);
	                	
	                	OnlineOrderService.invokeOrder(post).done(function(order){
	                		
	                		order.isOnline = true; // mark as online order
	                		
	                		OrderService.setOrder(order);
							$location.path("/view-order");
							
							$scope.close();
	                		
	                		
	                	}).fail(function(msg){
	                		
	                		$scope.alert(msg);
	                		
	                	}).always(function(){
	                		
	                		$scope.closeModal();
	                		
	                	});
						
						
						//$scope.alert('Order #' + documentNo + ' not found!');
					}
					
				};
				$scope.isValid = function()
				{
					var field = $scope.order_no || '';
					return field;
				};
			}
		});
	}; // loadOrder
	// Gift Card
	$scope.giftCard = function()
	{
		function addGiftProductToCart(product, amount)
		{
			var tax = APP.TAX.searchTaxes(
			{
				"isTaxExempt": true
			})[0]; /* tax exempt */
			var cart = ShoppingCartService.shoppingCart;
			var lineId = cart.lineCount++;
			var line = {
				"lineId": lineId,
				"product": product,
				"description": product.description,
				"qty": new BigNumber(1),
				"priceEntered": new BigNumber(amount),
				"tax": tax,
				"modifiers": [],
				"boms": [],
				"exchangeLine": false,
				"discountMessage": null,
				"discountAmt": new BigNumber(0),
				"lineAmt": new BigNumber(amount),
				"lineNetAmt": new BigNumber(amount),
				"taxAmt": new BigNumber(0),
				"baseAmt" : new BigNumber(amount),
				"calculateAmt": function() {},
				"getDiscountOnTotal" : function(){ return new BigNumber(0); },
				"getLineInfo" : function(){ return product.description; }
			};
			
			//validate cart for duplicates
			var lines = cart.getLines();
			for (var i = 0; i < lines.length; i++) {
				
				if( line['description'] == lines[i]['description'] )
				{
					$scope.alert('Cannot ' + line['description'] + ' more than once!');
					
					return;
				}				
			}			
			
			cart.addLine(line);
			cart.updateCart();
		}
		
		$modal.open(
		{
			templateUrl: '/html/popups/gift-card-transactions.html',
			size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, ShoppingCartService)
			{
				var orderType = ShoppingCartService.shoppingCart.orderType;
				$scope.isShoppingCartEmpty = ShoppingCartService.shoppingCart.isEmpty();
				$scope.isSales = ( orderType == 'POS Order' );
				
				// issue gift card popup
				$scope.issueGiftCardPopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/issue-gift-card.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = (($scope.card_no || '') && ($scope.amount || ''));
								return fields;
							};
							$scope.issueCard = function(card_no, amount)
							{
								var post = {};
								post["code"] = card_no; /* 8500000007976 */
								post["amount"] = amount;
								post["expiry"] = "";
								post = JSON.stringify(post);
								GiftCardService.issue(post).done(function(json)
								{
									$modalInstance.close();
									/*
									 * add
									 * line
									 * to
									 * cart
									 */
									var m_product_id = json["m_product_id"];
									var code = json["code"];
									var expiry = json["expiry"];
									var amount = json["amount"];
									var product = {
										"m_product_id": m_product_id,
										"name": "Issue Gift Card",
										"description": ("Issue Gift Card - " + code),
										"pricelist": new BigNumber(amount),
										"pricestd": new BigNumber(amount),
										"pricelimit": new BigNumber(amount),
										"c_uom_id": 100,
										"isgift": true
									};
									addGiftProductToCart(product, amount);
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
								// TODO add
								// action to
								// issue card
							};
						}
					});
				}; // issue gift card popup
				// reload gift card popup
				$scope.reloadGiftCardPopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/reload-gift-card.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = (($scope.card_no || '') && ($scope.amount || ''));
								return fields;
							};
							$scope.reloadCard = function(card_no, amount)
							{
								var post = {};
								post["code"] = card_no; /* 8500000007976 */
								post["amount"] = amount;
								post["expiry"] = "";
								post = JSON.stringify(post);
								GiftCardService.reload(post).done(function(json)
								{
									$modalInstance.close();
									/*
									 * add
									 * line
									 * to
									 * cart
									 */
									var m_product_id = json["m_product_id"];
									var code = json["code"];
									var expiry = json["expiry"];
									var amount = json["amount"];
									var product = {
										"m_product_id": m_product_id,
										"name": "Reload Gift Card",
										"description": ("Reload Gift Card - " + code),
										"pricelist": new BigNumber(amount),
										"pricelimit": new BigNumber(amount),
										"pricestd": new BigNumber(amount),
										"c_uom_id": 100,
									};
									addGiftProductToCart(product, amount);
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
								// TODO add
								// action to
								// issue card
							};
						}
					});
				}; // reload gift card popup
				// check gift card balance popup
				$scope.checkGiftCardBalancePopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/check-balance-gift-card.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.card_no || '');
								return fields;
							};
							$scope.checkBalanceGiftCard = function(card_no)
							{
								var post = {};
								post["cardNo"] = $scope.card_no; /* 8500000007976 */
								//post["cardCvv"] = $scope.card_cvv;
								post["cardCvv"] = '';
								post = JSON.stringify(post);
								GiftCardService.balance(post).done(function(response)
								{
									/*
									 * Show
									 * card
									 * balance
									 */
									$modal.open(
									{
										templateUrl: '/html/popups/gift-card-balance.html',
										// size:
										// 'sm',
										// scope
										// :
										// $scope,
										controllerAs: '$ctrl',
										controller: function($scope, $modalInstance)
										{
											$scope.accountnumber = response["accountnumber"];
											$scope.amount = response["amount"];
											$scope.balance = response["balance"];
											$scope.dateissued = response["dateissued"];
											$scope.expiry = response["expiry"];
											
											$scope.reloadedamount = response["reloadedamount"];
											$scope.reloadeddate = response["reloadeddate"];
											$scope.store = response["store"];
										},
									});
								}).fail(function(msg)
								{
									// failed
									// to
									// create
									$scope.alert(msg);
								});
								$modalInstance.close();
							};
						}
					});
				}; // check gift card balance popup
				
				//redeem gift card
				$scope.redeemGiftCardPopUp = function(){								

					$modalInstance.close();					
					$modal.open(
					{
						templateUrl: '/html/popups/redeem-gift-card.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.card_no || '');
								return fields;
							};
							
							$scope.redeemCard = function( card_no )
							{
								var post = {};
								post["code"] = card_no; /* */
								//post["cardCvv"] = $scope.card_cvv;
								post["cardCvv"] = '';
								
								post = JSON.stringify(post);
								
								$scope.showModal();
								
								GiftCardService.redeem(post).done(function(json)
								{
									$modalInstance.close();
									
									/* add line to cart */
			    					var m_product_id = json["m_product_id"];
			    					var code = json["code"];
			    					var amount = json["balance"];
			    					
			    					amount = new BigNumber(amount).negate();
			    					
			    					var product = {
			    							"m_product_id" : m_product_id,
			    							"name" : "Redeem Gift Card",
			    							"description" : ("Redeem Gift Card - " + code),
			    							"pricelist" : amount,
			    							"pricestd" : amount,
			    							"pricelimit" : amount,
			    							"c_uom_id" : 100,
			    							"isgift" : true
			    					}; 
			    					
			    					addGiftProductToCart(product, amount);									
									
									
								}).fail(function(msg)
								{
									$scope.alert(msg);
									
								}).always(function()
								{
									$scope.closeModal();
								});
							};
						}
					});				
					
				};//redeem gift card
				
				$scope.refundGiftCardPopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/refund-balance-gift-card.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.card_no || '');
								return fields;
							};
							$scope.refundGiftCardBalance = function(card_no)
							{
								var post = {};
								post["cardNo"] = $scope.card_no; /* 8500000007976 */
								//post["cardCvv"] = $scope.card_cvv;
								post["cardCvv"] = '';
								post = JSON.stringify(post);
								GiftCardService.refundBalance(post).done(function(json)
								{
									$modalInstance.close();
									
									/* add line to cart */
			    					var m_product_id = json["m_product_id"];
			    					var code = json["code"];
			    					var amount = json["balance"];
			    					
			    					amount = new BigNumber(amount);
			    					
			    					var product = {
			    							"m_product_id" : m_product_id,
			    							"name" : "Refund Gift Card",
			    							"description" : ("Refund Gift Card - " + code),
			    							"pricelist" : amount,
			    							"pricestd" : amount,
			    							"pricelimit" : amount,
			    							"c_uom_id" : 100,
			    							"isgift" : true
			    					}; 
			    					
			    					addGiftProductToCart(product, amount);									
									
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
								$modalInstance.close();
							};
						}
					});
				}; // check gift card balance popup
			}
		});
	}; // giftCard
	
	// Deposit
	$scope.deposit = function()
	{
		function addDepositProductToCart(product, amount)
		{
			var tax = APP.TAX.searchTaxes(
			{
				"isTaxExempt": true
			})[0]; /* tax exempt */
			var cart = ShoppingCartService.shoppingCart;
			var lineId = cart.lineCount++;
			var line = {
				"lineId": lineId,
				"product": product,
				"description": product.description,
				"qty": new BigNumber(1),
				"priceEntered": new BigNumber(amount),
				"tax": tax,
				"modifiers": [],
				"boms": [],
				"exchangeLine": false,
				"discountMessage": null,
				"discountAmt": new BigNumber(0),
				"lineAmt": new BigNumber(amount),
				"lineNetAmt": new BigNumber(amount),
				"taxAmt": new BigNumber(0),
				"baseAmt" : new BigNumber(amount),
				"calculateAmt": function() {},
				"getDiscountOnTotal" : function(){ return new BigNumber(0); },
				"getLineInfo" : function(){ return product.description; }
			};
			
			//validate cart for duplicates
			var lines = cart.getLines();
			for (var i = 0; i < lines.length; i++) {
				
				if( line['description'] == lines[i]['description'] )
				{
					$scope.alert('Cannot ' + line['description'] + ' more than once!');
					
					return;
				}				
			}			
			
			cart.addLine(line);
			cart.updateCart();
		}
		
		$modal.open(
		{
			templateUrl: '/html/popups/deposit-transactions.html',
			size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, ShoppingCartService)
			{
				var orderType = ShoppingCartService.shoppingCart.orderType;
				$scope.isShoppingCartEmpty = ShoppingCartService.shoppingCart.isEmpty();
				$scope.isSales = ( orderType == 'POS Order' );
				
				// issue deposit popup
				$scope.issueDepositPopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/issue-deposit.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.amount || '');
								return fields;
							};
							
							$scope.issueDeposit = function(amount)
							{
								var post = {};
								post["amount"] = amount;
								post = JSON.stringify(post);
								DepositService.issue(post).done(function(json)
								{
									$modalInstance.close();
									/*
									 * add
									 * line
									 * to
									 * cart
									 */
									var m_product_id = json["m_product_id"];
									var depositno = json["depositno"];
									var amount = json["amount"];
									var product = {
										"m_product_id": m_product_id,
										"name": "Issue Deposit",
										"description": ("Issue Deposit - " + depositno),
										"pricelist": new BigNumber(amount),
										"pricestd": new BigNumber(amount),
										"pricelimit": new BigNumber(amount),
										"c_uom_id": 100,
										"isdeposit": true
									};
									addDepositProductToCart(product, amount);
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
							};
						}
					});
				}; // issue deposit popup
				
				//redeem deposit
				$scope.redeemDepositPopUp = function(){								

					$modalInstance.close();					
					$modal.open(
					{
						templateUrl: '/html/popups/redeem-deposit.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.deposit_no || '');
								return fields;
							};
							
							$scope.redeemDeposit = function( deposit_no )
							{
								var post = {};
								post["depositno"] = deposit_no;
								
								post = JSON.stringify(post);
								
								$scope.showModal();
								
								DepositService.redeem(post).done(function(json)
								{
									$modalInstance.close();
									
									/* add line to cart */
			    					var m_product_id = json["m_product_id"];
			    					var depositno = json["depositno"];
			    					var amount = json["balance"];
			    					
			    					amount = new BigNumber(amount).negate();
			    					
			    					var product = {
			    							"m_product_id" : m_product_id,
			    							"name" : "Redeem Deposit",
			    							"description" : ("Redeem Deposit - " + depositno),
			    							"pricelist" : amount,
			    							"pricestd" : amount,
			    							"pricelimit" : amount,
			    							"c_uom_id" : 100,
			    							"isdeposit" : true
			    					}; 
			    					
			    					addDepositProductToCart(product, amount);									
									
									
								}).fail(function(msg)
								{
									$scope.alert(msg);
									
								}).always(function()
								{
									$scope.closeModal();
								});
							};
						}
					});				
					
				};//redeem deposit
				
				//refund deposit
				$scope.refundDepositPopUp = function()
				{
					$modalInstance.close();
					$modal.open(
					{
						templateUrl: '/html/popups/refund-deposit.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance)
						{
							$scope.isValid = function()
							{
								var fields = ($scope.deposit_no || '');
								return fields;
							};
							$scope.refundGiftCardBalance = function(deposit_no)
							{
								var post = {};
								post["depositno"] = $scope.deposit_no;
								post = JSON.stringify(post);
								DepositService.refund(post).done(function(json)
								{
									$modalInstance.close();
									
									/* add line to cart */
			    					var m_product_id = json["m_product_id"];
			    					var depositno = json["depositno"];
			    					var amount = json["balance"];
			    					
			    					amount = new BigNumber(amount).negate();
			    					
			    					var product = {
			    							"m_product_id" : m_product_id,
			    							"name" : "Refund Deposit",
			    							"description" : ("Refund Deposit - " + depositno),
			    							"pricelist" : amount,
			    							"pricestd" : amount,
			    							"pricelimit" : amount,
			    							"c_uom_id" : 100,
			    							"isdeposit" : true
			    					}; 
			    					
			    					addDepositProductToCart(product, amount);									
									
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
								$modalInstance.close();
							};
						}
					});
				}; // refund deposit popup
			}
		});
	}; // deposit
	
	$scope.openDrawer = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/open-cash-drawer.html',
			// size: 'lg',
			//scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, LoginService)
			{
				var terminal = LoginService.terminal;
				
				$scope.isValid = function()
				{
					var fields = (($scope.username || '') && ($scope.password || '') && ($scope.reason || ''));
					return fields;
				};
								
				$scope.openCashDrawer = function( username,password,reason )
				{
					//var USER = LoginService.user;
					var time = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");	
										
					var user = APP.USER.getUser( username, password );
					if (!user)
					{
						$scope.alert(I18n.t("invalid.username.password"));
						return;
					}
					
					// check if user
					// is active
					if (user.isactive == 'N')
					{
						$scope.alert(I18n.t("user.deactivated"));
						return;
					}	
										
					var post = {};
					post['action'] = "openDrawer";
					post['user_id'] = user.id;
					post['terminal_id'] = terminal.id;
					post['reason'] = reason;
					post['date_opened'] = time;
					post = JSON.stringify(post);
					jQuery.get("/system?json=" + post,
					{}, function(json, textStatus, jqXHR)
					{
						if (json == null || jqXHR.status != 200)
						{
							console.error("Failed to log open drawer!");
							return;
						}
						if (json.error)
						{
							console.error("Failed to log open drawer! " + json.error);
							return;
						}
					});
					PrinterManager.print([
						['OPEN_DRAWER']
					]);
					
					$modalInstance.close();
				};
			}
		});			
		
	};
	
	//more-options button
	$scope.moreOptions = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/order-screen/more-options-button-panel.html',
			//size: 'sm',
			scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{},
			controller: function($scope, $modalInstance, LoginService, ShoppingCartService)
			{
				var ctrl = this;
				
				ctrl.terminal = LoginService.terminal;
				
				var orderType = ShoppingCartService.shoppingCart.orderType;
				$scope.isSales = ( orderType == 'POS Order' );
				
				// Comment
				$scope.comment = function()
				{
					$modal.open(
					{
						templateUrl: '/html/popups/comment.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance, OrderScreenService)
						{
							this.previousComments = [];
							this.comments = OrderScreenService.comments || '';
							
							var refOrder = $scope.refOrder;
							
							if( refOrder && refOrder.comments )
							{
								this.previousComments = refOrder.comments;
							}
							
							this.addComment = function(comments)
							{
								OrderScreenService.comments = comments || '';								
								
								$modalInstance.close();
							};
							this.isValid = function()
							{
								var field = this.comments;
								return field;
							};
						}
					});
				}; // comment
				$scope.isCommentPresent = function()
				{
					return (OrderScreenService.comments != null && OrderScreenService.comments.length > 0);
				};
				// split order
				$scope.splitOrder = function()
				{
					if (CommissionService.amount <= 0) return;
					$modal.open(
					{
						templateUrl: '/html/popups/order-screen/split-order.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance, CommissionService)
						{
							this.isEqualMode = true;
							this.commissions = angular.copy(CommissionService.getCommissions());
							this.amount = CommissionService.amount;
							this.splitEqually = function()
							{
								var activeCount = 0;
								var commission, i;
								for (i = 0; i < this.commissions.length; i++)
								{
									commission = this.commissions[i];
									if (commission.active)
									{
										activeCount++;
									}
								}
								if (activeCount == 0)
								{
									$scope.alert(I18n.t("please.select.atleast.one.sales.rep"));
									return;
								}
								var share = new Number(this.amount / activeCount).toFixed(2);
								for (i = 0; i < this.commissions.length; i++)
								{
									commission = this.commissions[i];
									if (commission.active)
									{
										commission.amount = share;
									}
									else
									{
										commission.amount = 0;
									}
								}
								CommissionService.setCommissions(this.commissions);
								$modalInstance.close();
							};
							this.reset = function()
							{
								this.commissions = angular.copy(CommissionService.getCommissions());
							};
							// custom mode
							this.selected = [];
							this.setCustomMode = function()
							{
								this.selected = []; // selected
								// sales reps
								this.isEqualMode = false;
								var commission;
								for (i = 0; i < this.commissions.length; i++)
								{
									commission = this.commissions[i];
									if (commission.active)
									{
										commission.amount = 0;
										this.selected.push(commission);
									}
								}
							};
							this.getCustomTotal = function()
							{
								var total = 0;
								var commission;
								for (i = 0; i < this.selected.length; i++)
								{
									commission = this.selected[i];
									total += commission.amount;
								}
								return total;
							};
							this.resetCustom = function()
							{
								var commission;
								for (i = 0; i < this.selected.length; i++)
								{
									commission = this.selected[i];
									commission.amount = 0;
								}
							};
							this.getRemainder = function()
							{
								var remainder = this.amount - this.getCustomTotal();
								
								return new BigNumber(remainder).float();
							};
							this.setRemainder = function(commission)
							{
								if (commission.amount == 0)
								{
									commission.amount = this.getRemainder();
								}
							};
							this.customSplit = function()
							{
								CommissionService.setCommissions(this.commissions);
								$modalInstance.close();
							};
						}
					});
				}; // split order
				
				//redeem coupon	
				$scope.redeemCoupon = function(){
					
					function addCouponProductToCart(product, amount)
				    {
						var tax = APP.TAX.searchTaxes({"isTaxExempt":true})[0]; /* tax exempt */
				    	var cart = ShoppingCartService.shoppingCart;
						var lineId = cart.lineCount ++;						

						var line = {
								"lineId" : lineId,
								"product" : product,
								"description" : product.description,
								"qty" : new BigNumber(1),
								"priceEntered" : new BigNumber(amount),
								"tax" : tax,
								"modifiers" : [],
								"boms" : [],
								"exchangeLine" : false,   
								
								"discountMessage" : null,
								"discountAmt" : new BigNumber(0),
								"lineAmt" : new BigNumber(amount),
								"lineNetAmt" : new BigNumber(amount),
								"taxAmt" : new BigNumber(0),
								"baseAmt" : new BigNumber(amount),
								
								"calculateAmt" : function(){},
								"getLineInfo" : function(){ return product.description; }
						
						};
						
						//validate cart for duplicates
						var lines = cart.getLines();
						for (var i = 0; i < lines.length; i++) {
							
							if( line['description'] == lines[i]['description'] )
							{
								$scope.alert('Cannot Redeem ' + line['description'] + ' more than once!');
								
								return;
							}				
						}	
						
						cart.addLine(line);
						cart.updateCart();
				    }
					
					$modal.open({
				           templateUrl: '/html/popups/redeem-coupon.html',	           
				           //size: 'lg',
				           //scope : $scope,
				           controllerAs: '$ctrl',
				           controller: function( $scope, $modalInstance ){
				        	   
				        	   $scope.isValid = function(){
				        			
				        			var field = $scope.coupon_no || '';	        			
				        			return field;
				        		};
				        	   
				        	   
				        	   $scope.redeem = function( coupon_no ){
				        		   				        		   
				        		   var date =  DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
				        		   
				        		   var post = {};
				        			post["code"] = $scope.coupon_no;/**/
				        			post["date"] = date;
				        			
				        			post = JSON.stringify(post);
				        			
				        			$scope.showModal();
				        			
				        			CouponService.redeem(post).done(function(json){
				        				
				        				$modalInstance.close();
				        				
				        				/* add line to cart */
				    					var m_product_id = json["m_product_id"];
				    					var code = json["code"];
				    					var amount = json["amount"];
				    					
				    					if( json['ispercentage'] === true ){
				    						
				    						var cart = ShoppingCartService.shoppingCart;
				    						
				    						var grandTotal = cart.grandTotal;
				    						var percentage = amount;
				    						
				    						var amount = grandTotal.times(percentage).dividedBy( 100 );
				    						
				    						/* round to 2 d.p */
				    						amount = amount.toFixed(2);
				    						
				    					}
				    					
				    					amount = new BigNumber(amount).negate();
				    					
				    					var product = {
				    							"m_product_id" : m_product_id,
				    							"name" : "Coupon",
				    							"description" : ("Coupon - " + code),
				    							"pricelist" : amount,
				    							"pricestd" : amount,
				    							"pricelimit" : amount,
				    							"c_uom_id" : 100,
				    							"iscoupon" : true
				    					};      					
				    					
				    					addCouponProductToCart(product, amount);         				
				        				
				        				
				        			}).fail(function(msg){
				        				//failed to create
				        				$scope.alert(msg);
				        				
				        			}).always(function()
									{
										$scope.closeModal();
									});
				        		   
				        	   };	        	   
				        	   
				           }
			         });
				};//redeem coupon	
				
				//giftcard
				$scope.openGiftCard = function(){
					$scope.giftCard();
				};
				
				//deposit
				$scope.openDeposit = function(){
					$scope.deposit();
				};
				
				//change tax
				$scope.changeTax = function()
				{
					$modal.open(
					{
						templateUrl: '/html/popups/order-screen/change-tax.html',
						//size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						resolve:{},
						controller: function($scope, $timeout, $modalInstance, ShoppingCartService)
						{
							var shoppingCart = ShoppingCartService.shoppingCart;							
							var line = shoppingCart.getCurrentLine();
							
							var ctrl = this;
							
							ctrl.taxes = APP.TAX.cache({}).order('taxName').get();
							
							$timeout(function(){
								ctrl.tax_id = line.tax.id;
							});							
							
							ctrl.setTax = function(){
								
								var tax_id = this.tax_id;
								var tax = APP.TAX.getTaxById(tax_id);								
								
								line.tax = tax;
								line.calculateAmt();
								
								shoppingCart.updateCart();
								
								$modalInstance.close();
								
							};
							
						}
					});
				};
				
				//backdate order
				$scope.backdateOrder = function()
				{
					$modal.open(
					{
						templateUrl: '/html/popups/order-screen/backdate.html',
						//size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						resolve:{},
						controller: function($scope, $modalInstance, $timeout, OrderService)
						{
							var ctrl = this;
							var i;
							
							ctrl.dateList = [];
							for(i=1; i<=31; i++){
								
								ctrl.dateList.push(i < 10 ? ('0' + i) : ('' + i));								
							}
							
							ctrl.monthList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
							ctrl.monthId = ['01','02','03','04','05','06','07','08','09','10','11','12'];
							
							var date = new Date();
							var current_year = date.getFullYear();
							
							ctrl.yearList = [ current_year - 1, current_year];
							
							ctrl.hourList = [];
							for(i=0; i<=23; i++){
								
								ctrl.hourList.push(i < 10 ? ('0' + i) : ('' + i));								
							}

							ctrl.minuteList = [];
							for(i=0; i<=59; i++){
								
								ctrl.minuteList.push(i < 10 ? ('0' + i) : ('' + i));								
							}
							
							ctrl.ok = function(){
								
								OrderService.backdate = ctrl.year + '-' + ctrl.month + '-' + ctrl.date + ' ' + ctrl.hour + ':' + ctrl.minute + ':00'
																
								$modalInstance.close();
								
							};
							
							$timeout(function(){
								
								ctrl.date = date.getDate();
								ctrl.date = (ctrl.date < 10 ? ('0' + ctrl.date) : ('' + ctrl.date));
								
								ctrl.month = date.getMonth() + 1;
								ctrl.month = (ctrl.month < 10 ? ('0' + ctrl.month) : ('' + ctrl.month));
								
								ctrl.year = date.getFullYear();
								
								ctrl.hour = date.getHours();
								ctrl.hour = (ctrl.hour < 10 ? ('0' + ctrl.hour) : ('' + ctrl.hour));
								
								ctrl.minute = date.getMinutes();
								ctrl.minute = (ctrl.minute < 10 ? ('0' + ctrl.minute) : ('' + ctrl.minute));
								
							});
							
						}
					});
				};//backdate
				
				//show promotions	
				$scope.showPromotions = function(){
					
					var customer = CustomerService.current_customer;
					var c_bpartner_id = customer['c_bpartner_id'];
					var date = moment().format("YYYY-MM-DD");
					
					var post = {};
        			post["bpId"] = c_bpartner_id;/**/
        			post["date"] = date;
        			
        			post = JSON.stringify(post);
        			
        			$scope.showModal();
        			
        			PromotionService.getPromotionInfo(post).done(function(json){
        				
        				var promotionInfo = json;
        				
        				$modal.open({
 				           templateUrl: '/html/popups/order-screen/promotions.html',	           
 				           size: 'lg',
 				           //scope : $scope,
 				           resolve : {
 				        	   promotionInfo : function(){
 				        		   return promotionInfo;
 				        	   },
 				        	   
 				        	   customer : function(){
 				        		   return customer;
 				        	   }
 				           },
 				           controllerAs: '$ctrl',
 				           controller: function( $scope, $modalInstance, promotionInfo, customer ){
 				        	   
				        	  $scope.promotionInfo = promotionInfo;
				        	  $scope.customer = customer;
				        	  
				        	  var cart = ShoppingCartService.shoppingCart;	 				        		
				        	  var points = new BigNumber(promotionInfo.bp.loyaltyPoints);	 				        		
				        	  points = points.minus(cart.promotionPoints);
				        	  
				        	  $scope.pointsAvailable = points.float();
				        	  
				        	  $scope.formatDate = function(date){
				        		 return moment(date, "YYYY-MM-DD").format("DD-MMM-YYYY");
				        	  };				        	  
	 				        	 
 				        	 $scope.validate = function(promotion)
 				        	 {
 				        		 return ( $scope.pointsAvailable >= promotion.points );
 				        	 }
 				        	  
 				        	 function addPromotionProductToCart(promotion)
 				        	 {
 								var tax = APP.TAX.searchTaxes({"isTaxExempt":true})[0]; /* tax exempt */
 						    	var cart = ShoppingCartService.shoppingCart;
 								var lineId = cart.lineCount ++;	
 								
 								var amount = new BigNumber(promotion.amount).negate();
								var m_product_id = promotionInfo.product.m_product_id;
								 
								//create product
								var product = {
											"m_product_id" : m_product_id,
											"name" : "Redeem Promotion",
											"description" : promotion.description,
											"pricelist" : amount,
											"pricestd" : amount,
											"pricelimit" : amount,
											"c_uom_id" : 100,
											"ispromotion" : true,
											"points" : promotion.points
								};

 								var line = {
 										"lineId" : lineId,
 										"product" : product,
 										"description" : product.description,
 										"qty" : new BigNumber(1),
 										"priceEntered" : new BigNumber(amount),
 										"tax" : tax,
 										"modifiers" : [],
 										"boms" : [],
 										"exchangeLine" : false,   
 										
 										"discountMessage" : null,
 										"discountAmt" : new BigNumber(0),
 										"lineAmt" : new BigNumber(amount),
 										"lineNetAmt" : new BigNumber(amount),
 										"taxAmt" : new BigNumber(0),
 										"baseAmt" : new BigNumber(amount),
 										
 										"calculateAmt" : function(){},
 										"getLineInfo" : function(){ return product.description; },
 										
 										"u_promotion_id" : promotion['u_promotion_id'],
 										"earnloyaltypoints" : promotion['earnloyaltypoints']
 								
 								};
 								
 								
 								cart.addLine(line);
 								cart.updateCart();
 								
 						      }//function
 				        	  
 				        	  $scope.redeem = function( promotion ){ 
								 
								addPromotionProductToCart( promotion ); 				        		 
								 
								$modalInstance.close();
 				        		
 				        	 };   
 				        	 
 				           }
        				});
        				
        			}).fail(function(msg){
        				//failed to create
        				$scope.alert(msg);
        				
        			}).always(function()
					{
						$scope.closeModal();
					});				
					
				};//show promotions	
				
				$modalInstance.close();
				//TODO : to add the function for saveorder
			}
		});
	};//more-options button
	
	//search items
	$scope.searchItems = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/order-screen/search-items.html',
			//size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			resolve:{},
			controller: function($scope, $timeout, $modalInstance, ShoppingCartService)
			{	
				var $ctrl = this;
				
				$ctrl.searchItem = function(){
					
					var searchTerm = $ctrl.searchTerm;
					
					$scope.searchProduct(searchTerm);
					
					$modalInstance.close();
					
				};	
				
				$timeout(function(){
					document.getElementById("item_searched").focus();
				});
				
			}
		});
	};// search items
	
	$scope.clearCartConfirmation = function(){
		$scope.confirm("Do you want to clear order?", function(result){
			if(result == true){				
				$scope.reset(true);
			}			
		});	
	};//clearCartConfirmation
	
}); // OrderScreenButtonsController
// ClockInClockOutController
angular.module('app').controller('ClockInClockOutController', function($scope, $modal, CommissionService, ClockInOutService)
{
	$scope.displayClockInOutPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/clock-in-clock-out-panel.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, LoginService, CommissionService)
			{
				var $ctrl = this;
				var terminal_id = LoginService.terminal.id;
				var getClockedInUsers = function()
				{
					ClockInOut.getClockedInUsers(terminal_id).done(function(json)
					{
						var user_id, user;
						for (var i = 0; i < json.length; i++)
						{
							user_id = json[i]['user_id'];
							user = APP.USER.getUserById(user_id);
							json[i]['name'] = user['name'];
							json[i]['time_diff'] = moment(json[i]['time_in'], 'YYYY-MM-DD HH:mm:ss').fromNow();
						}
						$scope.$apply(function()
						{
							$ctrl.users = json;
							CommissionService.updateUsers(json);
							ClockInOutService.setClockedInUsers(json);
						});
					}).fail(function(msg){
        				//failed to create
        				$scope.alert(msg);
        				
        			});
				};
				getClockedInUsers();
				$scope.$on('clock-in', function(event, data)
				{
					getClockedInUsers();
				});
				$scope.$on('clock-out', function(event, data)
				{
					getClockedInUsers();
				});
				$ctrl.clockInUser = function()
				{
					$modal.open(
					{
						templateUrl: '/html/popups/clock-in-user.html',
						size: 'sm',
						scope: $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						controller: function($scope, $modalInstance, LoginService)
						{
							var terminal = LoginService.terminal;
							var $ctrl = this;
							$ctrl.clockIn = function()
							{
								// validate user
								var username = $ctrl.username;
								var password = $ctrl.password;
								var user = APP.USER.getUser(username, password);
								if (!user)
								{
									$scope.alert(I18n.t("invalid.username.password"));
									return;
								}
								// check if user
								// is active
								if (user.isactive == 'N')
								{
									$scope.alert(I18n.t("user.deactivated"));
									return;
								}
								var time = moment().format("YYYY-MM-DD HH:mm:ss");
								ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(msg)
								{
									$scope.$emit('clock-in', true);
									$modalInstance.close();
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
							};
						},
					});
				};
				$ctrl.clockOutUser = function(user)
				{
					$modal.open(
					{
						templateUrl: '/html/popups/clock-out-user.html',
						size: 'sm',
						scope: $scope,
						windowClass: 'topModal',
						resolve:
						{
							user: function()
							{
								return user;
							}
						},
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance, user, LoginService)
						{
							var terminal = LoginService.terminal;
							var $ctrl = this;
							$ctrl.username = user.name;
							$ctrl.clockOut = function()
							{
								var username = $ctrl.username;
								var password = $ctrl.password;
								var user = APP.USER.getUser(username, password);
								if (!user)
								{
									$scope.alert(I18n.t("invalid.username.password"));
									return;
								}
								var time =  DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
								ClockInOut.clockOut(terminal.id, user.ad_user_id, time).done(function(msg)
								{
									$scope.$emit('clock-out', true);
									$modalInstance.close();
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
							};
						},
					});
				};
			},
		});
	};
}); // ClockInClockOutController

//ProductInfoController
angular.module('app').controller('ProductInfoController', function($scope, $modal, ProductService)
{
	$scope.displayProductInfoPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/product-info-popup-panel.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, ProductService)
			{
				var $ctrl = this;
				
				$ctrl.getProductInfo = function(searchTerm)
				{
					if (jQuery("#product-info-textfield").val() == null || jQuery("#product-info-textfield").val() == "") 
					{
						$scope.alert(I18n.t("please.enter.product.name.or.barcode"), function(){
							jQuery("#product-info-textfield").select();
						});
						return;
					}
					else
					{
						var results = ProductService.search(searchTerm, 20);
						// no match
						if (results.length == 0)
						{
							$scope.alert(I18n.t("no.product.found"), function(){
								jQuery("#product-info-textfield").select();
							});
							return;
						}
						
						/*
						else if (results.length == 1)
						{
							for (var i = 0; i < results.length; i++)
							{
								$modalInstance.close();
								
								$ctrl.showProductInfo(results[i]);
							}
						}
						*/
						else
						{
							/*
							$scope.alert(I18n.t("refined.product.search"), function(){
								jQuery("#product-info-textfield").select();
							});
							return;
							*/
						}
						
						$ctrl.productInfoSearchTerm = "";
						
						$ctrl.results = results;
					}
				};
				
				
				$ctrl.showProductInfo = function(product)
				{
					//$modalInstance.close();
					
					if ( product.isgift || product.iscoupon || product.ispromotion )
					{
						return;
					};
					
					$modal.open(
					{
						templateUrl: '/html/popups/product-info.html',
						size: 'lg',
						// scope : $scope,
						windowClass: 'topModal',
						controllerAs: '$ctrl',
						resolve:
						{
							product: function()
							{
								return product;
							}
						},
						controller: function($scope, $http, $modalInstance, product, LoginService)
						{
							$scope.product = product;
							$scope.stocks = [];
							
							/*discount code*/
							var discountcodes = product.discountcodes || "{}";
							discountcodes = discountcodes.substr(1, discountcodes.length - 2);
							
							var array = [];
							
							if(discountcodes.length > 0){
								array = discountcodes.split(",");
							}					
							
							var store = LoginService.store;
							var discountCodeList = store['discountCodes'];
							
							var u_pos_discountcode_id, discountCode;
							var codes = [];
							
							for(var i=0; i<discountCodeList.length; i++){
								
								discountCode = discountCodeList[i];
								u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
								
								if( array.indexOf(u_pos_discountcode_id + '') >= 0 ){
									codes.push(discountCode);
								}						
							}
							
							$scope.discountCodes = codes;
							
							$scope.status_message = "Loading ...";
											
							$scope.close = function()
							{
								$modalInstance.close();
							};
							
							var post = {};
							post['m_product_id'] = product['id'];
							post = JSON.stringify(post);
							
							var url = "/service/Product/stock?json=" + post;
							
							$http.post(url).then(function(response)
							{
								//check for error
								if( response.data.error ){
									
									$scope.status_message = response.data.error;
									return;
								}
								
								$scope.stocks = response.data;
								$scope.status_message = "";
								
							}, function(error)
							{
								$scope.status_message = error;
							});
						}
					});
				};	
			},
		});
	};
}); // ProductInfoController


app.service('OrderScreen', function()
{
	var service = this;
	service.clear = function()
	{
		this.cart = new ShoppingCart('POS Order');
	};
	service.loadOrder = function(order)
	{
		this.order = order;
	};
	service.saveOrder = function() {};
	service.checkOutOrder = function() {};
	// comments
	service.addComment = function(comment)
	{
		this.comments.push(comment);
	};
	service.clear();
	//
});
angular.module('app').controller("LoginController", function($scope, $location, $window, $timeout, LoginService, CommissionService)
{
	$scope.closeModal();
	
	var ctrl = this;
	// Hard code user
	ctrl.username = '';
	ctrl.password = '';
	
	ctrl.store = LoginService.store;
	ctrl.terminal = LoginService.terminal;
	
	ctrl.logUser = function( terminal, user ){
		
		var role = APP.ROLE.getRoleById(user.ad_role_id);
		LoginService.user = user;
		LoginService.role = role;
		LoginService.terminal = terminal;
		
		var login = {};
		login.terminal_id = terminal.id;
		login.user_id = user.id;
		localStorage.setItem( '#LOGIN-DETAILS', JSON.stringify(login) );
		
		$timeout(function()
		{
			$location.path("/second-splash");
		});
		
		
	};
		
	ctrl.terminalList = []; 
	
	
	ctrl.renderTerminalList = function( store ){	
		
		var terminals = APP.TERMINAL.searchTerminals({ "ad_org_id" : {'==':store.ad_org_id }});
		ctrl.terminalList = terminals;
		ctrl.terminal = null;
	};
	
	
	
	ctrl.exit = function(){
		
		if($window.PosteritaBrowser){
			
			$window.PosteritaBrowser.exit2();
			
		}
		
		if(isNodeApp){
			
			var remote = require('electron').remote;
			var window = remote.getCurrentWindow();
			window.close();
		}
		
	};
	
	ctrl.login = function()
	{
		var username = ctrl.username;
		var password = ctrl.password;
		var terminal = ctrl.terminal;
		
		if(!terminal)
		{
			$scope.alert("Choose a terminal");
			return false;
		}
		
		var user = APP.USER.getUser(username, password);
		if (!user)
		{
			$scope.alert(I18n.t("invalid.username.password"));
			return false;
		}
		// check if user is active
		if (user.isactive == 'N')
		{
			$scope.alert(I18n.t("user.deactivated"));
			return false;
		}
		
		this.logUser( terminal, user );
		
		
	};	
	
});

angular.module('app').controller("SecondSplashController", function($scope, $location, $timeout, $http, LoginService, CustomerService, CommissionService, ClockInOutService){	

	var store = LoginService.store;
	var terminal = LoginService.terminal;
	var user = LoginService.user;
	var role = LoginService.role;	
	
	var c_bpartner_id = terminal['c_bpartner_id'];
	
	$http.get('/json/bp/' + c_bpartner_id ).then(function(response){			
		var customer = response.data;
		CustomerService.setDefaultCustomer( customer );			
	});
	
	var time =  DateUtils.getCurrentDate(); // moment().format("YYYY-MM-DD
											// HH:mm:ss");
	ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(json)
	{
		var user_id, user;
		for (var i = 0; i < json.length; i++)
		{
			user_id = json[i]['user_id'];
			user = APP.USER.getUserById(user_id);
			json[i]['name'] = user['name'];
			json[i]['time_diff'] = moment(json[i]['time_in'], 'YYYY-MM-DD HH:mm:ss').fromNow();
		}
		CommissionService.setActive( LoginService.user.ad_user_id );
		CommissionService.updateUsers(json);
		ClockInOutService.setClockedInUsers(json);
		
		// check till
		Till.isOpen(terminal.id).done(function(response)
		{
			$scope.closeModal();
			var isopen = response["isopen"];
			var path;
			if (isopen == true)
			{
				/*
				 * forward to order-screen
				 */
				path = "/menu";
			}
			else
			{
				/*
				 * forward to open-till
				 */
				path = "/open-till";
			}
			
			$timeout(function()
			{
				$location.path(path);
			});
			
		}).fail(function(msg)
		{
			$scope.alert(msg);
		});
	}).fail(function(msg)
	{
		$scope.alert(msg);
	});
	
});

angular.module('app').controller("SplashController", function($scope, $location, $timeout, LoginService, CustomerService)
{
	$scope.showModal();
	APP.initCache().done(function()
	{
		// 1.check store and terminal
		var info = localStorage.getItem("#STORE-TERMINAL-DETAILS");
		if( info == null){
			
			$timeout(function()
			{
				$location.path("/terminal");
				$scope.closeModal();
			});
			
		}
		else
		{
			info = JSON.parse( info );
			
			var store_id = info.store_id;
			var terminal_id = info.terminal_id;
			
			var store = APP.STORE.getStoreById( store_id );
			var terminal = APP.TERMINAL.getTerminalById( terminal_id );
			
			LoginService.store = store;	
			LoginService.terminal = terminal;
			
			// 2.check login details
			var login = localStorage.getItem("#LOGIN-DETAILS");
			
			if( login != null ){
				
				login = JSON.parse( login );
				var user_id = login.user_id;
				
				var user = APP.USER.getUserById(user_id);
				var role = APP.ROLE.getRoleById(user.ad_role_id);
				
				LoginService.user = user;
				LoginService.role = role;
				
				$timeout(function(){
					$location.path("/second-splash");
					$scope.closeModal();
				});
				
				
			}
			else
			{
				$timeout(function(){
					$location.path("/login");
					$scope.closeModal();
				});
				
			}
			
		}
				
		
	}).fail(function(msg){
		// failed to create
		$scope.alert(msg);
		
	}).always(function()
	{
		$scope.closeModal();
	});
});

angular.module('app').controller("TerminalController", function( $scope, $modal, $window, $location, $timeout, LoginService ){
	
	var ctrl = this;
	
	ctrl.terminalList = []; 
	
	ctrl.storeList = APP.STORE.searchStores({});	
	
	ctrl.renderTerminalList = function( store ){	
		
		var terminals = APP.TERMINAL.searchTerminals({ "ad_org_id" : {'==':store.ad_org_id }});
		ctrl.terminalList = terminals;
		ctrl.terminal = null;
	};	
	
	
	ctrl.exit = function(){
		
		if($window.PosteritaBrowser){
			
			$window.PosteritaBrowser.exit2();			
		}	
		/*
		 * var remote = require('electron').remote; var window =
		 * remote.getCurrentWindow(); window.close();
		 */
		
		/*
		var isNodeApp = !!window.process;
		if(isNodeApp){
			
			var remote = require('electron').remote;
			var window = remote.getCurrentWindow();
			window.close();
		}
		*/
		
	};
	
	ctrl.isValid = function(){
		
		return ( ctrl.store != null && ctrl.store != ""
				&& ctrl.terminal != null && ctrl.terminal != "" );
		
	};
	
	ctrl.ok = function(){
		
		LoginService.store = ctrl.store;
		LoginService.terminal = ctrl.terminal;
		
		var details = {};
		details.store_id = ctrl.store.id;
		details.terminal_id = ctrl.terminal.id;
		
		details = JSON.stringify( details );
		
		localStorage.setItem("#STORE-TERMINAL-DETAILS", details);			
		
		$timeout(function()
		{
			$location.path("/login");
		});
		
	};
	
});

angular.module('app').controller("TillController", function($scope, $modal, $location, $timeout, LoginService)
{
	var TERMINAL = LoginService.terminal;
	var ctrl = this;
	var path = $location.path();
	if (path == '/open-till')
	{
		ctrl.amount = TERMINAL["floatamount"];		
	}
	else
	{
		$scope.showModal();
		var terminal_id = TERMINAL["u_posterminal_id"];	
		
		var preference = TERMINAL["preference"];
		
		ctrl.countExtCard = true;		
		
		if( preference.hasOwnProperty("countExtCardAmount") )
		{
			ctrl.countExtCard = preference["countExtCardAmount"];
		}
		
		Till.getTenderAmounts(terminal_id).done(function(json)
		{
			ctrl.tenderAmounts = json;
			
		}).fail(function(msg)
		{
			$scope.alert(msg);
		}).always(function()
		{
			$scope.closeModal();
		});
	}
	
	//hide menu from header
	ctrl.hideMenu = function(){
		jQuery("#menu-dropdown").hide();
	};
	
	ctrl.openTill = function()
	{
		var USER = LoginService.user;
		var user_id = USER["ad_user_id"];
		var terminal_id = TERMINAL["u_posterminal_id"];
		var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
		var cash_amount = ctrl.amount;
		if (cash_amount == null)
		{
			$scope.alert("Please enter cash amount", function()
			{
				$('#cash-amount').select();
			});
			return;
		}
		Till.open(terminal_id, user_id, date, cash_amount).done(function(json)
		{
			// P4-275 print receipt when opening till
			Till.printOpenReceipt(json);
			
			$scope.$apply(function()
			{
				$location.path('/menu');
			});
		}).fail(function(msg)
		{
			$scope.alert(msg);
		});
	};
	ctrl.closeTill = function()
	{
		$scope.confirm("Do you want to close till?", function(result){
			
			if(result == false) return;
			
			var USER = LoginService.user;
			var user_id = USER["ad_user_id"];
			var terminal_id = TERMINAL["u_posterminal_id"];
			var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
			var cash_amount = ctrl.amount;
			var external_card_amount = ctrl.externalCardAmount;
			
			if (cash_amount == null)
			{
				$scope.alert(I18n.t("please.enter.cash.amount"), function()
				{
					$('#cash-amount').select();
				});
				return;
			}
			
			if (external_card_amount == null)
			{
				external_card_amount = 0;
			}
			
			if( !ctrl.countExtCard )
			{
				external_card_amount = ctrl.tenderAmounts.ext_card;
			}
			
			Till.close(terminal_id, user_id, date, cash_amount, external_card_amount).done(function(json)
			{
				Till.printReceipt(json);
				
				//Improvement P4-338 To print two receipt
				// client wongtooyuen does not want duplicate printing
				if( TERMINAL["ad_client_id"] != 10006177 ){
					
					Till.printReceipt(json);
				}				
				
				$scope.info(I18n.t("you.have.successfully.closed.your.till"), function(){
					
					ClockInOut.clockOutAll(terminal_id, date).done(function(msg) {
						
					    $scope.info(msg);
					    
					}).fail(function(msg) {	
						
						$scope.alert(msg);
						
					}).always(function(){
						
						$scope.$apply(function()
						{
							//logout active user							
							localStorage.removeItem('#LOGIN-DETAILS');
							
							$location.path('/login');
						});
						
					});
					
				});
				
				
			}).fail(function(msg)
			{
				$scope.alert(msg);
			});
			
		});		
		
	};
	ctrl.openDrawer = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/open-cash-drawer.html',
			// size: 'lg',
			//scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				$scope.isValid = function()
				{
					var fields = (($scope.username || '') && ($scope.password || '') && ($scope.reason || ''));
					return fields;
				};
								
				$scope.openCashDrawer = function( username,password,reason )
				{
					//var USER = LoginService.user;
					var time = moment().format("YYYY-MM-DD HH:mm:ss");	
										
					var user = APP.USER.getUser( username, password );
					if (!user)
					{
						$scope.alert(I18n.t("invalid.username.password"));
						return;
					}
					
					// check if user
					// is active
					if (user.isactive == 'N')
					{
						$scope.alert(I18n.t("user.deactivated"));
						return;
					}	
										
					var post = {};
					post['action'] = "openDrawer";
					post['user_id'] = user.id;
					post['terminal_id'] = TERMINAL.id;
					post['reason'] = reason;
					post['date_opened'] = time;
					post = JSON.stringify(post);
					jQuery.get("/system?json=" + post,
					{}, function(json, textStatus, jqXHR)
					{
						if (json == null || jqXHR.status != 200)
						{
							console.error("Failed to log open drawer!");
							return;
						}
						if (json.error)
						{
							console.error("Failed to log open drawer! " + json.error);
							return;
						}
					});
					PrinterManager.print([
						['OPEN_DRAWER']
					]);
					
					$modalInstance.close();
				};
			}
		});		
	};
	
	ctrl.denomination = {
			note_2000 : 0,
			note_1000 : 0,
			note_500 : 0,
			note_200 : 0,
			note_100 : 0,
			note_50 : 0,
			note_25 : 0,
					
			coin_20 : 0,
			coin_10 : 0,
			coin_5 : 0,
			coin_1 : 0,
			coin_050 : 0,
			coin_020 : 0,
			coin_005 : 0,
			
			getTotal : function(){
				var total = 0;						
				
				total += this.note_2000 * 2000;
				total += this.note_1000 * 1000;
				total += this.note_500 * 500;
				total += this.note_200 * 200;
				total += this.note_100 * 100;
				total += this.note_50 * 50;
				total += this.note_25 * 25;
				
				total += this.coin_20 * 20;
				total += this.coin_10 * 10;
				total += this.coin_5 * 5;
				total += this.coin_1 * 1;
				total += this.coin_050 * 0.50;
				total += this.coin_020 * 0.20;
				total += this.coin_005 * 0.05;
				
				return total;
			}
	};
	ctrl.showDenominationPopup = function(){		
		
		$modal.open(
			{
				templateUrl: '/html/popups/till-denomination.html',
				// size: 'lg',
				//scope : $scope,
				controllerAs: '$ctrl',
				resolve:
				{
					denomination: function()
					{
						return ctrl.denomination;
					}
				},
				controller: function($scope, $modalInstance, denomination)
				{
					$scope.denomination = denomination;
					
					$scope.getTotal = function(){
						
						$scope.denomination.getTotal();
					};

					$scope.confirmDenomination = function()
					{
						ctrl.amount = $scope.denomination.getTotal();
						
						$modalInstance.close();
					};
					
					$scope.close = function()
					{
						$modalInstance.close();
					};
				}
		});
	};
	
	ctrl.saveCashierControl = function()
	{
		$scope.confirm("Do you want to save cashier control data?", function(result){
			
			if(result == false) return;
			
			var USER = LoginService.user;
			var user_id = USER["ad_user_id"];
			var terminal_id = TERMINAL["u_posterminal_id"];
			var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
			var cash_amount = ctrl.amount;
			var external_amount = ctrl.externalCardAmount;
			
			if (cash_amount == null)
			{
				$scope.alert(I18n.t("please.enter.cash.amount"), function()
				{
					$('#cash-amount').select();
				});
				return;
			}
			
			Till.saveCashierControlSheet(terminal_id, user_id, date, cash_amount, external_amount).done(function(json)
			{
				Till.printCashierControlReceipt(json);
				$scope.info(I18n.t("cashier.control.data.successfully.saved"));
				
				$scope.$apply(function()
				{
					$location.path('/menu');
				});
			}).fail(function(msg)
			{
				$scope.alert(msg);
			});
		});
	};
});

angular.module('app').controller("MainController", function($scope, $location, LoginService, CommissionService, ClockInOutService) {
	
	hotkeys('ctrl+alt+p', function(){ 
		
		var serverPrint  = localStorage.getItem('print-via-server');
		
		if( serverPrint != null && serverPrint == 'Y'){
			serverPrint = 'N';
		}
		else
		{
			serverPrint = 'Y';
		}
		
		localStorage.setItem('print-via-server', serverPrint);
		
		$scope.info('print-via-server -> ' + serverPrint );
			
	});
	
	hotkeys('ctrl+alt+c', function(){ 
		
		var couponPrint  = localStorage.getItem('print-coupon');
		
		if( couponPrint != null && couponPrint == 'Y'){
			couponPrint = 'N';
		}
		else
		{
			couponPrint = 'Y';
		}
		
		localStorage.setItem('print-coupon', couponPrint);
		
		$scope.info('print-coupon -> ' + couponPrint );
			
	});
	
	//PosteritaBrowser
		
	$scope.requestPin = function(callback){
		
		$scope.pin(function(pin){
			
			//validate PIN			
			var user = APP.USER.getUserByPin(pin);						
			
			if(user == null){
				alert("Invalid PIN!");
			}
			else
			{
				var role = APP.ROLE.getRoleById(user.ad_role_id);
				
				//check if clock in
				if( ClockInOutService.isUserClockedIn( user.ad_user_id ) ){							
					
					LoginService.user = user;
					LoginService.role = role;
					CommissionService.setActive(user.ad_user_id);
					
					callback(user, role);					
				}
				else
				{
					alert("User not clocked-in!");
				}				
				
			}
			
		});
		
	};
	
	$scope.validatePath = function(path){
		
		$scope.requestPin(function(){
			$location.path(path);
		});		
	};
		
});

angular.module('app').controller("CommissionController", function($rootScope, $scope, CommissionService)
{
	var ctrl = this;
	ctrl.getCommissions = function()
	{
		return CommissionService.getCommissions();
	}
	ctrl.setActiveSalesRep = function(user_id)
	{
		CommissionService.setActive(user_id);
		
		//set salesrep for cartline
		$rootScope.$broadcast('sales-rep-change', user_id);
	};
});
// RequestSupportController
angular.module('app').controller('RequestSupportController', function($scope, $modal)
{
	$scope.displayRequestSupportPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/request-support.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				var $ctrl = this;
				$ctrl.sendRequest = function()
				{
					var post = {};
					post["email"] = $ctrl.email;
					post["description"] = $ctrl.description;
					post = JSON.stringify(post);
					SupportService.request(post).done(function(json)
					{
						if (json.sent == true)
						{
							$scope.info(I18n.t("your.request.was.successfully.sent"));
						}
						else
						{
							$scope.alert(I18n.t("failed.to.process.your.request"));
						}
					}).fail(function(msg)
					{
						$scope.alert(msg);
					});
					$modalInstance.close();
				};
			},
		});
	};
}); // RequestSupportController

angular.module('app').controller("OrderHistoryController", function($scope, $modal, $location, $window, $http, OrderService)
{
	var ctrl = this;
	ctrl.customers = APP.BP.getCustomers({});
	ctrl.salesReps = APP.USER.searchUsers({});
	
	$scope.params = {				
		dateFrom : "",
		dateTo : "",
		documentNo : "",
		customerId : "",
		salesRepId : "",
		paymentRule : "",
		docStatus: "",
		date1: null,
		date2: null
	};
	
	$scope.getParameter = function(name){
		
		return $scope.params[name];
		
	};

	$scope.renderReport = function(){
		
		$scope.report = jQuery('#order_table').DataTable({
			
			"bServerSide": true,
			"sPaginationType": "full_numbers",
			"searching": false,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,
			
			"fnServerParams": function(aoData) {
				aoData.push({
					"name": "dateFrom",
					"value": $scope.getParameter("dateFrom")
				}); //date from
				aoData.push({
					"name": "dateTo",
					"value": $scope.getParameter("dateTo")
				}); //date to
				aoData.push({
					"name": "documentNo",
					"value": $scope.getParameter("documentNo")
				}); //document no
				aoData.push({
					"name": "customerId",
					"value": $scope.getParameter("customerId")
				}); //customer
				aoData.push({
					"name": "salesRepId",
					"value": $scope.getParameter("salesRepId")
				}); //salesrep
				aoData.push({
					"name": "paymentRule",
					"value": $scope.getParameter("paymentRule")
				}); //payment rule
				aoData.push({
					"name": "docStatus",
					"value": $scope.getParameter("docStatus")
				}); //doc status
			},

			"sAjaxSource": "/orderHistory",

			"fnPreDrawCallback": function() {},
			"columns": [
				{
					"data": "dateOrdered"
				},
				{
					"data": "orderType"
				},
				{
					"data": "documentNo"
				},
				{
					"data": "docAction"
				},
				{
					"data": "bpName"
				},
				{
					"data": "tenderType"
				},
				{
					"data": "grandTotal"
				}
		   		  ],
			"columnDefs": [
				{
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					},

				{
					"render": function(data, type, row) {
						
						var order = row;
						var info = order['commandInfo'];
						
						if(info){
							
							if(info['type'] == 'D'){
								return "Table #" + info['tableId'];
							}
							else
							{
								return "Take-Away #" + info['takeAwayId'];
							}
							
						}
						else
						{
							if (data == "POS Order") {
								return "Sales";
							} else {
								return "Return";
							}
						}						

					},
					"targets": 1
					},

				{
					"render": function(data, type, row) {

						var status = row["status"];
						var uuid = row["uuid"];
						
						var html = "<a href='javascript:void(0);' onclick='$$viewOrder(\"" + uuid + "\")'>" + data + "</a>";

						if (status == 'DR' || status == 'IP') {
							html += '<img src="../../images/offline/icon_inqueue.gif" title="Queued">';
						}

						if (status == 'CO') {
							html += '<img src="../../images/offline/icon_success.gif" title="Synchronized">';
						}

						if (status == 'ER') {
							html += '<img src="../../images/offline/icon_error.gif" title="' + row.errormsg + '">';
						}

						return html;

					},
					"targets": 2
					},

				{
					"render": function(data, type, row) {
						return {
							'CO': 'Completed',
							'DR': 'Drafted',
							'VO': 'Voided'
						}[data];
					},
					"targets": 3
					}
		   		  ]
		});		
		
	};
	
	$window.$$viewOrder = function( uuid ){
		
		/*
		$scope.showModal();
		
		$http.get('/json/orders/' + uuid).then( function( response ){
			
			var order = response.data;
			
			OrderService.setOrder(order);
			$location.path("/view-order");
			
			$scope.closeModal();
			
		}, function(){
			
			$scope.closeModal();
			
			$scope.alert("Failed to load order!");
			
		});
		*/
		
		$scope.showModal();
		
		$location.path("/view-order").search({
			"uuid" : uuid
		});
		
	};

	$scope.renderReport();	
	$scope.reloadReport = function(params){
		$scope.params = params;
		$scope.report.ajax.reload();
	};
	
	
	$scope.showSearchDialog = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/search-order.html',
			//size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			resolve:{},
			controller: function($scope, $timeout, $modalInstance)
			{
				var ctrl = this;
				
				ctrl.opened1 = false;
				ctrl.open1 = function(e) {
				    e.stopPropagation ();
				    this.opened1 = true;
				}
				
				ctrl.opened2 = false;
				ctrl.open2 = function(e) {
				    e.stopPropagation ();
				    this.opened2 = true;
				}
				
				ctrl.reset = function(){
					
					$scope.params = {				
							dateFrom : "",
							dateTo : "",
							documentNo : "",
							customerId : "",
							salesRepId : "",
							paymentRule : "",
							docStatus: "",
							date1: null,
							date2: null
						};
				};
				
				ctrl.search = function(){
					
					if($scope.params.date1 != null){
						
						$scope.params.dateFrom = moment($scope.params.date1).format("YYYY-MM-DD");
						$scope.params.date1 = $scope.params.dateFrom;
						
					}
					else
					{
						$scope.params.dateFrom = "";
					}
					
					if($scope.params.date2 != null){
						
						$scope.params.dateTo = moment($scope.params.date2).format("YYYY-MM-DD");
						$scope.params.date2 = $scope.params.dateTo;
					}
					else
					{
						$scope.params.dateTo = "";
					}
					
					if($scope.params.customer != null){
						$scope.params.customerId = $scope.params.customer.id;
					}
					
					if($scope.params.salesRep != null){
						$scope.params.salesRepId = $scope.params.salesRep.id;
					}
					
					$scope.reloadReport($scope.params);
					
					$modalInstance.close();
				};
			}
		});
		
	};

});

angular.module('app').controller("ExchangeOrderController", function($scope, $modal, $location, $window, ProductService, OrderService, TableService){
		
	var ctrl = this;
	ctrl.customers = APP.BP.searchBPartners({});
	ctrl.stores = APP.STORE.searchStores({});
	
	$scope.params = {				
		dateFrom : "",
		dateTo : "",
		customerId : "",
		salesRepId : "",
		paymentRule : "",
		docStatus: "",
		date1: null,
		date2: null,
		adOrgId : "",
		barcode : ""
	};
	
	$scope.getParameter = function(name){
		
		return $scope.params[name];
		
	};

	$scope.renderReport = function(){
		
		$scope.report = jQuery('#order_table').DataTable({
			
		    "sPaginationType": "full_numbers",
		    "searching": false,
		    "ordering": false,
		    "lengthChange": false,
		    "pageLength": 12,
		    "data": [],
		    
		    "columns": 
		    [
		      	{
		            "data": "dateordered"
		        },
		        {
		            "data": "ad_org_name"
		        },
		        {
		            "data": "documentno"
		        },
		        {
		            "data": "c_bpartner_name"
		        },
		        {
		            "data": "paymentrule"
		        },
		        {
		            "data": "grandtotal"
		        },
		        {
		            "data": "nooflines"
		        }
		    ],
		    
		    "columnDefs": 
		    [
		      	{
		            "render": function(data, type, row) {
		                return moment(data).format("DD-MMM-YYYY, HH:mm");
		            },
		            "targets": 0
		        },

		        {
		            "render": function(data, type, row) {

		                var ad_org_id = row["ad_org_id"];
		                var documentno = row["documentno"];

		                var html = "<a href='javascript:void(0);' onclick='invokeOrder$$(" + ad_org_id + ",\"" + documentno + "\")'>" + data + "</a>";
		                
		                return html;

		            },
		            "targets": 2
		        },
		        
		        {
		            "render": function(data, type, row) {
		            	
		            	return {
							'B': 'Cash',
							'K': 'Card',
							'S': 'Cheque',
							'P': 'On Credit',
							'M': 'Mixed',
							'V': 'Voucher',
							'E': 'Ext Card',
							'G': 'Gift Card',
							'L': 'Loyalty'
						}[data];
		            },
		            "targets": 4
		        },
		        
		        {
		            "render": function(data, type, row) {
		                return new Number(data).toFixed(2);
		            },
		            "targets": 5
		        },
		    ]
		});
		
		$scope.showSearchDialog();
		
		//attach invokeOrder method to window		
		$window.invokeOrder$$ = function( ad_org_id, documentno ){
			
			$scope.showModal();
			
			//search online
			var post = {};
        	post["ad_org_id"] = ad_org_id;
        	post["documentno"] = documentno;
        	
        	post = JSON.stringify(post);
        	
        	OnlineOrderService.invokeOrder(post).done(function(order){
        		
        		order.isOnline = true; // mark as online order       		
        		
        		OrderService.setOrder(order);
				$location.path("/view-order");
				        		
        		
        	}).fail(function(msg){
        		
        		$scope.alert(msg);
        		
        	}).always(function(){
        		
        		$scope.closeModal();
        		
        	});
		};
		
	};
	

	$scope.reloadReport = function(params){
		
		
		//search online
		var post = {};
    	post["ad_org_id"] = params["adOrgId"] || 0;
    	post["m_product_id"] = params["m_product_id"] || 0;
    	post["c_bpartner_id"] = params["customerId"] || 0;
    	post["dateFrom"] = params["dateFrom"];
    	post["dateTo"] = params["dateTo"];
    	    	
    	post = JSON.stringify(post);
    	
    	$scope.showModal();
    	
    	OnlineOrderService.searchOrder(post).done(function(response){
    		
    		var table = $scope.report;
    		
    		table.clear(); //clear rows
    		
    		var orders = response.orders;
    		for(var i=0; i<orders.length; i++){
    			
    			table.row.add(orders[i]);
    		}
    		
    		table.draw();
    		
    		if(orders.length == 0){
    			$scope.alert("No order was found!");
    		}
    		
    	}).fail(function(msg){
    		
    		$scope.alert(msg);
    		
    	}).always(function(){
    		
    		$scope.closeModal();
    		
    	});	
    		
		
		
		//$scope.report.ajax.reload();
	};
	
	
	$scope.showSearchDialog = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/search-exchange-order.html',
			//size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			resolve:{},
			controller: function($scope, $timeout, $modalInstance)
			{
				var ctrl = this;
				
				ctrl.opened1 = false;
				ctrl.open1 = function(e) {
				    e.stopPropagation ();
				    this.opened1 = true;
				}
				
				ctrl.opened2 = false;
				ctrl.open2 = function(e) {
				    e.stopPropagation ();
				    this.opened2 = true;
				}
				
				ctrl.reset = function(){
					
					$scope.params = {				
							dateFrom : "",
							dateTo : "",
							documentNo : "",
							customerId : "",
							salesRepId : "",
							paymentRule : "",
							docStatus: "",
							date1: null,
							date2: null,
							adOrgId : "",
							barcode : ""
						};
				};
				
				ctrl.search = function(){
					
					if($scope.params.date1 != null){
						
						$scope.params.dateFrom = moment($scope.params.date1).format("YYYY-MM-DD");
						$scope.params.date1 = $scope.params.dateFrom;
						
					}
					else
					{
						$scope.params.dateFrom = "";
					}
					
					if($scope.params.date2 != null){
						
						$scope.params.dateTo = moment($scope.params.date2).format("YYYY-MM-DD");
						$scope.params.date2 = $scope.params.dateTo;
					}
					else
					{
						$scope.params.dateTo = "";
					}
					
					if($scope.params.customer != null){
						$scope.params.customerId = $scope.params.customer.id;
					}
					
					if($scope.params.product != null){
						$scope.params.productId = $scope.params.product.id;
					}
					
					if($scope.params.store != null){
						$scope.params.adOrgId = $scope.params.store.id;
					}
					
					
					//validate dates
			    	if($scope.params.dateFrom.length == 0 && $scope.params.dateTo.length == 0){
			    		$scope.alert("Date is required");
						return;
			    	}
			    	
			    	//validate product
			    	var barcode = $scope.params["barcode"];
					var m_product_id = 0;
					
					if(barcode.length > 0){
						
						var products = ProductService.search(barcode, 1);
						
						if( products.length == 0 || products[0].upc != barcode ){
							
							$scope.alert("Product for barcode[" + barcode + "] does not exists");
							return;
						}
						
						$scope.params["m_product_id"] = products[0].m_product_id;
					}
					
					$scope.reloadReport($scope.params);
					
					$modalInstance.close();
				};
			}
		});
		
	};
		
	$scope.renderReport();

});

//ClockInClockOutReportController
angular.module('app').controller("ClockInClockOutReportController", function($scope, $modal)
{
	var ctrl = this;
	jQuery.get('/json/CLOCK_IN_OUT',
	{
		json:{}
	}, function(json, textStatus, jqXHR)	
	{
		
		var terminal = null;		
		var records = [];
		
		for(var i=0; i<json.length; i++){
			
			terminal = APP.TERMINAL.getTerminalById(json[i]['terminal_id']);
			
			if(terminal == null) continue;
			
			json[i]['terminal'] = terminal['u_posterminal_name'];
			json[i]['user'] = APP.USER.getUserById(json[i]['user_id'])['name'];
			
			records.push( json[i]);
						
		}
		
		jQuery('#clock_in_out_history_table').DataTable({

			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			data : records,
			
			"columns": [
				{
					"data": "time_in"
				},
				{
					"data": "time_out"
				},
				{
					"data": "user"
				},
				{
					"data": "terminal"
				}
			],
			
			"columnDefs": [
			    {
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return data ? moment(data).format("DD-MMM-YYYY, HH:mm") : data ;
					},
					"targets": 1
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.clock.in.out.data"));
	});
}); //ClockInClockOutReportController

//CloseTillReportController
angular.module('app').controller("CloseTillReportController", function($scope, $modal)
{
	
	var ctrl = this;
	jQuery.get('/json/CLOSE_TILL',
	{
		json:{}
	}, function(json, textStatus, jqXHR)
	{
		
		var terminal = null;
		
		var records = [];
		
		for(var i=0; i<json.length; i++){
			
			terminal = APP.TERMINAL.getTerminalById(json[i]['terminal_id']);
			
			if(terminal == null) continue;
			
			json[i]['terminal'] = terminal['u_posterminal_name'];
			
			records.push( json[i]);
			
		}
		
		jQuery('#close_till_history_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			data : records,
			
			"columns": [
				{
					"data": "time_open"
				},
				{
					"data": "time_close"
				},
				{
					"data": "terminal"
				},
				{
					"data": "closing_amt"
				}
			],
			
			"columnDefs": [
			    {
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return data ? moment(data).format("DD-MMM-YYYY, HH:mm") : data ;
					},
					"targets": 1
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return new Number(data).toFixed(2) ;
					},
					"targets": 3
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.close.till.data"));
	});
	
	
}); //CloseTillReportController

//PriceChangeReportController
angular.module('app').controller("PriceChangeReportController", function($scope, $modal, $window)
{
	var ctrl = this;
	
	ctrl.print = function(){
		
		var configuration = PrinterManager.getPrinterConfiguration();
	    var LINE_WIDTH = configuration.LINE_WIDTH;
	    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
	    
	    var printFormat = [
		            ['FEED'],
		            ['CENTER'],
		            ['N',LINE_SEPARATOR],
		            ['H3', 'Price Changes'],
		           	['N', LINE_SEPARATOR],
		          	['B', JSReceiptUtils.format(I18n.t('Name'), LINE_WIDTH - 16) + JSReceiptUtils.format(I18n.t('Old'), 8, true) + JSReceiptUtils.format(I18n.t('New'), 8, true)],
		          	['N', LINE_SEPARATOR]
			];
	    
	    var text = null;
	    var record = null;
	    
	    var records = this.data;
	    
	    for(var i=0; i<records.length; i++ )
	    {
	    	record = records[i];
	    	
	    	text = record.description || record.name;
	    	
	    	while (text.length > (LINE_WIDTH - 16)) {
	            printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
	            text = text.substr(LINE_WIDTH);
	        }

	        var s = (JSReceiptUtils.format(text, LINE_WIDTH - 16) + JSReceiptUtils.format(Number(record.old_price).toFixed(2), 8, true) + JSReceiptUtils.format(Number(record.new_price).toFixed(2), 8, true));

	        printFormat.push(['N', s]);
	    }
	    
	    printFormat.push(['FEED']);
	    printFormat.push(['PAPER_CUT']);
	    
	    PrinterManager.print(printFormat);
	};
	
	jQuery.get('/json/PRODUCT_UPDATED',
	{
		json:
		{}
	}, function(json, textStatus, jqXHR)
	{
		ctrl.data = json;
		
		jQuery('#price_change_history_table').DataTable({

			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,
			
			"language": {
			      "emptyTable": "There are no changes."
			    },

			data : json,
						
			"columns": [
				{
					"data": "date_updated"
				},
				{
					"data": "name"
				},
				{
					"data": "description"
				},
				{
					"data": "upc"
				},
				{
					"data": "sku"
				},
				{
					"data": "old_price"
				},
				{
					"data": "new_price"
				}
			],
			
			"columnDefs": [
			    {
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					
			    },
			    
			   
			    
			    {
					"render": function(data, type, row) {
						return new Number(data).toFixed(2) ;
					},
					"targets": [5,6]					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.price.change.data"));
	});
		
}); //PriceChangeReportController
//InventoryAvailableController
angular.module('app').controller('InventoryAvailableController', function($scope, $modal, LoginService)
{
	$scope.displayInventoryAvailable = function()
	{
		$scope.showModal();
		var post = {};
		post = JSON.stringify(post);
		StockService.inventoryAvailable(post).done(function(response)
		{
			var inventory = {
				'terminal': LoginService.terminal.u_posterminal_name,
				'store': LoginService.store.name,
				'qtyonhand': response.qtyonhand
			};
			$modal.open(
			{
				templateUrl: '/html/popups/inventory-available.html',
				//size: 'lg',
				//scope : $scope,
				resolve:
				{
					'inventory': function()
					{
						return inventory;
					}
				},
				controllerAs: '$ctrl',
				controller: function($scope, $modalInstance, inventory)
				{
					var ctrl = this;
					ctrl.inventory = inventory;					
				}
			});
		}).fail(function(err)
		{
			$scope.alert(err);
		}).always(function()
		{
			$scope.closeModal();
		});
	};
}); //InventoryAvailableController

angular.module('app').controller("HardwareSettingsController", function($scope, $http, $window)
{
	var ctrl = this;
	
	var settings = localStorage.getItem('#PRINTER-SETTINGS');
	if (settings == null || settings == '')
	{
		ctrl.settings = {
			enable: false,
			implementation: 'Posteria Print',
			printer: "",
			ip: "",
			width: 54,
			
			enable_pole : false,
			pole: "",
			
			kitchen_printers : [
				
			] /* { 'ip': 'x.x.x.x', name:'Bar' }*/
		};
	}
	else
	{
		ctrl.settings = JSON.parse(settings);
	}
	
	var serverPrint  = localStorage.getItem('print-via-server') || 'N';
	
	if( $window.PosteritaBridge && serverPrint == 'N')
	{
		var list = $window.PosteritaBridge.getPrintersAsJSON();		
		ctrl.printers = JSON.parse(list);
	}
	else
	{	
		$http.get("/printing?action=getPrinters").then(function(response)
		{
			ctrl.printers = response.data;
		});
	}
	
	ctrl.isPrinterValid = function()
	{
		if(!ctrl.settings['enable']){
			return true;
		}
		
		if (ctrl.settings.implementation == 'Posteria Print')
		{
			if (ctrl.settings.printer == null || ctrl.settings.printer.length == 0)
			{
				$scope.alert(I18n.t("please.select.a.printer"), function()
				{
					$('#printer-name').select();
				});
				return false;
			}
		}
		else
		{
			if (ctrl.settings.ip == null || ctrl.settings.ip.length == 0)
			{
				$scope.alert(I18n.t("printer.ip.address.is.required"), function()
				{
					$('#printer-ip').select();
				});
				return false;
			}
		}
		if (ctrl.settings.width == null || ctrl.settings.ip.width < 0)
		{
			$scope.alert(I18n.t("please.enter.a.valid.printer.width"), function()
			{
				$('#printer-line-width').select();
			});
			return false;
		}
		return true;
	};
	ctrl.testPrinter = function()
	{
		if (ctrl.isPrinterValid())
		{
			var configuration = {};
			configuration.PRINTER_IMPLEMENTATION = ctrl.settings['implementation'];
			configuration.IP_ADDRESS = ctrl.settings['ip'];
			configuration.LINE_WIDTH = ctrl.settings['width'];
			configuration.PRINTER_NAME = ctrl.settings['printer'];
			configuration.ENABLE = ctrl.settings['enable'];
			
			// TODO launch test print
			PrinterManager.printTestPage(configuration);
			
			/*restaurant*/
			if( ctrl.settings.kitchen_printers )
			{
				var printers = ctrl.settings.kitchen_printers;
				var printer_ip, printer_name;
				
				for(var i=0; i<printers.length; i++)
				{
					printer_ip = printers[i]['ip'];
					printer_name = printers[i]['name'];
					
					var printFormat = [];
					printFormat.push(['FEED']);
					printFormat.push(['CENTER']);
					printFormat.push(['H1','* Test Kitchen Printer *']);
					printFormat.push(['H1','========================']);
					printFormat.push(['H1','Printer: ' + printer_name]);
					printFormat.push(['H1','IP : ' + printer_ip]);
					printFormat.push(['H1','========================']);
					printFormat.push(['FEED']);
					printFormat.push(['FEED']);
					printFormat.push(['PAPER_CUT']);
										
					HTTP_Printer.print( printer_ip, POSTERITA_Printer.format(printFormat) ).done(function(msg){
						
					}).fail(function(error){
						
						$scope.alert(error);
						
					}).always(function(){
						
					});
				}
			}
			/*restaurant*/
		}
	};
	
	ctrl.isPoleDisplayValid = function(){
		
		if(!ctrl.settings['enable_pole']){
			return true;
		}
		
		if (ctrl.settings.pole == null || ctrl.settings.pole.length == 0)
		{
			$scope.alert(I18n.t("please.select.a.pole.display"), function()
			{
				$('#pole-name').select();
			});
			return false;
		}
		
		return true;
	};
	
	ctrl.testPoleDisplay = function(){
		
		if(ctrl.isPoleDisplayValid())
		{
			POLE_DISPLAY.printTestData();
		}
	};
	
	ctrl.save = function()
	{
		if (ctrl.isPrinterValid() && ctrl.isPoleDisplayValid())
		{
			localStorage.setItem('#PRINTER-SETTINGS', JSON.stringify(ctrl.settings));
			$scope.info(I18n.t("settings.saved"));
		}
	};
	
	/*restaurant*/
	ctrl.addKitchenPrinter = function(){
		
		if( !ctrl.settings.kitchen_printers )
		{
			ctrl.settings.kitchen_printers = [];
		}
		
		ctrl.settings.kitchen_printers.push({'name':'', 'ip':''});
		
	};
	/*restaurant*/
	
}); // HardwareSettingsController
angular.module('app').controller("AboutController", function($scope, $http, $modal, LoginService)
{
	$scope.displayAboutPopup = function()
	{
		var post = {};
		post['action'] = "systemInfo";
		post = JSON.stringify(post);
		var url = "/system?json=" + post;
		$http.post(url).then(function(response)
		{
			var terminal = LoginService.terminal;
			var store = LoginService.store;
			var info = response["data"];
			info.terminal = terminal['u_posterminal_name'];
			info.store = store['name'];
			$modal.open(
			{
				templateUrl: '/html/popups/about.html',
				//size: 'lg',
				//scope : $scope,
				resolve:
				{
					'info': function()
					{
						return info;
					}
				},
				controllerAs: '$ctrl',
				controller: function($scope, $modalInstance, info)
				{
					var $ctrl = this;
					this.info = info;
				}
			});
		}, function(error)
		{
			$scope.alert(I18n.t("failed.to.request.system.info"));
		});
	};
});

angular.module('app').controller('MenuController', function($scope, $modal, LoginService){
	
	/*var ctrl = this;
	ctrl.role = LoginService.role;*/
	
	$scope.role = LoginService.role;	
	
	$scope.synchronize = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/synchronize.html',
			//size: 'lg',
			//scope : $scope,
			resolve:
			{
				
			},
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				this.sync = function(){
					
					$modalInstance.close();
					
					$scope.showModal("Synchronizing ...");
					
					DataSynchronizer.synchronizePOS().done(function(json){ 
						
						$scope.closeModal();						
						
						APP.initCache().done(function(){
							
							$scope.info("POS was successfully synchronized", function(){
								
								window.location.reload();
								
							});
							
						}).fail(function(){
							
						}).always(function(){							
							
						});
                   	 
                    }).fail(function(msg){
                    	
                    	//failed
                    	$scope.closeModal();
                    	
                    	$scope.alert(msg);
                    	
                    }).always(function(){                    	
                    	
                    	
                    });
					
				};
			}
		});
		
	}; //synchronize
	
});

angular.module('app').controller('ImportCustomerController', function( $scope, $modal, LoginService, $http, $location ){
	   
    var ad_client_id = LoginService.terminal.ad_client_id;
    var u_posterminal_id = LoginService.terminal.u_posterminal_id;
    var ad_user_id = LoginService.user.ad_user_id;
    var ad_role_id = LoginService.role.ad_role_id;
    var ad_org_id = LoginService.terminal.ad_org_id;
    var ad_client_name = LoginService.terminal.ad_client_name;
   
    var post = {};
    post['action'] = "systemInfo";
    post = JSON.stringify(post);
    var url = "/system?json=" + post;
   
    $http.post(url).then(function(response)
    {
        var info = response["data"];
        var serverAddress = info["server-address"];
       
        var params = {};
        params['ad_client_id'] = ad_client_id;
        params['u_posterminal_id'] = u_posterminal_id;
        params['ad_user_id'] = ad_user_id;
        params['ad_role_id'] = ad_role_id;
        params['ad_org_id'] = ad_org_id;
        params['ad_client_name'] = ad_client_name;
       
        params = JSON.stringify(params);
       
        var url = serverAddress + '/ImporterAction.do?action=getOfflinePage&importer=CustomerImporter&json='+params;
       
        document.getElementById("import-customer-frame").src = url;
       
    }, function(error)
    {
        $scope.alert(I18n.t("failed.to.load.importer"));
    });
   
});