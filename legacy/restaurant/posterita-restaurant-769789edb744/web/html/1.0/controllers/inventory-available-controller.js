angular.module('app').controller('InventoryAvailableController', function($scope, $modal, LoginService)
{
	$scope.displayInventoryAvailable = function()
	{
		$scope.showModal();
		var post = {};
		post = JSON.stringify(post);
		StockService.inventoryAvailable(post).done(function(response)
		{
			var inventory = {
				'terminal': LoginService.terminal.u_posterminal_name,
				'store': LoginService.store.name,
				'qtyonhand': response.qtyonhand
			};
			$modal.open(
			{
				templateUrl: '/html/popups/inventory-available.html',
				//size: 'lg',
				//scope : $scope,
				resolve:
				{
					'inventory': function()
					{
						return inventory;
					}
				},
				controllerAs: '$ctrl',
				controller: function($scope, $modalInstance, inventory)
				{
					var ctrl = this;
					ctrl.inventory = inventory;					
				}
			});
		}).fail(function(err)
		{
			$scope.alert(err);
		}).always(function()
		{
			$scope.closeModal();
		});
	};
});