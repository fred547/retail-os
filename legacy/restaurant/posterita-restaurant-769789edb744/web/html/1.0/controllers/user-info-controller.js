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