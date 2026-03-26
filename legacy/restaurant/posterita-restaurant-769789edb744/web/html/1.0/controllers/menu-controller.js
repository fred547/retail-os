angular.module('app').controller('MenuController', function($scope, $modal, LoginService){
	
	$scope.role = LoginService.role;
	
	$scope.synchronize = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/synchronize.html',
			//size: 'lg',
			//scope : $scope,
			resolve:
			{
				
			},
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				this.sync = function(){
					
					$modalInstance.close();
										
					var progress_modal = $modal.open(
					{
						templateUrl: '/html/popups/progress-modal.html',
						backdrop: 'static',
						keyboard: 'false',
						windowClass: 'modal-popup topModal',
						controller: function($scope, $modalInstance, $timeout)
						{
							$scope.msg = 'Synchronizing ...';
							var progress = "..";
							
							$scope.setProgress = function(x){
								progress = x;
							};
							
							$scope.getProgress = function(){
								return progress;
							};
							
							DataSynchronizer.synchronizePOS().done(function(json){ 
								
								//$scope.closeModal();		
								$modalInstance.close();
								
								APP.initCache().done(function(){
									
									$scope.info("POS was successfully synchronized", function(){
										
										window.location.reload();
										
									});
									
								}).fail(function(){
									
								}).always(function(){							
									
								});
		                   	 
		                    }).fail(function(msg){
		                    	
		                    	//failed
		                    	//$scope.closeModal();
		                    	$modalInstance.close();
		                    	
		                    	$scope.alert(msg);
		                    	
		                    }).always(function(){                    	
		                    	
		                    	
		                    }).progress(function(message){ 		                    	
		                    	$scope.setProgress(message);
		                    	
		                    });
							
						},
						controllerAs: '$ctrl'
					});
					
					
					
					//$scope.showModal("Synchronizing ...");
					
					
					
				};
			}
		});
		
	}
	
});