angular.module('app').controller('ViewOrderButtonController', function($scope, $state, $stateParams, $location, $modal, LoginService, CommissionService, 
		ShoppingCartService, CustomerService, OrderService) {

	var TERMINAL = LoginService.terminal;
	var ROLE = LoginService.role;
	var USER = LoginService.user;	
	
	$scope.print = function() {
		
		var order = $scope.getOrder();
		var receipt = APP.ORDER.getReceiptJSON( order );
		//mark receipt as duplicate
		receipt.force = true;
		
		PrinterManager.printReceipt( receipt, false );
		
		
		var terminal = LoginService.terminal;
		var time = moment().format("YYYY-MM-DD HH:mm:ss");
		var document_no = receipt.header.documentNo;
		
		var post = {};
		post['action'] = "rePrint";
		
		post['user_id'] = USER.id;
		post['terminal_id'] = terminal.id;
		post['order_id'] = order.uuid;
		post['date_printed'] = time;
		post['document_no'] = document_no;
		
		post = JSON.stringify(post);

		jQuery.get(
		    "/system?json=" + post, {},
		    function(json, textStatus, jqXHR) {

		        if (json == null || jqXHR.status != 200) {
		            console.error("Failed to log re-print!");
		            return;
		        }

		        if (json.error) {
		        	console.error("Failed to log re-print! " + json.error);
		            return;
		        }
		    });
		
		
		
	};
	
	$scope.printGift = function() {
		
		var order = $scope.getOrder();
		var receipt = APP.ORDER.getReceiptJSON( order );
		PrinterManager.printGiftReceipt( receipt );
	};
	
	// split order
	$scope.splitOrder = function() {
		
		var order = $scope.getOrder();
		CommissionService.setAmount( new BigNumber(order.grandTotal).minus(order.taxTotal).float() );

		var splitSalesReps = order['splitSalesReps'];
		
		var commissions = [];
		var i, commission, split;
				
		for( i=0; i< splitSalesReps.length; i++ ){
			
			split = splitSalesReps[i];
			
			CommissionService.setCommission( split["id"], split["amount"]);
		}			

		$modal.open({
					templateUrl : '/html/popups/order-screen/split-order.html',
					// size: 'lg',
					scope : $scope,
					controllerAs : '$ctrl',
					controller : function($scope, $modalInstance, OrderService) {

						this.isEqualMode = true;

						this.commissions = angular.copy(CommissionService.getCommissions());
						this.amount = CommissionService.amount;

						this.splitEqually = function() {

							var activeCount = 0;
							var commission, i;

							for (i = 0; i < this.commissions.length; i++) {

								commission = this.commissions[i];
								if (commission.active) {
									activeCount++;
								}
							}

							if (activeCount == 0) {
								$scope.alert("Please select atleast one sales rep!");
								return;
							}

							var share = new Number(this.amount / activeCount).toFixed(2);

							for (i = 0; i < this.commissions.length; i++) {

								commission = this.commissions[i];

								if (commission.active) {
									commission.amount = share;
								} else {
									commission.amount = 0;
								}
							}

							this.save();

						};

						this.reset = function() {

							this.commissions = angular.copy(CommissionService.getCommissions());

						};

						// custom mode
						this.selected = [];

						this.setCustomMode = function() {

							this.selected = []; // selected
												// sales reps

							this.isEqualMode = false;

							var commission;

							for (i = 0; i < this.commissions.length; i++) {

								commission = this.commissions[i];

								if (commission.active) {
									commission.amount = 0;

									this.selected.push(commission);
								}
							}
						};

						this.getCustomTotal = function() {

							var total = 0;

							var commission;

							for (i = 0; i < this.selected.length; i++) {

								commission = this.selected[i];

								total += commission.amount;
							}

							return total;

						};

						this.resetCustom = function() {

							var commission;

							for (i = 0; i < this.selected.length; i++) {

								commission = this.selected[i];

								commission.amount = 0;
							}

						};

						this.getRemainder = function() {

							var remainder = this.amount - this.getCustomTotal();
							
							return new BigNumber(remainder).float();

						};

						this.setRemainder = function(commission) {

							if (commission.amount == 0) {

								commission.amount = this.getRemainder();

							}

						};

						this.customSplit = function() {
							
							this.save();
							
						};
						
						this.save = function(){
							
							var order = $scope.getOrder();
							var orig_ORDER = angular.copy(order);
							
							CommissionService.setCommissions(this.commissions);							
							var commissions = CommissionService.getSplits();						
							
							
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
							
							order.splitSalesReps = splitSalesReps;
							
							APP.ORDER.saveOrder(order).done(function(msg, order) {

								console.log("processing commissions ..");
								$scope.setOrder(order);

							}).fail(function(msg){
		        				//failed to create
		        				$scope.alert(msg);
		        				
		        				//rollback changes
		        				order = orig_ORDER;
		        				
		        			}).always(function()
							{
								$scope.closeModal();
							});
							
							$modalInstance.close();							
						}

					}
				});
	};// split order
	
	$scope.synchronizeOrder = function() {
		
		$scope.confirm(I18n.t("do.you.want.to.sync.this.order"), function(result) {
			
			if(result == false) return;
			
			var order = angular.copy($scope.getOrder());

			$scope.showModal();

			var post = {};			

			//call Order online service
			var promise;
			
			var orderId = order.orderId;
			
			if(orderId > 0){
				post['uuid'] = order.uuid;
				post = JSON.stringify(post);
				promise = OnlineOrderService.synchronizeDraftOrder(post);
				
				console.log("Pulling order ...");
			}
			else
			{
				post = order;
				post = JSON.stringify(post);
				promise = OnlineOrderService.checkout(post);
				
				console.log("Pushing order ...");
			}			
			
			promise.done(function(response) {
				
				var order = response;
				
				APP.ORDER.saveOrder(order).done(function() {

					var order = arguments[1];

					$scope.$apply(function() {

						$scope.setOrder( order );
						$scope.$emit( 'order-updated', order );
						
						$scope.info("Order #" + order.documentNo + " was successfully synchronized.");

					});

				}).fail(function(msg){
    				//failed to create
    				$scope.alert(msg);
    				
    			}).always(function()
				{
					$scope.closeModal();
				});

			}).fail(function(msg) {
				//failed to create
				$scope.alert(msg);

			}).always(function() {

				$scope.closeModal();

			});

		
			
		});
	};

	$scope.void = function() {

		//validate role

		if (ROLE.allow_order_void == 'N') {
			$scope.alert("Your role does not allow you to void orders!");
			return;
		}

		$scope.confirm(I18n.t("do.you.want.to.void.this.order"), function(result) {
			
			if(result == false) return;

			var order = angular.copy($scope.getOrder());

			if (order.status == '') {

				$scope.showModal();

				// ok can void
				order.docAction = 'VO';

				APP.ORDER.saveOrder(order).done(function() {

					var order = arguments[1];

					$scope.$apply(function() {

						$scope.setOrder( order );
						$scope.$emit( 'order-updated', order );
						
						$scope.info("Order #" + order.documentNo + " was successfully voided.");

					});

				}).fail(function(msg){
    				//failed to create
    				$scope.alert(msg);
    				
    			}).always(function()
				{
					$scope.closeModal();
				});
				
			} else {

				if (order.isOnline && order.isOnline == true) {
					$scope.alert("You are not allow to void online orders in offline mode!");
					return;
				} else {

					$scope.showModal();

					var post = {};
					post['orderId'] = order.orderId;
					post = JSON.stringify(post);

					//call Order online service
					OnlineOrderService.voidOrder(post).done(function(response) {
						// post          
						// ok can void  	    				

						var order = response['order'];

						//check if order belongs to terminal
						if (order.terminalId != TERMINAL.id) {


							$scope.$apply(function() {

								$scope.setOrder( order );
								$scope.$emit( 'order-updated', order );
								
								$scope.info("Order #" + order.documentNo + " was successfully voided.");

							});

							return;
						}

						APP.ORDER.saveOrder(order).done(function() {

							var order = arguments[1];

							$scope.$apply(function() {

								$scope.setOrder( order );
								$scope.$emit( 'order-updated', order );
								
								$scope.info("Order #" + order.documentNo + " was successfully voided.");

							});

						}).fail(function(msg){
	        				//failed to create
	        				$scope.alert(msg);
	        				
	        			}).always(function()
						{
							$scope.closeModal();
						});

					}).fail(function(msg) {
						//failed to create
						$scope.alert(msg);

					}).always(function() {

						$scope.closeModal();

					});

				}

			} //else

		});

	};

	$scope.edit = function() {

		var order = $scope.getOrder();
		
		if( order.orderId && order.orderId > 0 ){
			
			$scope.info("Sales is no longer editable. It was manually synchronized. Click More Options > Synchronize to update order with online copy.");
		}
		else 
		{	
			//check assigned to an open table
			if(order.docAction == 'DR'){
				
				var loadOrder = function(){
					$scope.requestPin(function(){
						$state.go("order-screen", {
							"action": "invokeOrder",
							"order": angular.copy(order),
							commandInfo : angular.copy(order.commandInfo)
						});
					});
				};
				
				if(order.commandInfo.type == 'D'){
					//request for lock
					$scope.lockTable(order.commandInfo.tableId).then(function(){
						
						loadOrder();
						
					}, function(err){
						$scope.alert(err);
					});
				}
				else
				{
					loadOrder();
				}				
				
			}			
			
		}
	};

	$scope.copy = function() {
		
		$scope.requestPin(function(){
			$state.go("order-screen", {
				"action": "copyOrder",
				"order": angular.copy($scope.getOrder())
			});
		});
		
	};

	$scope.refund = function() {
		
		$scope.requestPin(function(){
			$state.go("order-screen", {
				"action": "refundOrder",
				"order": angular.copy($scope.getOrder())
			});
		});
		
	};

	$scope.exchange = function() {
		
		$scope.requestPin(function(){
			$state.go("order-screen", {
				"action": "exchangeOrder",
				"order": angular.copy($scope.getOrder())
			});
		});
		
	};
	
	$scope.newOrder = function() {

		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();
		$state.go("order-screen");
	};
	
	$scope.newReturn = function() {
		$scope.requestPin(function(){
			$state.go("order-screen", {
				"action": "refundOrder"
			});
		});
		
	};
	
	/* restaurant */
	$scope.placeOrder = function(){
		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();
		$state.go("choose-order-type");
	};


	$scope.getCommentsCount = function() {

		return $scope.getOrder().comments.length;
	};

	//Comment
	$scope.comment = function() {
		$modal.open({
			templateUrl: '/html/popups/view-order/comment.html',
			//size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, OrderService, LoginService) {

				this.comments = $scope.getOrder().comments;

				this.addComment = function(comment) {

					var order = $scope.getOrder();
					
					var json = {
							"date": moment().format("YYYY-MM-DD HH:mm:ss"),
							"message": comment,
							"user": LoginService.user.name,
							"userId": LoginService.user.ad_user_id
						};
					
					order.comments.push(json);
					
					this.comments = order.comments;
					
					OrderService.saveOrder( order );
					
					if(order.orderId && order.orderId > 0){
						/* push comment online */						
						var post = {};
						
						post["userId"] = json["userId"]; /* see OrderService.checkout() */ 
						post["message"] = json["message"];
						post["date"] = json["date"];
						post["orderId"] = order["orderId"];
						
						post = JSON.stringify(post);
						
						console.log("Saving comment online ...");
						
						OnlineOrderService.addComment(post).done(function(json){							
							$scope.info("Comment saved online");
						})
						.fail(function(error){
							$scope.alert(error);
						});
					}

					$modalInstance.close();
				};
			}
		});
	}; //comment

	
	
	
	$scope.pay = function() {
				
		_pay();
		
	};
	
	
	var _pay = function() {
		
		function saveOrder( order, payment ) {
			
			OrderService.saveOrder( order ).done(function(){
				
				$scope.setOrder( order );
				$scope.$emit( 'order-updated', order );				
				console.log("saving order ..");
				
				var openAmt = APP.ORDER.getOpenAmt(order).float();
				
				if( openAmt == 0.0 ){
					
					payment_modal.close();
					
					var receipt = APP.ORDER.getReceiptJSON( order );
					PrinterManager.printReceipt( receipt, false );
					
					jQuery( document ).trigger("order:paid", angular.copy(order));
				}
				
				var changeText = null;
								
				var changeText = null;
				
				if( payment["tenderType"] == "Cash" )
				{
					$scope.info("Change: " + new BigNumber(payment["amountRefunded"]).toFixed(2));
					
					//open drawer
					PrinterManager.print([
						['OPEN_DRAWER']
					]);
					
					changeText = formatPoleDisplayLine("Change D.", new Number(payment["amountRefunded"]).toFixed(2) );				
					var paidText = formatPoleDisplayLine("Cash T.", new Number(payment["amountTendered"]).toFixed(2) );
					POLE_DISPLAY.display( paidText , changeText );
				}
				else
				{
					POLE_DISPLAY.display( formatPoleDisplayLine("Paid", new Number(payment["payAmt"]).toFixed(2) ), payment["tenderType"] );
				}
				
			}).fail(function(msg){
				//failed to create
				$scope.alert(msg);
								
			}).always(function()
			{
				$scope.closeModal();
			});
		}
		
		
		function processPayment(payment) {
			
			$scope.showModal();
			
			var order = angular.copy($scope.getOrder());
			
			var commandInfo = order["commandInfo"];
			
			//----------------------------------------------------------------------------
			
			/* Push payment OR order online ? */
			// base on payment type

			var pushOrder = false;
			var pushPayment = false;
			
			var processOnline = false;
			
			var tenderType = payment["tenderType"];
			
			if("Card" == tenderType
					|| "Loyalty" == tenderType
					|| "Voucher" == tenderType
					|| "Gift Card" == tenderType)
			{
				processOnline = true;
			}
			
			if( order.status == 'CO' || order.status == 'DR' ){	/* processed online*/	//see OrderService.checkout()	
				pushPayment = true;
			}
			else if ( order.status == '' && processOnline ){
				pushOrder = true;
			}
			else
			{
				
			}
			
			//perform operations based on flags
			if( pushOrder || pushPayment ) {
				
				if(pushPayment){
					
					var post = payment;
					
					post["uuid"] = order["uuid"]; //see OrderService.checkout() 
					post = JSON.stringify(post);
					
					console.log("Processing payment online ...");
					
					PaymentService.create(post).done(function(json){
						
						json["commandInfo"] = commandInfo;
						saveOrder(json, payment);
						
					})
					.fail(function(error){
						current_payment_modal.close();
						$scope.alert(error);
					});
				}
				else
				{
					order.payments.push(payment);
					
					var post = order;
					post = JSON.stringify(post);
					
					console.log("Processing order online ...");
					
					OnlineOrderService.checkout(post).done(function(json){
						
						json["commandInfo"] = commandInfo;
						saveOrder(json, payment);
						
					})
					.fail(function(error){
						current_payment_modal.close();
						$scope.alert(error);
					});
				}
				
			}
			else
			{
				order["commandInfo"] = commandInfo;
				order.payments.push(payment);
				saveOrder(order, payment);
			}
			
		}
		
		
		var current_payment_modal;
		
		var payment_modal = $modal.open({
			
	           templateUrl: '/html/popups/view-order/payment-panel.html',	 
	           //size: 'sm',
	           scope : $scope,
	           controllerAs: '$ctrl',
	           resolve: {	        	  
            },
	           controller: function( $scope, $modalInstance, OrderService, LoginService ){
	        	   
	        	   this.orderType = $scope.getOrder().orderType;
	        	   
	        	   var preference = LoginService.terminal.preference;
	        	   var tender_types = preference.acceptPaymentRule;
	        	   this.tendersTypes = tender_types;
	        	   
	        	   $scope.cashPayment = function(){
	        		   
	        		   $scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        		   current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/cash.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        				   windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){    	   
	        		        	   
	        		        	   
	        		        	   $scope.isValid = function(){  
	        		        		   
	        		        		   var amountTendered = $scope.amountTendered || 0;
	        		        		   var amountPaid = $scope.amountPaid  || 0;
	        		        		   
	        		        		   if( amountTendered <= 0 || amountTendered < amountPaid ) return false;
	        		        		   
	        		        		   if( amountPaid <= 0 || amountPaid > $scope.openAmt )	return false;
	        		        		   
	        		        		   return true;
	        		        	   };
	        		        	   
	        		        	   $scope.calculateAmtPaid = function(amountTendered){
	        		        		   
	        		        		   amountTendered = amountTendered || 0;
	        		        		   
	        		        		   var amountPaid = $scope.openAmt;
	        		        		   
	        		        		   if(amountTendered < amountPaid){
	        		        			   
	        		        			   amountPaid = amountTendered;
	        		        		   }
	        		        		   
	        		        		   $scope.amountPaid = amountPaid;
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){ 
	        		        		   
	        		        		   processPayment({
	        		        			   "tenderType" : "Cash",
	        		        			   "amountTendered" : $scope.amountTendered,
	        		        			   "amountRefunded" : new BigNumber($scope.amountTendered - $scope.amountPaid).float(2),
	        		        			   "payAmt" : $scope.amountPaid,
	        		        		   });
	        		        		   
	        		        		   $modalInstance.close();
	        		        	   };	
	        		        	   
	        		           }
	        		         });
	        		};//cash payment
	        		
	        		$scope.creditCardPayment = function(){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/credit-card.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//credit card payment
	        		
	        		$scope.checkPayment = function(){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/check.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 
	        		        	   
	        		        	   $scope.isValid = function(){
	        		        		   
	        		        		   return (
	        		        				   ($scope.amount <= $scope.openAmt) && 
	        		        				   (($scope.chequeNo || '') && ($scope.amount || ''))
	        		        				);
	        		        		   
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        		   processPayment({
	        		        			   "tenderType" : "Cheque",
	        		        			   "chequeNo" : $scope.chequeNo,
	        		        			   "payAmt" : $scope.amount	        		        			   
	        		        		   });
	        		        		   
	        		        		   $modalInstance.close();	        		        		   
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//check payment 		
	        		
	        		
	        		$scope.giftCardPayment = function(){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/gift-card.html',	
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 
	        		        	   
	        		        	   $scope.isValid = function(){
	        		        		   
	        		        		   var fields = (($scope.giftCardNo || '') && ($scope.giftCardCVV || ''));
	        		        		   
	        		        		   return fields;
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){	
	        		        		   
	        		        		   var post = {};
	        		        			post["cardNo"] = $scope.giftCardNo;/*8500000007976*/
	        		        			post["cardCvv"] = $scope.giftCardCVV;
	        		        			post["amount"] = $scope.openAmt;
	        		        			
	        		        			post = JSON.stringify(post);
	        		        			
	        		        			GiftCardService.validatePaymentAmount(post).done(function(response){
	        		        				if (response["ok"] == true) {
	        		        		            
	        		        					processPayment({
	     	        		        			   "tenderType" : "Gift Card",
	     	        		        			   "giftCardNo" : $scope.giftCardNo,
	     	        		        			   "giftCardCVV" : $scope.giftCardCVV,
	     	        		        			   "payAmt" : $scope.openAmt	        		        			   
	     	        		        		   });
	     	        		        		   
	     	        		        		   $modalInstance.close();
	        		        					
	        		        		        } else {
	        		        		        	$scope.alert(response["reason"]);
	        		        		        }
	        		        		       	
	        		        			}).fail(function(msg){
	        		        				//failed to create
	        		        				$scope.alert(msg);
	        		        			});	 	        		        		   
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//gift card payment
	        		
	        		$scope.voucherPayment = function(){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/voucher.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance, LoginService, $timeout ){ 
	        		        	   
	        		        	   $scope.stores = APP.STORE.searchStores({});				
	        		        	   $scope.current_store_id = LoginService.terminal.ad_org_id;
	        		        	   
	        		        	   $timeout(function(){
	        		        		   $scope.voucherStoreId = LoginService.terminal.ad_org_id;
	        		        	   });
	        		        	   
	        		        	   $scope.isValid = function(){
	        		        		   
	        		        		   var voucherNo = $scope.voucherNo || '';
	        		        		   var orgId = $scope.voucherStoreId || '';
	        		        		   
	        		        		   return voucherNo.length > 0 && orgId.length > 0;	 		        		   
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        		   var post = {};
	        		        			post["voucherNo"] = $scope.voucherNo;
	        		        			post["orgId"] = $scope.voucherStoreId;
	        		        			
	        		        			post = JSON.stringify(post);
	        		        			
	        		        			VoucherService.validateVoucher(post).done(function(response){
	        		        				if (response["ok"] == true) {
	        		        					
	        		        					var openAmt = response["openVoucherAmt"];
	        		        					var voucherId = response["voucherId"];
	        		        					
	        		        					if(openAmt > $scope.openAmt){
	        		        						
	        		        						openAmt = $scope.openAmt;
	        		        					}
	        		        		            
	        		        					processPayment({
	     	        		        			   "tenderType" : "Voucher",
	     	        		        			   "voucherId" : voucherId,
	     	        		        			   "payAmt" : openAmt	        		        			   
	     	        		        		   });
	     	        		        		   
	     	        		        		   $modalInstance.close();
	        		        					
	        		        		        } else {
	        		        		        	$scope.alert(response["reason"]);
	        		        		        }
	        		        		       	
	        		        			}).fail(function(msg){
	        		        				//failed to create
	        		        				$scope.alert(msg);
	        		        			});	
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//voucher payment
	        		
	        			        		
	        		$scope.loyaltyPayment = function(){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/loyalty.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 	        		        	   
	        		        	   
	        		        	   var order = $scope.getOrder();
	        		        	   var c_bpartner_id = order.bpartnerId;
	        		       		
	        		       			$scope.bp = APP.BP.getBPartnerById( c_bpartner_id );
	        		       			
	        		       			var post = {};
	        						post["bpId"] = $scope.bp.c_bpartner_id;
	        						post = JSON.stringify(post);
	        						
	        						LoyaltyService.getLoyaltyInfo(post).done(function(json){
	        							
	        							if (json["isOk"] == true) {
	        								
	        								$scope.loyaltyPoints = json["loyaltyPoints"];
	        								$scope.loyaltyPointsEarned = json["loyaltyPointsEarned"];
	        								$scope.loyaltyPointsSpent = json["loyaltyPointsSpent"];	        								
        		        					
        		        		        } else {
        		        		        	$scope.alert(json["reason"]);
        		        		        }	        							
	        							
	        						}).fail(function(error){
	        							$scope.alert(error);
	        						});	        		        	        		        	   
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        		   var amt = $scope.openAmt;
	        		        		   
	        		        		   if($scope.loyaltyPoints < amt){
	        		        			   
	        		        			   amt = $scope.loyaltyPoints;
	        		        		   }
	        		        		   
	        		        		   if(amt <= 0){
	        		        			   
	        		        			   $scope.alert('Loyalty points are not sufficient!');
	        		        			   return;
	        		        			   
	        		        		   }
	        		        		 	        		        		   
	        		        		   processPayment({
	        		        			   "tenderType" : "Loyalty",
	        		        			   "payAmt" : amt	        		        			   
	        		        		   });
	        		        		   
	        		        		   $modalInstance.close();	        		        		   
	        		        	   };	
	        		           }
	        		         });
	        		};//loyalty payment
	        		
	        		/* external payments */
	        		$scope.confirmationExternalPayment = function( amt, tenderType, title ){	        			
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/external-payment-confirmation.html',
	        		           //size: 'sm',
	        		           backdrop: 'static',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {
	        		        	   
	        		        	   'amount' : function()
	        						{
	        							return amt;
	        						},
	        						
	        						'tenderType' : function()
	        						{
	        							return tenderType;
	        						},
	        						
	        						'title' : function()
	        						{
	        							return title;
	        						}
	        	         },
	        		           controller: function( $scope, $modalInstance, amount, tenderType, title ){ 
	        		        	   
	        		        	   $scope.title = title;
	        		        	   
	        		        	   $scope.paymentAccepted = function(){
	        		        		   
	        		        		   $modalInstance.close();
	        		        		   
	        		        		   processPayment({
	        		        			   "tenderType" : tenderType,
	        		        			   "payAmt" : amount	        		        			   
	        		        		   }); 
	        		        		   
	        		        	   };	        	   
	        		        	   	        		        	         		        	   
	        		           }
	        		         });
	        		};//confirm external payment
	        		
	        		$scope.externalPayment = function(title, tenderType){
	        			
	        			$scope.openAmt = APP.ORDER.getOpenAmt($scope.getOrder()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/external-payment.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	   
	        		        	   'tenderType' : function()
	        						{
	        							return tenderType;
	        						},
	        						
	        						'title' : function()
	        						{
	        							return title;
	        						}
	        		           },
	        		           controller: function( $scope, $modalInstance, tenderType, title ){ 
	        		        	   
	        		        	   $scope.title = title;
	        		        	   $scope.tenderType = tenderType;
	        		        	   
	        		        	   $scope.isValid = function(){
	        		        		   
	        		        		   return ($scope.amount <= $scope.openAmt);	        		        		   
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        		   $modalInstance.close();
	        		        		   
	        		        		   //show confirmation
	        		        		   $scope.confirmationExternalPayment( $scope.amount, $scope.tenderType, $scope.title );
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//external payment
	        		
	        		
	        		$scope.externalCardPayment = function(){
						$scope.externalPayment("External Card", APP.TENDER_TYPE.EXTERNAL_CARD);
					}; // external credit card payment
					
					$scope.mcbJuicePayment = function(){
						$scope.externalPayment("MCB Juice", APP.TENDER_TYPE.MCB_JUICE);
					};//mcb juice payment
					
					$scope.mytMoneyPayment = function(){
						$scope.externalPayment("MY.T Money", APP.TENDER_TYPE.MY_T_MONEY);
					};//myt money
					
					$scope.emtelMoneyPayment = function(){
						$scope.externalPayment("Blink", APP.TENDER_TYPE.EMTEL_MONEY);
					};//emtel money payment
					
					$scope.giftsMuPayment = function(){
						$scope.externalPayment("Gifts.mu", APP.TENDER_TYPE.GIFTS_MU);
					};//gifts.mu payment
					
					$scope.mipsPayment = function(){
						$scope.externalPayment("MIPS", APP.TENDER_TYPE.MIPS);
					};//mips payment
	        		
	           }
	         });
	};
	
	
	//more-option panel
	$scope.moreOptions = function() {

		$modal.open({
			templateUrl: '/html/popups/view-order/more-options-button-panel.html',
			// size: 'lg',
			scope : $scope,
			controllerAs : '$ctrl',
			controller : function($scope, $modalInstance) {

			}
		});
	};//more-option panel

});