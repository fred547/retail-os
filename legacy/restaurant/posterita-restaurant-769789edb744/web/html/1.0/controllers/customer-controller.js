angular.module('app').controller('CustomerController', function($scope, $modal, CustomerService, LoginService)
{	
	if (CustomerService.default_customer == null)
	{
		var terminal = LoginService.terminal;
		var c_bpartner_id = terminal['c_bpartner_id'];
		var bp = APP.BP.getBPartnerById(c_bpartner_id);
		CustomerService.setDefaultCustomer(bp);
	}
	
	$scope.selectedCustomer = CustomerService.getCustomer();	
	// autocomplete
	
	$scope.searchCustomers = function(term)
	{
		var customers = CustomerService.searchCustomer(term);
				
		return customers;
	};
	$scope.$watch('selectedCustomer', function(newValue, oldValue, scope)
	{
		if( typeof newValue == 'string' || newValue == null){
			
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
						
						jQuery( document ).trigger("customer:created", bp);
						
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