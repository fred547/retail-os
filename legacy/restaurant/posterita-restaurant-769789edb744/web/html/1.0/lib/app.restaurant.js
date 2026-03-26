angular.module('app').run(function($rootScope, $http, $transitions, $q, $timeout, $state, $modal, ShoppingCartService, TableService, LoginService){
	
	var uuid = APP.UTILS.UUID.getUUID();
	
	$rootScope.lockTable = function(tableId){	
		
		console.log('User:' + uuid + " locked table:" + tableId);
		
		return TableService.lockTable(tableId, uuid);
	};
	
	$rootScope.unLockTable = function(tableId){
		
		console.log('User:' + uuid + " unlocked table:" + tableId);
		
		return TableService.unlockTable(tableId, uuid);
	};
	
	$transitions.onBefore({ to: 'order-screen' }, function(transition) {
		
		var params = transition.params('to');
		
		var commandInfo = params.commandInfo; //order-screen place order
		  
		  if(commandInfo == null && params.order && params.order.commandInfo){ //view-order
			  commandInfo = params.order.commandInfo;
		  }
		  
		  if(params.order != null){
			  
			  var order = params.order;
			  
			  if(order.docAction == 'CO'){
				  
				  var deferred = $q.defer();
				  
				  if(order.tenderType == 'Mixed'){
					  
					  var openAmt = new BigNumber(order.grandTotal);
					  
					  var payments = order.payments;
					  
					  for(var i=0; i<payments.length; i++){
						  
						  openAmt = openAmt.minus( payments[i].payAmt );
					  }
					  
					  if(openAmt.comparedTo(new BigNumber(0)) == 0){
						  
						  deferred.resolve(true);						  
					  }
					  
				  }
				  else 
				  {
					  deferred.resolve(true);
				  }
				  
				  return deferred.promise;
			  }
		  }
		  
		  if(commandInfo && commandInfo.type == 'D'){
			  
			  var tableId = commandInfo.tableId;			  

			  var deferred = $q.defer();
			  
			  $rootScope.lockTable(tableId).then(function(response){
				  
				  var data = response.data;					  
				  var lock = data.lock; 
				  
				  if(!lock){
					  
					  $rootScope.alert("Table " + tableId + " is currently locked!", function(){
						  deferred.resolve(false);
					  });						  
				  }
				  else
				  {
					  deferred.resolve(true);
				  }
				  
			  }, function(err){
				  
			  });
			  
			  return deferred.promise;
		  
			  
		  }
		  
		  return true;
	});
	
	$transitions.onSuccess({}, function(transition) {
	  //restaurant release lock on tables
	  var from = transition.from().name;
	  var to = transition.to().name;
	  
	  if(from == 'order-screen'){
		  console.log('Resetting shopping cart - left order-screen');
		  ShoppingCartService.reset(false);
	  }
	  
	  if( (from == 'order-screen' && to != 'view-order') || (from == 'view-order' && to != 'order-screen') ){
		  var params = transition.params('from');
		  
		  var commandInfo = params.commandInfo; //order-screen place order
		  
		  if(commandInfo == null && params.order && params.order.commandInfo){ //view-order
			  commandInfo = params.order.commandInfo;
		  }
		  
		  if(commandInfo && commandInfo.type == 'D'){			  
			  var tableId = commandInfo.tableId;
			  $rootScope.unLockTable(tableId);
		  }
	  }
	  
	});
	
	//websocket communication
	var socket = null;
	var retryCount = 0;
	
	var _onSocketConnectionFailure = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/server-down.html',
			backdrop: 'static',
			// size: 'lg',
			// scope : $scope,
			windowClass: 'topModal',
			keyboard : false,
			resolve:
			{					
			},
			controller: function($scope, $modalInstance)
			{
				this.retry = function()
				{
					$modalInstance.close();
					retryCount = 0;
					_connectSocket();
				};
			},
			controllerAs: '$ctrl'
		});
	};

	var _connectSocket = function() {

	    retryCount++;

	    if (retryCount > 3) {

	    	_onSocketConnectionFailure();
	    	
	    	return;
	    }

	    console.log('Trying to ' + (retryCount == 1 ? 'connect' : 'reconnect') + ' to server ...');

	    try 
	    {
	        var x = window.location.origin.substr(4);

	        socket = new WebSocket("ws" + x + "/table-lock-websocket/");
	        socket.onopen = function(e) {
	            console.log("[open] Connection established!");
	            
	            socket.send(JSON.stringify({
					"identifier" : uuid,
					"action" : "register"
				}));
	        };

	        socket.onmessage = function(event) {
	            console.log("[message] Data received from server: " + event.data);	            
	        };

	        socket.onclose = function(event) {
	            if (event.wasClean) {
	                console.log("[close] Connection closed cleanly, code=" + event.code + " reason=" + event.reason);
	            } else {
	                // e.g. server process killed or network down
	                // event.code is usually 1006 in this case
	                console.log('[close] Connection died');

	                $timeout(function() {
	                    _connectSocket();
	                }, 250);
	            }
	        };

	        socket.onerror = function(error) {
	            console.log("[error] " + error.message);
	        };

	    } catch (e) {
	        console.log(e);
	    }

	};
	
	$timeout(function(){
		 _connectSocket();
	});
	
	/*
	 
	 Value	State		Description
		0	CONNECTING	Socket has been created. The connection is not yet open.
		1	OPEN		The connection is open and ready to communicate.
		2	CLOSING		The connection is in the process of closing.
		3	CLOSED		The connection is closed or couldn't be opened.
	 
	 */
});
	  
	  