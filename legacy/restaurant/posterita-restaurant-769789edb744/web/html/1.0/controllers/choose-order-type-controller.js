angular.module('app').controller('ChooseOrderTypeController', function( $scope, $modal, $state, $location, TableService, ShoppingCartService, LoginService ){
		
	var ctrl = this;
	
	ctrl.requestPIN = function(type){
		
		if(type == 'D'){
			$scope.requestPin(function(){
				$state.go("tables");
			});					
		}
		else
		{
			$scope.requestPin(function(){
				ctrl.showTakeAwayPopup();				
			});					
		}		
	};
	
	ctrl.showTakeAwayPopup = function(){
		
		$modal.open(
				{
					templateUrl: '/html/popups/take-away-info.html',
					//size: 'lg',
					scope : $scope,
					controllerAs: '$ctrl',
					controller: function($scope, $modalInstance, TableService)
					{	
						var ctrl = this;
						
						ctrl.ok = function()
						{														
							$modalInstance.close();
							
							var commandInfo = {
									"type": "T", 
									"takeAwayId" : 0,
									"customer" : ctrl.customer,
									"phone" : ctrl.phone,
									"time" : ctrl.time									
								};
							
							/*
							$location.path("/order-screen").search({
								'commandInfo' : JSON.stringify(commandInfo)
							});	
							*/
							
							$state.go("order-screen", {
								"action" : "take-away",
								"commandInfo": commandInfo
							});
						};
						
						ctrl.cancel = function(){
							
							$modalInstance.close();
						};
					}
				});
		
	};
	
});