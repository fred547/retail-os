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
			//var login = localStorage.getItem("#LOGIN-DETAILS");
			var login = null;
			
			if( login != null ){
				
				login = JSON.parse( login );
				var user_id = login.user_id;
				
				var user = APP.USER.getUserById(user_id);
				
				if(user != null){
					
					var role = APP.ROLE.getRoleById(user.ad_role_id);
					
					LoginService.user = user;
					LoginService.role = role;
					
					$timeout(function(){
						$location.path("/second-splash");
						$scope.closeModal();
					});
					
					return;
				}				
			}
			
			$timeout(function(){
				$location.path("/login");
				$scope.closeModal();
			});
			
		}
				
		
	}).fail(function(msg){
		// failed to create
		$scope.alert(msg);
		
	}).always(function()
	{
		$scope.closeModal();
	});
});