angular.module('app').controller("CommissionController", function($scope, CommissionService)
{
	var ctrl = this;
	ctrl.getCommissions = function()
	{
		return CommissionService.getCommissions();
	}
	ctrl.setActiveSalesRep = function(user_id)
	{
		CommissionService.setActive(user_id);
		
		//set salesrep for cartline
		$rootScope.$broadcast('sales-rep-change', user_id);
	};
});