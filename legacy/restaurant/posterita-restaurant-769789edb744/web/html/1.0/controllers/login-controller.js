angular.module('app').controller("LoginController", function($scope, $location, $window, LoginService, CommissionService, ClockInOutService)
{	
	var LANDING_PAGE = "/menu"; /* restaurant landing page is menu */
	$scope.closeModal();
	
	var ctrl = this;
	// Hard code user
	ctrl.username = '';
	ctrl.password = '';
	var terminal = LoginService.terminal;
	ctrl.terminal = terminal;
	
	var store = LoginService.store;
	ctrl.store = store;
	
	ctrl.exit = function(){
		
		if($window.PosteritaBrowser){
			
			$window.PosteritaBrowser.exit2();
			
		}
		
	};
	
	ctrl.login = function()
	{
		var username = ctrl.username;
		var password = ctrl.password;
		var user = APP.USER.getUser(username, password);
		if (!user)
		{
			$scope.alert(I18n.t("invalid.username.password"));
			return false;
		}
		// check if user is active
		if (user.isactive == 'N')
		{
			$scope.alert(I18n.t("user.deactivated"));
			return false;
		}
		var role = APP.ROLE.getRoleById(user.ad_role_id);
		LoginService.user = user;
		LoginService.role = role;
		var time =  DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
		ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(json)
		{
			var user_id, user;
			for (var i = 0; i < json.length; i++)
			{
				user_id = json[i]['user_id'];
				user = APP.USER.getUserById(user_id);
				
				if(user == null) continue;
				
				json[i]['name'] = user['name'];
				json[i]['time_diff'] = moment(json[i]['time_in'], 'YYYY-MM-DD HH:mm:ss').fromNow();
			}
			CommissionService.active_user_id = LoginService.user.ad_user_id;
			CommissionService.updateUsers(json);
			ClockInOutService.setClockedInUsers(json);
			
			// check till
			Till.isOpen(terminal.id).done(function(response)
			{
				$scope.closeModal();
				var isopen = response["isopen"];
				var path;
				if (isopen == true)
				{
					/*
					 * forward
					 * to
					 * LANDING_PAGE
					 */
					path = LANDING_PAGE;
				}
				else
				{
					/*
					 * forward
					 * to
					 * open-till
					 */
					path = "/open-till";
				}
				$scope.$apply(function()
				{
					$location.path(path);
				});
			}).fail(function(msg)
			{
				$scope.alert(msg);
			});
		}).fail(function(msg)
		{
			$scope.alert(msg);
		});
	};
	/*
	//start debugger
	POSTERITA_DEBUGGER.connect(terminal.id, function(x){
		console.log('Started remote debugger ' + x);
	});
	*/
});