angular.module('app').controller("AboutController", function($scope, $http, $modal, LoginService)
{
	$scope.displayAboutPopup = function()
	{
		var post = {};
		post['action'] = "systemInfo";
		post = JSON.stringify(post);
		var url = "/system?json=" + post;
		$http.post(url).then(function(response)
		{
			var terminal = LoginService.terminal;
			var store = LoginService.store;
			var info = response["data"];
			info.terminal = terminal['u_posterminal_name'];
			info.store = store['name'];
			info.sequence_prefix = terminal['sequence_prefix'];
			$modal.open(
			{
				templateUrl: '/html/popups/about.html',
				//size: 'lg',
				//scope : $scope,
				resolve:
				{
					'info': function()
					{
						return info;
					}
				},
				controllerAs: '$ctrl',
				controller: function($scope, $modalInstance, info)
				{
					var $ctrl = this;
					this.info = info;
				}
			});
		}, function(error)
		{
			$scope.alert(I18n.t("failed.to.request.system.info"));
		});
	};
});