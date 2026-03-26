angular.module('app').controller('ViewOrderController', function($scope, $modal, $location, $state, $stateParams, $transitions, $http, $timeout, LoginService, 
		ShoppingCartService, CommissionService, CustomerService) {
	
	var ctrl = this;
	
	ctrl.setOrder = function(order){
		
		ctrl.order = order;
		
		var store = APP.STORE.getStoreById( ctrl.order.orgId );
		var customer = APP.BP.getBPartnerById( ctrl.order.bpartnerId );

		function getAddress(model) {

			var fields = [
				"address1",
				"address2",
				"address3",
				"address4",
				"city",
				"postal",
				"phone1",
				"phone2",
				"taxNo",
			];

			var address = "";

			for (var i = 0; i < fields.length; i++) {

				var value = model[fields[i]] || '';

				if (value == null || value.length == 0) continue;

				if (address.length > 0) {
					address += ",";
				}

				address += value;
			}

			return address;
		}

		ctrl.store = {
			"name": store.name,
			"address": getAddress(store),
			"receiptFooterMsg": store.receiptFooterMsg
		};

		ctrl.customer = {
			"name": customer.name,
			"address": getAddress(customer)
		};
		
		//fix order taxes, add tax names
		ctrl.taxes = APP.ORDER.getTaxes(ctrl.order);		
		
	}
		
	var order = $stateParams.order;	
	
	//backward compatibility
	if(! order.version ){
		
		var payment = null;
		
		//fix payments
		for(var i=0; i<order.payments.length; i++){
			
			payment = order.payments[i];
			
			if(payment.tenderType == 'Cash'){
				
				payment['amountTendered'] = order['amountTendered'];
				payment['amountRefunded'] = order['amountRefunded'];
				
			}
		}
	}
	
	ctrl.setOrder(order);
		
	ctrl.role = LoginService.role;
	
	/*
	$scope.$on('order-updated', function(event, json){  
		
		console.log('order-updated');
		var id = json.id;
		APP.ORDER.cache({'id':id}).update(json);
		   
	});
	*/

	/* restaurant*/
	ctrl.getTitle = function() {
		
		var title = this.order.orderType == "POS Order" ? "Sales" : "Return";
		
		if(this.order && this.order.commandInfo){
			
			var info = this.order.commandInfo;
			
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
			
		}
		
		return title;
	};
	
	/*restaurant*/
	
	ctrl.getDocAction = function() {
		return this.order.docAction;
	};
	
	ctrl.getOrderType = function() {
		return this.order.orderType;
	};	

	ctrl.getOpenAmt = function() {
		
		return APP.ORDER.getOpenAmt(this.order).float()
	};
	
	ctrl.getDateOrdered = function() {
		
		return moment(this.order.dateOrdered).format("ddd, DD MMM YYYY, HH:mm");
		
	};


	/*================================================================*/

	ctrl.newOrder = function() {

		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();

		/*$location.path("/order-screen");*/
		$state.go("order-screen");

	};
	
	
	var openAmt = APP.ORDER.getOpenAmt(ctrl.order).float();
	if(openAmt > 0.0){		
		POLE_DISPLAY.display( formatPoleDisplayLine("Total", "" + openAmt), "");
	}	
	
	$scope.getOrder = function(){
		return ctrl.order;
	};
	
	$scope.setOrder = function(order){
		ctrl.order = order;
	};
});
