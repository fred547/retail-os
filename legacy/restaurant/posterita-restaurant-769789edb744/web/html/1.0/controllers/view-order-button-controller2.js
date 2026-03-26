angular.module('app').controller('ViewOrderButtonController', function($scope, $location, $modal, $timeout, $routeParams, OrderService, LoginService, CommissionService, 
		ShoppingCartService, CustomerService, TableService, ViewOrderService) {

	var TERMINAL = LoginService.terminal;
	var ROLE = LoginService.role;
	var USER = LoginService.user;		
	
	$scope.print = function() {
		
		var ORDER = ViewOrderService.getOrder();
		
		var receipt = APP.ORDER.getReceiptJSON( ORDER );
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
		post['order_id'] = ORDER.uuid;
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
		var ORDER = ViewOrderService.getOrder();
		var receipt = APP.ORDER.getReceiptJSON( ORDER );
		PrinterManager.printGiftReceipt( receipt );
	};
	
	// split order
	$scope.splitOrder = function() {
		
		var ORDER = ViewOrderService.getOrder();
		
		CommissionService.setAmount( new BigNumber(ORDER.grandTotal).minus(ORDER.taxTotal).float() );

		var splitSalesReps = ORDER['splitSalesReps'];
		
		var commissions = [];
		var i, commission, split;
				
		for( i=0; i< splitSalesReps.length; i++ ){
			
			split = splitSalesReps[i];
			
			CommissionService.setCommission( split["id"], split["amount"]);
		}			

		$modal.open({
					templateUrl : '/html/popups/order-screen/split-order.html',
					// size: 'lg',
					// scope : $scope,
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
							
							var orig_ORDER = angular.copy(ORDER);
							
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
							
							ORDER.splitSalesReps = splitSalesReps;
							
							APP.ORDER.saveOrder(ORDER).done(function(msg, order) {

								console.log("processing commissions ..");
								ViewOrderService.setOrder(order);

							}).fail(function(msg){
		        				//failed to create
		        				$scope.alert(msg);
		        				
		        				//rollback changes
		        				ORDER = orig_ORDER;
		        				
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
		
		var ORDER = ViewOrderService.getOrder();
		
		$scope.confirm(I18n.t("do.you.want.to.sync.this.order"), function(result) {
			
			if(result == false) return;
			
			var order = jQuery.extend({}, ORDER);

			$scope.showModal();

			var post = {};
			post['uuid'] = order.uuid;
			post = JSON.stringify(post);

			//call Order online service
			OnlineOrderService.synchronizeDraftOrder(post).done(function(response) {
				
				var order = response;

				
				APP.ORDER.saveOrder(order).done(function() {

					var order = arguments[1];

					$scope.$apply(function() {

						ViewOrderService.setOrder( order );
						$scope.$emit( 'order-updated', null );
						
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
		
		var ORDER = ViewOrderService.getOrder();

		//validate role

		/*if (ROLE.allow_order_void == 'N') {
			$scope.alert("Your role does not allow you to void orders!");
			return;
		}*/

		$scope.confirm(I18n.t("do.you.want.to.void.this.order"), function(choice) {
			
			if(choice == false) return;

			var order = jQuery.extend({}, ORDER);

			if (ORDER.orderId == 0) {

				$scope.showModal();

				// ok can void
				order.docAction = 'VO';
				
				var table_id = ( ORDER.commandInfo.tableId || ORDER.commandInfo.takeAwayId );	

				APP.ORDER.saveOrder(order).done(function() {

					var order = arguments[1];
					
					$timeout(function(){
						
						ViewOrderService.setOrder( order );						
						
						TableService.voidOrder( order.id, table_id );
						
						$scope.$emit( 'order-updated', null );
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

				if (ORDER.isOnline && ORDER.isOnline == true) {
					$scope.alert("You are not allow to void online orders in offline mode!");
					return;
				} else {

					$scope.showModal();

					var post = {};
					post['orderId'] = ORDER.orderId;
					post = JSON.stringify(post);
					
					var table_id = ( ORDER.commandInfo.tableId || ORDER.commandInfo.takeAwayId );					

					//call Order online service
					OnlineOrderService.voidOrder(post).done(function(response) {
						// post          
						// ok can void  	    				

						var order = response['order'];

						//check if order belongs to terminal
						if (order.terminalId != TERMINAL.id) {


							$scope.$apply(function() {

								ViewOrderService.setOrder( order );
								$scope.$emit( 'order-updated', null );
								
								$scope.info("Order #" + order.documentNo + " was successfully voided.");

							});

							return;
						}

						APP.ORDER.saveOrder(order).done(function() {

							var order = arguments[1];

							$scope.$apply(function() {
								
								TableService.voidOrder( order.id, table_id );

								ViewOrderService.setOrder( order );
								$scope.$emit( 'order-updated', null );
								
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
		
		$scope.requestPin(function(){
			$location.path("/order-screen").search({
				"action": "invokeOrder",
				"uuid": ViewOrderService.getOrder().uuid
			});
		});
	};

	$scope.copy = function() {

		$scope.requestPin(function(){
			$location.path("/order-screen").search({
				"action": "copyOrder",
				"uuid": ViewOrderService.getOrder().uuid
			});
		});		
	};

	$scope.refund = function() {

		$scope.requestPin(function(){
			$location.path("/order-screen").search({
				"action": "refundOrder",
				"uuid": ViewOrderService.getOrder().uuid
			});
		});		
	};

	$scope.exchange = function() {

		$scope.requestPin(function(){
			$location.path("/order-screen").search({
				"action": "exchangeOrder",
				"uuid": ViewOrderService.getOrder().uuid
			});
		});		
	};
	
	$scope.newOrder = function() {

		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();
		$location.path("/order-screen").search({});
	};
	
	$scope.placeOrder = function(){
		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();
		$location.path("/choose-order-type").search({});
	};
	
	$scope.newReturn = function() {

		$location.path("/order-screen").search({
			"action" : "refundOrder"
		});
	};


	$scope.getCommentsCount = function() {

		return ViewOrderService.getOrder().comments.length;
	};

	//Comment
	$scope.comment = function() {
		$modal.open({
			templateUrl: '/html/popups/view-order/comment.html',
			//size: 'lg',
			//scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, OrderService, LoginService, ViewOrderService) {

				this.comments = ViewOrderService.getOrder().comments;

				this.addComment = function(x) {

					var order = ViewOrderService.getOrder();
					
					order.comments.push({

						"date": moment().format("YYYY-MM-DD HH:mm:ss"),
						"message": x,
						"user": LoginService.user.name,
						"userId": LoginService.user.ad_user_id

					});
					
					/*this.comments = order.comments;*/ 
					
					OrderService.saveOrder( order );

					$modalInstance.close();
				};
			}
		});
	}; //comment

	

	$scope.pay = function() {
		
		function saveOrder( order, payment ) {
			
			OrderService.saveOrder( order ).done(function(){
				
				ViewOrderService.setOrder(order);
				
				$scope.$emit( 'order-updated', null );
				
				console.log("saving order ..");
				
				var openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float();
				
				if( openAmt == 0.0 ){
					
					payment_modal.close();
					
					/*restaurant*/
					
					var commandInfo = order["commandInfo"];
					
					if( commandInfo && commandInfo['type'] == "D" ){
						TableService.clearTable( commandInfo.tableId ).then(function (response){
							if(response.data){
								console.log( "cleared table# " + order.tableId );
							}
						});
					}						
					
					/*restaurant*/
					
					var receipt = APP.ORDER.getReceiptJSON( ViewOrderService.getOrder() );
					PrinterManager.printReceipt( receipt, false );
				}
				
				var changeText = null;
								
				var changeText = null;
				
				if( payment["tenderType"] == "Cash" )
				{
					changeText = formatPoleDisplayLine("CHANGE", "" + payment["amountRefunded"]);
					
					$scope.info("CHANGE: " + new BigNumber(payment["amountRefunded"]).toFixed(2));
					
					//open drawer
					PrinterManager.print([
						['OPEN_DRAWER']
					]);
				}
				
				var paidText = formatPoleDisplayLine("PAID", "" + payment["payAmt"]);
				POLE_DISPLAY.display( paidText , changeText );
				
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
			
			var order = angular.copy(ViewOrderService.getOrder());
			
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
						
						saveOrder(json, payment);
						
					})
					.fail(function(error){
						alert(error);
					});
				}
				else
				{
					order.payments.push(payment);
					
					var post = order;
					post = JSON.stringify(post);
					
					console.log("Processing order online ...");
					
					OnlineOrderService.checkout(post).done(function(json){
						
						saveOrder(json, payment);
						
					})
					.fail(function(error){
						alert(error);
					});
				}
				
			}
			else
			{
				order.payments.push(payment);
				saveOrder(order, payment);
			}
			
		}
		
		
		var current_payment_modal;
		
		var payment_modal = $modal.open({
			
	           templateUrl: '/html/popups/view-order/payment-panel.html',	 
	           //size: 'sm',
	           //scope : $scope,
	           controllerAs: '$ctrl',
	           resolve: {	        	  
            },
	           controller: function( $scope, $modalInstance, OrderService, LoginService, ViewOrderService ){
	        	   
	        	   this.orderType = ViewOrderService.getOrder().orderType;
	        	   
	        	   var preference = LoginService.terminal.preference;
	        	   var tender_types = preference.acceptPaymentRule;
	        	   this.tendersTypes = tender_types;
	        	   
	        	   $scope.cashPayment = function(){
	        		   
	        		   $scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float();
	        			
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/credit-card.html',
	        		           //size: 'sm',
	        		           //scope : $scope,
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/loyalty.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 	        		        	   
	        		        	   
	        		        	   var c_bpartner_id = ORDER.bpartnerId;
	        		       		
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
	        		        		 
	        		        		   /*
	        		        		  var diff = new BigNumber($scope.loyaltyPoints - $scope.openAmt).float(2);
	        		        			  
        		        			  if(diff < 0.0){
        		        				 $scope.alert('Loyalty points is less than order total! Loyalty points: ' 
        		        						  + new Number($scope.loyaltyPoints).toFixed(2) + ' Order total: ' + new Number($scope.openAmt).toFixed(2));			  
        		        				  return;
        		        			  }
        		        			  */
	        		        		   
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
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
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
						$scope.externalPayment("Emtel Money", APP.TENDER_TYPE.EMTEL_MONEY);
					};//emtel money payment
					
					/*
					 $scope.confirmationExternalCardPayment = function( amt ){	        			
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/external-card-confirmation.html',
	        		           //size: 'sm',
	        		           backdrop: 'static',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {
	        		        	   
	        		        	   'amount' : function()
	        						{
	        							return amt;
	        						}
	        	         },
	        		           controller: function( $scope, $modalInstance, amount ){ 
	        		        	   
	        		        	   $scope.paymentAccepted = function(){
	        		        		   
	        		        		   processPayment({
	        		        			   "tenderType" : "Ext Card",
	        		        			   "payAmt" : amount	        		        			   
	        		        		   });
	        		        		   
	        		        		   $modalInstance.close();
	        		        		   
	        		        	   };	        	   
	        		        	   	        		        	         		        	   
	        		           }
	        		         });
	        		};//confirm external card payment
	        		
	        		$scope.externalCardPayment = function(){
	        			
	        			$scope.openAmt = new BigNumber(ViewOrderService.getOpenAmt()).float(2);
	        			
	        			current_payment_modal = $modal.open({
	        		           templateUrl: '/html/popups/view-order/external-card.html',
	        		           //size: 'sm',
	        		           scope : $scope,
	        		           controllerAs: '$ctrl',
	        		           windowClass: 'topModal',
	        		           resolve: {	        	  
	        	         },
	        		           controller: function( $scope, $modalInstance ){ 
	        		        	   
	        		        	   $scope.isValid = function(){
	        		        		   
	        		        		   return ($scope.amount <= $scope.openAmt);	        		        		   
	        		        	   };
	        		        	   
	        		        	   $scope.acceptPayment = function(){
	        		        		   
	        		        		   $modalInstance.close();
	        		        		   
	        		        		   //show confirmation
	        		        		   $scope.confirmationExternalCardPayment( $scope.amount );
	        		        	   };	        		        	   
	        		           }
	        		         });
	        		};//external credit card payment
					 */
	        		
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