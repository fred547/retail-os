angular.module('app').controller('ClockInClockOutController', function($scope, $modal, CommissionService, ClockInOutService)
{
	$scope.displayClockInOutPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/clock-in-clock-out-panel.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, LoginService, CommissionService)
			{
				var $ctrl = this;
				var terminal_id = LoginService.terminal.id;
				var getClockedInUsers = function()
				{
					ClockInOut.getClockedInUsers(terminal_id).done(function(json)
					{
						var user_id, user;
						for (var i = 0; i < json.length; i++)
						{
							user_id = json[i]['user_id'];
							user = APP.USER.getUserById(user_id);
							json[i]['name'] = user['name'];
							json[i]['time_diff'] = moment(json[i]['time_in'], 'YYYY-MM-DD HH:mm:ss').fromNow();
						}
						$scope.$apply(function()
						{
							$ctrl.users = json;
							CommissionService.updateUsers(json);
							ClockInOutService.setClockedInUsers(json);
						});
					}).fail(function(msg){
        				//failed to create
        				$scope.alert(msg);
        				
        			});
				};
				getClockedInUsers();
				$scope.$on('clock-in', function(event, data)
				{
					getClockedInUsers();
				});
				$scope.$on('clock-out', function(event, data)
				{
					getClockedInUsers();
				});
				$ctrl.clockInUser = function()
				{
					$modal.open(
					{
						templateUrl: '/html/popups/clock-in-user.html',
						size: 'sm',
						scope: $scope,
						controllerAs: '$ctrl',
						windowClass: 'topModal',
						controller: function($scope, $modalInstance, LoginService)
						{
							var terminal = LoginService.terminal;
							var $ctrl = this;
							$ctrl.clockIn = function()
							{
								// validate user
								var username = $ctrl.username;
								var password = $ctrl.password;
								var user = APP.USER.getUser(username, password);
								if (!user)
								{
									$scope.alert(I18n.t("invalid.username.password"));
									return;
								}
								// check if user
								// is active
								if (user.isactive == 'N')
								{
									$scope.alert(I18n.t("user.deactivated"));
									return;
								}
								var time = moment().format("YYYY-MM-DD HH:mm:ss");
								ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(msg)
								{
									$scope.$emit('clock-in', true);
									$modalInstance.close();
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
							};
						},
					});
				};
				$ctrl.clockOutUser = function(user)
				{
					$modal.open(
					{
						templateUrl: '/html/popups/clock-out-user.html',
						size: 'sm',
						scope: $scope,
						windowClass: 'topModal',
						resolve:
						{
							user: function()
							{
								return user;
							}
						},
						controllerAs: '$ctrl',
						controller: function($scope, $modalInstance, user, LoginService)
						{
							var terminal = LoginService.terminal;
							var $ctrl = this;
							$ctrl.username = user.name;
							$ctrl.clockOut = function()
							{
								var username = $ctrl.username;
								var password = $ctrl.password;
								var user = APP.USER.getUser(username, password);
								if (!user)
								{
									$scope.alert(I18n.t("invalid.username.password"));
									return;
								}
								var time =  DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
								ClockInOut.clockOut(terminal.id, user.ad_user_id, time).done(function(msg)
								{
									$scope.$emit('clock-out', true);
									$modalInstance.close();
								}).fail(function(msg)
								{
									$scope.alert(msg);
								});
							};
						},
					});
				};
			},
		});
	};
});