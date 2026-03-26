angular.module('app').service('OnlinePageService', function(LoginService, $http, $q ){
	
	var service = this;
	
	service.open = function( page, frame_id ){
		
		var ad_client_id = LoginService.terminal.ad_client_id;
	    var u_posterminal_id = LoginService.terminal.u_posterminal_id;
	    var ad_user_id = LoginService.user.ad_user_id;
	    var ad_role_id = LoginService.role.ad_role_id;
	    var ad_org_id = LoginService.terminal.ad_org_id;
	    var ad_client_name = LoginService.terminal.ad_client_name;
	   
	    var post = {};
	    post['action'] = "systemInfo";
	    post = JSON.stringify(post);
	    var url = "/system?json=" + post;
	    
	    var defer = $q.defer();
	   
	    $http.post(url).then(function(response)
	    {
	        var info = response["data"];
	        var serverAddress = info["server-address"];
	       
	        var params = {};
	        params['ad_client_id'] = ad_client_id;
	        params['u_posterminal_id'] = u_posterminal_id;
	        params['ad_user_id'] = ad_user_id;
	        params['ad_role_id'] = ad_role_id;
	        params['ad_org_id'] = ad_org_id;
	        params['ad_client_name'] = ad_client_name;
	       
	        params = JSON.stringify(params);
	        
	        var external_url = "/OfflineDataAction.do?action=getOfflinePage&page=" + page + "&json=" + params;
	       
	        var remote_url = serverAddress + external_url;
	       
	        var frame = document.getElementById(frame_id);
	        
	        if(frame)
	        {
	        	frame.src = remote_url;
	        	defer.resolve('Opening external url');
	        }
	        else
	        {
	        	defer.reject("Invalid frame id: " + frame_id);
	        }        
	        
	       
	    }, function(error)
	    {
	    	defer.reject(error);
	    });
	    
	    return defer.promise;
	    
	};
	
});