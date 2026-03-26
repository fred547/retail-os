angular.module('app', ['ui.bootstrap', 'ui.router', 'luegg.directives', 'uiSwitch']);

angular.module('app').run(function($http, $templateCache){
	
	$http.get('/html/1.0/templates/popup-tpls.html').then(function(response) {

        var $html = $('<div />',{html:response.data});
        var elements=$html.find('script');
        angular.forEach(elements,function(element){
            $templateCache.put(element.id,element.innerHTML);
        });

    });

    $http.get('/html/1.0/templates/order-screen-popup-tpls.html').then(function(response) {

        var $html = $('<div />',{html:response.data});
        var elements=$html.find('script');
        angular.forEach(elements,function(element){
            $templateCache.put(element.id,element.innerHTML);
        });

    });
    
    $http.get('/html/1.0/templates/view-order-popup-tpls.html').then(function(response) {

        var $html = $('<div />',{html:response.data});
        var elements=$html.find('script');
        angular.forEach(elements,function(element){
            $templateCache.put(element.id,element.innerHTML);
        });

    }); 

});

angular.module('app').run(['$rootScope', '$modal', '$animate', '$transitions', '$window', '$q', '$http', function($rootScope, $modal, $animate, $transitions, $window, $q, $http)
{
	$window.addEventListener('error', function (event) {
		
		var errorData = {
				"message" : event.message, 
				"source" : event.filename, 
				"lineno" : event.lineno, 
				"colno" : event.colno, 
				"error" : event.error
		};

		$rootScope.alert(JSON.stringify(errorData));
	});
	
	$transitions.onSuccess({}, function(transition) {
	  console.log(
	      "%cSuccessful Transition from " + transition.from().name +
	      " to " + transition.to().name, "color:green"
	  );
	  
	  if(transition.to().data){
		  console.log(transition.to().data);
	  }
	  
	  $rootScope.previousState = transition.from();
	  
	});	
	
	$transitions.onStart({ exiting: 'view-order' }, function(transition) {
		
		/* checking open amount on exiting page */
		/* 
		 * If a promise is returned, the transition will pause and wait for the promise to settle. 
		 * If the promise resolves to a value, the value is then processed (as if it were the return value for the hook). 
		 */		
		
		var deferred = $q.defer();
		
		var previousState = $rootScope.previousState;
		
		var params = transition.params('from');
		
		if(params == null || params.order == null) return;
		
		var order = params.order;
		
		if( order.docAction == 'CO' &&  order.tenderType == 'Mixed'){
			
			if( order.orderId && order.orderId > 0 ){
				//return true;
				deferred.resolve(true);
				return deferred.promise;
			}
			
			$rootScope.showModal();
			
			$http.get('/json/orders/' + order.id).then( function( response ){			
				
				$rootScope.closeModal();
				
				var _order = response.data;					
				var openAmt = APP.ORDER.getOpenAmt(_order).float();
				
				if(openAmt == 0){
					deferred.resolve(true);
					return;
				}
				
				//get user confirmation
				$rootScope.confirm("You have not paid this order. Do you want to leave page?", function(result){
					
					if(result == true){
						
						if(previousState != null && previousState.name == 'order-screen'){
							
							console.log('Saving unpaid order log ...');
							
							var LoginService = transition.injector().get('LoginService');
							
							var terminal = LoginService.terminal;
							var user = LoginService.user;
							var time = DateUtils.getCurrentDate(); 
							
							var post = {};
							post['action'] = "cartLog";
							post['user_id'] = user.id;
							post['terminal_id'] = terminal.id;
							post['event'] = 'Unpaid order';
							post['date_logged'] = time;
							post['qty'] = 1;
							post['amount'] = openAmt;
							post['description'] = "Order " + order.documentNo;
							
							jQuery.post('/system/', {'json': JSON.stringify(post)}, function(json, textStatus, jqXHR)
									{
								if (json == null || jqXHR.status != 200)
								{
									console.error("Failed to log unpaid order operation!");
								}
								if (json.error)
								{
									console.error("Failed to log unpaid order operation! " + json.error);
								}
							});
							
						}
		
						deferred.resolve(true);
					}
					else
					{
						deferred.resolve(false);
					}
				});				
				
				
			}, function(){
				
				$rootScope.closeModal();				
				console.log('Failed to check order balance');
				deferred.resolve(true);
				
			});			
			
		}
		else
		{
			deferred.resolve();
		}
		
		return deferred.promise;

	});
	
	POLE_DISPLAY.display("Welcome", "Posterita POS", "welcome.message");
		
	$animate.enabled(false);
	
	$rootScope.modalRef = null;
	$rootScope.showModal = function(msg)
	{
		$rootScope.modalRef = $modal.open(
		{
			templateUrl: '/html/popups/modal.html',
			backdrop: 'static',
			keyboard: 'false',
			windowClass: 'modal-popup topModal',
			resolve:
			{
				msg: function()
				{
					return msg;
				}
			},
			controller: function($scope, $modalInstance, msg )
			{
				this.msg = msg || 'Please wait ...';
			},
			controllerAs: '$ctrl'
		});
	};
	$rootScope.closeModal = function()
	{
		if (this.modalRef)
		{
			this.modalRef.close();
		}
	};
	$rootScope.alert = function(msg, callback)
	{
		$rootScope.closeModal();
		
		$modal.open(
		{
			templateUrl: '/html/popups/alert.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			resolve:
			{
				msg: function()
				{
					return msg;
				}
			},
			controller: function($scope, $modalInstance, msg)
			{
				this.msg = msg;
				this.close = function()
				{
					$modalInstance.close();
					if (callback)
					{
						callback();
					}
				};
			},
			controllerAs: '$ctrl'
		});
	};
	$rootScope.info = function(msg, callback)
	{
		$modal.open(
		{
			templateUrl: '/html/popups/info.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			resolve:
			{
				msg: function()
				{
					return msg;
				}
			},
			controller: function($scope, $modalInstance, msg)
			{
				this.msg = msg;
				this.close = function()
				{
					$modalInstance.close();
					if (callback)
					{
						callback();
					}
				};
			},
			controllerAs: '$ctrl'
		});
	};
	$rootScope.confirm = function(msg, callback)
	{
		$modal.open(
		{
			templateUrl: '/html/popups/confirm.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			resolve:
			{
				msg: function()
				{
					return msg;
				}
			},
			controller: function($scope, $modalInstance, msg)
			{
				this.msg = msg;
				this.yes = function()
				{
					$modalInstance.close();
					callback(true);
				};
				
				this.no = function()
				{
					$modalInstance.close();
					callback(false);
				};
			},
			controllerAs: '$ctrl'
		});
	};	
	
	$rootScope.input = function(title, msg, callback, allowNull, password)
	{
		$modal.open(
		{
			templateUrl: '/html/popups/input.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			resolve:
			{
				msg: function()
				{
					return msg;
				},
				
				title: function()
				{
					return title;
				},
				
				allowNull : function()
				{
					return allowNull || false;
				},
				
				password : function()
				{
					return password || false;
				}
			},
			controller: function($scope, $modalInstance, msg, title, allowNull, password )
			{
				var ctrl = this;
				
				this.title = title || '';
				this.msg = msg;
				this.password = password;
				
				this.ok = function()
				{
					$modalInstance.close();
					callback(ctrl.input);
				};
				
				this.cancel = function()
				{
					$modalInstance.close();
				};
				
				this.isValid = function()
				{
					if(allowNull) return true;
					
					return ctrl.input != null && ctrl.input.length > 0;
				};
			},
			controllerAs: '$ctrl'
		});
	};
	
	$rootScope.pin = function(callback)
	{
		$modal.open(
		{
			templateUrl: '/html/popups/pin-panel.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			resolve:
			{
				
			},
			controller: function($scope, $modalInstance)
			{
				var ctrl = this;
				
				this.ok = function()
				{
					$modalInstance.close();
					callback(ctrl.input);
				};
				
				this.cancel = function()
				{
					$modalInstance.close();
				};
				
				this.isValid = function()
				{
					return ctrl.input != null && ctrl.input.length > 0;
				};
			},
			controllerAs: '$ctrl'
		});
	};
	
}]);