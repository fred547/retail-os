angular.module('app').controller('OrderScreenButtonsController', function($scope, $modal, $location, $state, OrderService, OrderScreenService, CommissionService, 
		ShoppingCartService, LoginService, CustomerService)
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
							/*
							OrderService.setOrder(order);
							$location.path("/order-screen").search(
							{
								"action": "invokeOrder",
								"uuid": order.uuid
							});
							*/
														
							$state.transitionTo($state.current, {
								"action": "invokeOrder",
								'order' : angular.copy(order)								
							}, {
							    reload: true,
							    inherit: false,
							    notify: true
							});
						}
						else
						{
							$state.go('view-order', {
								'order' : angular.copy(order)
							});
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
	                		
	                		$state.go('view-order', {
	            				'order' : order
	            			});
							
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
				"isEditable" : true,
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
				"getLineInfo" : function(){ return product.description; },
				"resetLine" : function(){}
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
								
								$scope.showModal();
								
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
								}).fail(function(msg){
			                		
			                		$scope.alert(msg);
			                		
			                	}).always(function(){
			                		
			                		$scope.closeModal();
			                		
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
								
								$scope.showModal();
								
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
										"isgift": true
									};
									addGiftProductToCart(product, amount);
								}).fail(function(msg){
			                		
			                		$scope.alert(msg);
			                		
			                	}).always(function(){
			                		
			                		$scope.closeModal();
			                		
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
								
								$scope.showModal();
								
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
								}).fail(function(msg){
			                		
			                		$scope.alert(msg);
			                		
			                	}).always(function(){
			                		
			                		$scope.closeModal();
			                		
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
								
								$scope.showModal();
								
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
									
								}).fail(function(msg){
			                		
			                		$scope.alert(msg);
			                		
			                	}).always(function(){
			                		
			                		$scope.closeModal();
			                		
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
				"isEditable" : true,
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
				"getLineInfo" : function(){ return product.description; },
				"resetLine" : function(){}
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
								
								$scope.showModal();
								
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
									
								}).always(function()
								{
									$scope.closeModal();
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
								
								$scope.showModal();
								
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
									
								}).always(function()
								{
									$scope.closeModal();
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
							
							if( OrderService.refOrder && OrderService.refOrder.comments )
							{
								this.previousComments = OrderService.refOrder.comments;
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
								"isEditable" : true,
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
								"resetLine" : function(){}
						
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
								
								var tax_id = ctrl.tax_id;
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
					
					if (customer == null){
						$scope.alert("Customer is required!");
						return;
					}
					
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
 										"earnloyaltypoints" : promotion['earnloyaltypoints'],
 										"resetLine" : function(){}
 								
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