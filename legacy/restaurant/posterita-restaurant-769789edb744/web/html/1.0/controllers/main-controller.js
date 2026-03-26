angular.module('app').controller("MainController", function($scope, $location, $state, $timeout, $q, LoginService, CommissionService, ClockInOutService) {
	
	$scope.requestPin = function(callback){
		
		$scope.pin(function(pin){
			
			//validate PIN			
			var user = APP.USER.getUserByPin(pin);						
			
			if(user == null){
				$scope.alert("Invalid PIN!");
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
					$scope.alert("User not clocked-in!");
				}				
				
			}
			
		});
		
	};
	
	$scope.validatePath = function(path, params){	
		
		console.log('Validating path -> ' + path);
		
		$scope.requestPin(function(){
			$state.go(path, params);
		});		
	};
	
	/* restaurant */
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
	
});