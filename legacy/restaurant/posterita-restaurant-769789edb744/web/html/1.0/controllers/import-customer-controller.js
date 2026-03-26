angular.module('app').controller('ImportCustomerController', function( $scope, $modal, LoginService, $http, $location ){
	   
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
       
        var url = serverAddress + '/ImporterAction.do?action=getOfflinePage&importer=CustomerImporter&json='+params;
       
        document.getElementById("import-customer-frame").src = url;
       
    }, function(error)
    {
        $scope.alert(I18n.t("failed.to.load.importer"));
    });
   
});