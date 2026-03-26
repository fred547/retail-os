angular.module('app').controller('QuotationController', function($controller, $scope, $modal, $location, $stateParams, LoginService, ProductService, ShoppingCartService, CommissionService, OrderService, CustomerService, OrderScreenService){
	angular.extend(this, $controller('OrderScreenController', {$scope: $scope}));
	
	$scope.orderType = 'Quotation';
	
	$scope.saveOrder = function(){
		$scope.alert("TODO: Save order");
	};
	
	$scope.beforeCheckOut = function(){
		$scope.alert("TODO: Checkout order");
	};	
	
});

angular.module('app').controller('QuotationButtonsController', function($controller, $scope, $modal, $location, OrderService, OrderScreenService, CommissionService, ShoppingCartService, LoginService, CustomerService){
	angular.extend(this, $controller('OrderScreenButtonsController', {$scope: $scope}));
	
	//override more options panel
	$scope.moreOptions = function(){
		
		alert($scope.orderType);
		
	};
	
	//override load order panel
	$scope.loadOrder = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/load-quotation.html',
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
					$scope.showModal();
					
					//search online
					var post = {};
                	//post["ad_org_id"] = orgId;
                	post["documentno"] = documentNo;
                	
                	post = JSON.stringify(post);
                	
                	OnlineOrderService.invokeQuotation(post).done(function(order){
                		
                		order.isOnline = true; // mark as online order
                		
                		OrderService.setOrder(order);
						$location.path("/view-quotation");
						
						$scope.close();
                		
                		
                	}).fail(function(msg){
                		
                		$scope.alert(msg);
                		
                	}).always(function(){
                		
                		$scope.closeModal();
                		
                	});
				
				};
				
				$scope.isValid = function()
				{
					var field = $scope.order_no || '';
					return field;
				};
			}
		});			
		
	};	
	
});


angular.module('app').controller('ViewQuotationController', function($controller,$scope, $modal, $location, $stateParams, $http, OrderService, LoginService, ShoppingCartService, CommissionService, CustomerService){
	angular.extend(this, $controller('ViewOrderController', {$scope: $scope}));
	
	var ORDER = OrderService.getOrder();
	
	this.getTitle = function() {
		return "Quotation";
	};
	
	$scope.newQuotation = function(){
		ShoppingCartService.reset();
		CommissionService.reset();
		CustomerService.reset();
		$location.path("/quotation").search({});
	};
	
	$scope.completeQuotation = function(){
		
	}
	
});

angular.module('app').controller('ViewQuotationButtonController', function($controller, $scope, $location, $modal, OrderService, LoginService, CommissionService, ShoppingCartService, CustomerService){
	angular.extend(this, $controller('ViewOrderButtonController', {$scope: $scope}));
	
	var ORDER = OrderService.getOrder();
	
	$scope.exportPdf = function(){		
		exportPDF( ORDER.orderId );
	};
	
	//Comment
	$scope.comment = function() {
		$modal.open({
			templateUrl: '/html/popups/view-order/comment.html',
			//size: 'lg',
			//scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, OrderService, LoginService) {

				var ctrl = this;
				ctrl.comments = OrderService.getOrder().comments;

				ctrl.addComment = function(msg) {

					var order = OrderService.getOrder();
					
					$scope.showModal();
					
					var comment = {
						"date": moment().format("YYYY-MM-DD HH:mm:ss"),
						"message": msg,
						"user": LoginService.user.name,
						"userId": LoginService.user.ad_user_id
					};

					var post = {};
					post["orderId"] = order.orderId;
					post["date"] =  comment.date;
					post["message"] =  comment.message;
					post["user"] =  comment.user;
					post["userId"] =  comment.userId;
					
					post = JSON.stringify(post);
					
					OnlineOrderService.addComment(post).done(function(){            		
                		
						order.comments.push(comment);						
						ctrl.comments = order.comments;
                		
                	}).fail(function(msg){
                		
                		$scope.alert(msg);
                		
                	}).always(function(){
                		
                		$scope.closeModal();
                		
                	});					
					
					//OrderService.saveOrder( order );

					$modalInstance.close();
				};
			}
		});
	}; //comment
	
	$scope.synchronizeOrder = function(){}; //do nothing
	
	$scope.void = function() {		

		//validate role
		$scope.confirm(I18n.t("do.you.want.to.void.this.quotation"), function(choice) {
			
			if(choice == false) return;
			
			$scope.showModal();

			var post = {};
			post['orderId'] = ORDER.orderId;
			post = JSON.stringify(post);

			//call Order online service
			QuotationService.voidQuotation(post).done(function(response) {
				// post          
				// ok can void  	    				

				var order = response['order'];
				
				ORDER.docAction = order.docAction;

			}).fail(function(msg) {
				//failed to create
				$scope.alert(msg);

			}).always(function() {

				$scope.closeModal();

			});		
			
		});

	};
});


