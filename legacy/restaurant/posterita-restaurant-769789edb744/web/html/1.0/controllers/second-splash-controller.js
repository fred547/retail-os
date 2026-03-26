angular.module('app').controller("SecondSplashController", function($scope, $location, $timeout, $http, LoginService, CustomerService, CommissionService, ClockInOutService){	

	var store = LoginService.store;
	var terminal = LoginService.terminal;
	var user = LoginService.user;
	var role = LoginService.role;	
	
	var c_bpartner_id = terminal['c_bpartner_id'];
	
	$http.get('/json/bp/' + c_bpartner_id ).then(function(response){			
		var customer = response.data;
		CustomerService.setDefaultCustomer( customer );			
	});
	
	var time =  DateUtils.getCurrentDate(); // moment().format("YYYY-MM-DD
											// HH:mm:ss");
	ClockInOut.clockIn(terminal.id, user.ad_user_id, time).done(function(json)
	{
		var user_id, user;
		for (var i = 0; i < json.length; i++)
		{
			user_id = json[i]['user_id'];
			user = APP.USER.getUserById(user_id);
			json[i]['name'] = user['name'];
			json[i]['time_diff'] = moment(json[i]['time_in'], 'YYYY-MM-DD HH:mm:ss').fromNow();
		}
		CommissionService.setActive( LoginService.user.ad_user_id );
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
				 * forward to order-screen
				 */
				path = "/menu";
			}
			else
			{
				/*
				 * forward to open-till
				 */
				path = "/open-till";
			}
			
			$timeout(function()
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
	
});