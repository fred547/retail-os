angular.module('app').controller('RequestSupportController', function($scope, $modal)
{
	$scope.displayRequestSupportPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/request-support.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				var $ctrl = this;
				$ctrl.sendRequest = function()
				{
					var post = {};
					post["email"] = $ctrl.email;
					post["description"] = $ctrl.description;
					post = JSON.stringify(post);
					SupportService.request(post).done(function(json)
					{
						if (json.sent == true)
						{
							$scope.info(I18n.t("your.request.was.successfully.sent"));
						}
						else
						{
							$scope.alert(I18n.t("failed.to.process.your.request"));
						}
					}).fail(function(msg)
					{
						$scope.alert(msg);
					});
					$modalInstance.close();
				};
			},
		});
	};
});