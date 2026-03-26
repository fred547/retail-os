angular.module('app').controller("RemoteAccessController", function($scope, $http, $modal, LoginService)
{
	$scope.displayRemoteAccessPopup = function()
	{
		if ("WebSocket" in window) {
		}
		else
		{
			$scope.alert("WebSocket NOT supported!");
			return;
		}
		
		if(POSTERITA_DEBUGGER.status == "Disconnected"){
			
			$scope.confirm("Do you want to enable remote access?", function(result){
				if(result){
					
					POSTERITA_DEBUGGER.connect(function(){
						$scope.info("Connected");
					});
				}
			});			
		}
		else
		{
			$scope.confirm("Remote access is currently enabled. Do you want to disconnect?", function(result){
				if(result){
					POSTERITA_DEBUGGER.disconnect(function(){
						$scope.info("Disconnected");
					});
				}
			});			
		}		
		
	};
});