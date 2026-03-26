var socket = null;
	var retryCount = 0;
	
	var _connectSocket = function(){
		
		retryCount ++;
		
		if(retryCount > 3){
			
			$scope.showError = true;
			$scope.error = "Server is offline!";
			
			$scope.alert($scope.error, function(){
				
			});
			return;
		}
		
		console.log('Trying to ' + (retryCount == 1 ? 'connect' : 'reconnect') + ' to Table listener ...');
		
		try
		{
			var x = window.location.origin.substr(4);		
			
			socket = new WebSocket("ws" + x + "/websocket/");
			socket.onopen = function(e) {
				
				$scope.showError = false;
				
				console.log("TableController [open] Connection established");
				console.log("Sending to server");
				socket.send(JSON.stringify({
				  "identifier" : $scope.SESSION_IDENTIFIER,
				  "type" : "onopen",
				  "data" : {},
				  "broadcast" : false
				}));
			};

			socket.onmessage = function(event) {
			    console.log("[message] Data received from server: " + event.data );
			    
			    if(event.data.charAt(0) != "{"){
			    	return;
			    }
			    	
			    var data = JSON.parse(event.data);
				
				if( $scope.SESSION_IDENTIFIER == data.identifier ){
					console.log("ignore");
				}
				else
				{
					TableService.getTables().then(function (response){
						if(response.data){
							ctrl.tables = response.data;
							ctrl.showTableGroup(ctrl.activeGroup);
						}
					});
				}
			};

			socket.onclose = function(event) {
			  if (event.wasClean) {
				  console.log("[close] Connection closed cleanly, code=" + event.code + " reason=" + event.reason);
			  } else {
			    // e.g. server process killed or network down
			    // event.code is usually 1006 in this case
				  console.log('[close] Connection died');
				  
				  $timeout(function(){ 
					  _connectSocket();
				  }, 250);
			  }
			};
			
			socket.onerror = function(error) {
				console.log("[error] " + error.message);
			};
			
		}
		catch(e)
		{
			console.log(e);
		}
		
	};
	
	
	
	$timeout(function(){
		 _connectSocket();
	});
	
	
	
	if(socket){
		socket.send(JSON.stringify({
		  "identifier" : $scope.SESSION_IDENTIFIER,
		  "type" : "onopen",
		  "data" : {},
		  "broadcast" : true
	  }));
	}
	
	$timeout(function(){
		if($scope.commandInfo.type == "D"){
			
			var uuid = APP.UTILS.UUID.getUUID();
			
			var socket = null;
			
			var _openSocket = function(tableId){
				
				try
				{
					var x = window.location.origin.substr(4);		
					
					socket = new WebSocket("ws" + x + "/table-websocket/");
					socket.onopen = function(e) {
					  console.log("OrderScreenController [open] Connection established");
					  console.log("Sending to server");
					  
					  var msg = {
						"identifier" : uuid,
						"tableId" : tableId	  
					  };
					  
					  msg = JSON.stringify( msg );
					  
					  socket.send(msg);
					  
					};

					socket.onmessage = function(event) {
					    console.log("[message] Data received from server: " + event.data );	
					    
					    var result = JSON.parse(event.data);
					    
					    if(result.isTableLocked == true){
					    	$scope.info("Table #" + tableId + " is currently locked!", function(){
					    		/*$location.path("/tables");*/
					    		window.history.back();
					    	});
					    }
					    
					};

					socket.onclose = function(event) {
					  if (event.wasClean) {
						  console.log("[close] Connection closed cleanly, code=" + event.code + " reason=" + event.reason);
					  } else {
					      console.log('[close] Connection died');
					  }
					};

					socket.onerror = function(error) {
						console.log("[error] " + error.message);
					};		
				}
				catch(e)
				{
					console.log(e);
				}
				
			};	
			
			//open table websocket
			_openSocket($scope.commandInfo.tableId);
			
			$scope.$on('$locationChangeStart', function (event, next, current) {
				console.log("closing web socket ...");
				socket.close();
			});
			
		}
	}, 500);
	
	
	//view order
	$timeout(function(){
		
		$scope.commandInfo = order.commandInfo;
		
		if($scope.commandInfo.type == "D"){
			
			var uuid = APP.UTILS.UUID.getUUID();
			
			var socket = null;
			
			var _openSocket = function(tableId){
				
				try
				{
					var x = window.location.origin.substr(4);		
					
					socket = new WebSocket("ws" + x + "/table-websocket/");
					socket.onopen = function(e) {
					  console.log("ViewOrderController [open] Connection established");
					  console.log("Sending to server");
					  
					  var msg = {
						"identifier" : uuid,
						"tableId" : tableId	  
					  };
					  
					  msg = JSON.stringify( msg );
					  
					  socket.send(msg);
					  
					};

					socket.onmessage = function(event) {
					    console.log("[message] Data received from server: " + event.data );	
					    
					    var result = JSON.parse(event.data);
					    
					    if(result.isTableLocked == true){
					    	$scope.info("Table #" + tableId + " is currently locked!", function(){
					    		/*$location.path("/tables");*/
					    		window.history.back();
					    	});
					    }
					    
					};

					socket.onclose = function(event) {
					  if (event.wasClean) {
						  console.log("[close] Connection closed cleanly, code=" + event.code + " reason=" + event.reason);
					  } else {
					      console.log('[close] Connection died');
					  }
					};

					socket.onerror = function(error) {
						console.log("[error] " + error.message);
					};		
				}
				catch(e)
				{
					console.log(e);
				}
				
			};	
			
			//open table websocket
			_openSocket($scope.commandInfo.tableId);
			
			$scope.$on('$locationChangeStart', function (event, next, current) {
				console.log("closing web socket ...");
				socket.close();
			});
			
		}
	}, 500);