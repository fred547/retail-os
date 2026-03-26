angular.module("app").controller("TableController", function( $scope, $modal, $http, $timeout, $state, TableService, ShoppingCartService, LoginService ){
	
	var ctrl = this;
	ctrl.identifier = APP.UTILS.UUID.getUUID();
	ctrl.order_id = 0;
	
	ctrl.role = LoginService.role;
	
	//ctrl.tables = TableService.getTables();
	ctrl.tables = [];	
	ctrl.myIndex = 0;
	ctrl.previous = function(){
		ctrl.myIndex = ctrl.myIndex - 60;
	};
	ctrl.next = function(){
		ctrl.myIndex = ctrl.myIndex + 60;
	};
	
	TableService.getTables().then(function (response){
		if(response.data){
			ctrl.tables = response.data;
			ctrl.showTableGroup(0);
		}
	});
	
	
	ctrl.showTableGroup = function(group){
		ctrl.activeGroup = group;
				
		var count  = parseInt(ctrl.tables.length/4);
		var first = group * count;
		var last = (group + 1) * count;
		
		var table = null;
		var table_id = null;
		
		for(var i=0; i<ctrl.tables.length; i++)
		{			
			table = ctrl.tables[i];
			table_id = table.table_id;			
			
			if(table_id >= first && table_id < last)
			{
				table.visible = true;
			}
			else
			{
				table.visible = false;
			}
			
			if(table.last_updated != "" && table.waiter != ""){
				
				table.timediff = moment(table.last_updated, "YYYY-MM-DD HH:mm:ss").fromNow();
			}
			else
			{
				table.timediff = "";
			}
		}
	};
	
	ctrl.activeTable = null;
	ctrl.activeGroup = null;
	
	$scope.setActiveTable = function(table){
		
		ctrl.activeTable = table;		
		TableService.setActiveTable( table );
	};
	
	$scope.getActiveTable = function(){
		return ctrl.activeTable;
	};
	
	$scope.refreshTables = function( tables ){
		
		var activeTable = ctrl.activeTable;
		
		ctrl.tables = tables;
		ctrl.setActiveTableId( activeTable.table_id );
		ctrl.showTableGroup(ctrl.activeGroup);		
		
	};
	
	ctrl.refresh = function(){
		
		$scope.showModal();
		
		TableService.getTables().then(function (response){
			
			$scope.closeModal();
			
			if(response.data){
				ctrl.tables = response.data;
				ctrl.showTableGroup(ctrl.activeGroup);
			}
		}, function(err){
			
			$scope.closeModal();
			$scope.alert("Failed to load tables! Reason: " + err);
		});
	};
	
	ctrl.setActiveTableId = function(table_id){
		
		var table;
		
		for(var i=0; i<ctrl.tables.length; i++){
			
			table = ctrl.tables[i];
			
			if(table["table_id"] == table_id){
				
				$scope.setActiveTable(table);
				break;
			}
		}
	};
		
	ctrl.selectTable = function(table){
		this.activeTable = table;
	};	
	
	
	ctrl.reserveTable = function(){
		/*this.activeTable.status = "R";*/
		var table = this.activeTable;		
		
		$scope.showModal();
		
		TableService.reserveTable( table.table_id, ctrl.identifier ).then(function (response){
			
			$scope.closeModal();
			
			if(response.data){
				
				if(response.data.error){
					$scope.alert(response.data.error);
					return;
				}
				
				$scope.refreshTables( response.data );
			}
		}, function(err){
			
			$scope.closeModal();
			$scope.alert("Failed to reserve table! Reason: " + err);
		});
	}	
	
	ctrl.placeOrder = function(){
		
		var table = this.activeTable;
		
		_placeOrder(table);
		
	}
	
	var _placeOrder = function(table){		
		
		if( table.order_id.length == 0 ){
			
			var commandInfo = {
					"type": "D", 
					"tableId" : table.table_id,
					"orderId" : 0
			};
			
			
			$state.go("order-screen", {
				"commandInfo": commandInfo,
				"action" : "placeOrder"
			});
			
		}
		else
		{
			var commandInfo = {
					"type": "D", 
					"tableId" : table.table_id,
					"orderId" : table.order_id
			};
						
			$scope.showModal();
			
			$http.get("/json/orders/" + table.order_id).then( function( response ){
				
				var order = response.data;			
								
				/* validate table_id */
				if(order.commandInfo && order.commandInfo.tableId != commandInfo.tableId){
									
					$scope.alert("Table mismatch error! Order is assigned to Table #" + order.commandInfo.tableId);
					return;
				}				
				
				$state.go("order-screen", {
					"commandInfo": commandInfo,
					"action": "invokeOrder",
					"uuid" : commandInfo["orderId"],
					"order" : order
				});		
				
				$scope.closeModal();
				
			}, function(err){
				
				$scope.closeModal();
				
				$scope.alert("Failed to load order! Reason: " + err);
				
			});
			
			
		}			
		
	}
	
	ctrl.settlePayment = function(){
		
		var table = this.activeTable;
		
		var order_id = table.order_id;
		
		$scope.showModal();
		
		$http.get("/json/orders/" + order_id).then( function( response ){
			
			var order = response.data;
			
			var commandInfo = {
					"type": "D", 
					"tableId" : table.table_id,
					"orderId" : table.order_id
			};
			
			$state.go("order-screen", {
				"commandInfo": commandInfo,
				"action": "invokeOrder",
				"uuid" : commandInfo["orderId"],
				"order" : order
			});
			
			$scope.closeModal();
			
		}, function(err){
			
			$scope.closeModal();
			
			$scope.alert("Failed to load order! Reason: " + err);
			
		});
		
	}
	
	ctrl.billTable = function(){
		
		var table = this.activeTable;	
		
		var order_id = table.order_id;	
		
		$scope.showModal();
		
		TableService.updateTableStatus( table.table_id, "B", ctrl.identifier ).then(function (response){			
			
			if(response.data){
				
				$scope.refreshTables( response.data );					
				
				$http.get("/json/orders/" + order_id).then( function( response ){
					
					$scope.closeModal();
					
					var order = response.data;
					APP.RESTAURANT.printBill( order );
					
				}, function(err){
					
					$scope.closeModal();
					
					$scope.alert("Failed to load order! Reason: " + err);
					
				});
			}
			else
			{
				$scope.closeModal();
			}
			
		}, function(err){
			
			$scope.closeModal();
			$scope.alert("Failed to update table status!");
		});
		
		//1. get bill
		//2. print bill
		//3. update table status
		
	}
	
	ctrl.cancelReservation = function(){
		
		$scope.showModal();
		
		var table = this.activeTable;		
		
		TableService.cancelReservation( table.table_id, ctrl.identifier ).then(function (response){
			if(response.data){
				
				$scope.closeModal();
				
				if(response.data.error){
					$scope.alert(response.data.error);
					return;
				}
				
				$scope.refreshTables( response.data );
			}
		}, function(err){
			
			$scope.closeModal();
			$scope.alert("Failed to cancel reservation! Reason: " + err);
		});
	}
	
	ctrl.clearTable = function(){		
		
		var table = this.activeTable;		
		
		$scope.confirm("Do you want to clear Table# " + table.name, function( result ){
			
			if(result == true){
				
				$scope.showModal();
				
				TableService.clearTable( table.table_id, ctrl.identifier ).then(function (response){
					
					$scope.closeModal();
					
					if(response.data){
						
						if(response.data.error){
							$scope.alert(response.data.error);
							return;
						}
						
						$scope.refreshTables( response.data );
					}
				}, function(err){
					
					$scope.closeModal();
					$scope.alert("Failed to clear table! Reason: " + err);
				});
				
				return;
			}
			
		});
	};
	
	ctrl.switchTable = function(){
		
		$modal.open(
		{
			templateUrl: "/html/popups/switch-table.html",
			size: "lg",
			scope : $scope,
			controllerAs: "$ctrl",
			controller: function($scope, $modalInstance, TableService)
			{	
				var ctrl = this;
				ctrl.activeTable = $scope.getActiveTable();
				
				TableService.getAvailableTables().then( function(response){
					
					if(response.data){
						
						if(response.data.error){
							$scope.alert(response.data.error);
							return;
						}
						
						ctrl.availableTables = response.data;
					}
				}, function(err){
					
					$scope.closeModal();
					$scope.alert("Failed to get tables! Reason: " + err);
				});
				
				ctrl.setToTable = function(table){
					
					$scope.to_table = table;
					
				};
				
				ctrl.ok = function()
				{
					$scope.showModal();
					
					var from_table = $scope.getActiveTable();
					var to_table = $scope.to_table;
					
					TableService.switchTable( from_table["table_id"], to_table["table_id"], ctrl.identifier ).then( function(response){
						
						$scope.closeModal();
						
						if(response.data){
							
							if(response.data.error){
								$scope.alert(response.data.error);
								return;
							}
							
							$scope.setActiveTable(to_table);
							$scope.refreshTables(response.data);
							
							//update order cache
							//APP.ORDER.initialize();
							
							//send note to kitchen
							APP.RESTAURANT.printSwitchTableNote(from_table, to_table, from_table.waiter);
						}
					}, function(err){
						
						$scope.closeModal();
						$scope.alert("Failed to switch table!");
					});					
					
					$modalInstance.close();
				};
				
				ctrl.cancel = function(){
					
					$modalInstance.close();
				};
			}
		});		
		
	};
	
	ctrl.mergeTables = function(){
		
		$modal.open(
		{
			templateUrl: "/html/popups/merge-tables.html",
			size: "lg",
			scope : $scope,
			controllerAs: "$ctrl",
			controller: function($scope, $modalInstance, TableService)
			{	
				var ctrl = this;
				ctrl.activeTable = $scope.getActiveTable();
				ctrl.availableTables = [];
				
				$scope.showModal();
				
				TableService.getAvailableTables().then( function(response){
					
					$scope.closeModal();
					
					if(response.data){
						
						var availableTables = response.data;
						
						//check for active table in list
						if( ctrl.activeTable.status == "A" )
						{
							//ok present in available tables list
						}
						else
						{
							//add available table to list
							availableTables.push( ctrl.activeTable );
						}
						
						ctrl.availableTables = availableTables;
					}
				}, function(err){
					
					$scope.closeModal();
					$scope.alert("Failed to load tables!");
				});
				
				ctrl.ok = function()
				{
					var table = $scope.getActiveTable();
					
					var child_table_ids = ""; //1,5,6
					
					var selectedTables = ctrl.getSelectedTables();
					
					for( var i=0; i<selectedTables.length; i++){
						if(i > 0){
							child_table_ids += ",";
						}
						
						child_table_ids += selectedTables[i].table_id;
					}
					
					$scope.showModal()
					
					TableService.mergeTables( table["table_id"], child_table_ids, ctrl.identifier ).then( function(response){
						
						$scope.closeModal();
						
						if(response.data){
							
							if(response.data.error){
								$scope.alert(response.data.error);
								return;
							}
							
							$scope.setActiveTable(table);
							$scope.refreshTables(response.data);
						}
						
						$modalInstance.close();
						
					}, function(err){
						
						$scope.closeModal();
						$scope.alert("Failed to merge tables! Reason: " + err);
					});							
					
				};
				
				ctrl.cancel = function(){
					
					$modalInstance.close();
				};
				
				ctrl.toggleTable = function(table){
					table.selected = !table.selected;
				};
				
				ctrl.getSelectedTables = function(){
					
					var selectedTables = [];
					var table;
					
					for(var i=0; i< ctrl.availableTables.length; i++){
						
						table = ctrl.availableTables[i];
						
						if( table.selected ){
							selectedTables.push(table);
						}
					}
					
					return selectedTables;
				};
			}
		});			
	
	};
	
	/*websocket*/
	var socket = null;
	var retryCount = 0;

	var _connectSocket = function() {

	    retryCount++;

	    if (retryCount > 3) {

	        $scope.showError = true;
	        $scope.error = "Server is offline!";

	        $scope.alert($scope.error, function() {

	        });
	        return;
	    }

	    console.log("Trying to " + (retryCount == 1 ? "connect" : "reconnect") + " to Table listener ...");

	    try {
	        var x = window.location.origin.substr(4);

	        socket = new WebSocket("ws" + x + "/websocket/");
	        socket.onopen = function(e) {

	            $scope.showError = false;

	            console.log("TableController [open] Connection established");
	            console.log("Sending to server");
	            socket.send(JSON.stringify({
	                "identifier": ctrl.identifier,
	                "type": "onopen",
	                "data": {},
	                "broadcast": false
	            }));
	        };

	        socket.onmessage = function(event) {
	            console.log("[message] Data received from server: " + event.data);

	            if (event.data.charAt(0) != "{") {
	                return;
	            }

	            var data = JSON.parse(event.data);

	            if (ctrl.identifier == data.identifier) {
	                console.log("ignore");
	            } else {
	            	console.log("refreshing tables ...");
	                TableService.getTables().then(function(response) {
	                    if (response.data) {
	                        ctrl.tables = response.data;
	                        ctrl.showTableGroup(ctrl.activeGroup);
	                    }
	                },function(err){
	                	$scope.alert("Failed to refresh tables! Reason: " + err);
	                });
	            }
	        };

	        socket.onclose = function(event) {
	            if (event.wasClean) {
	                console.log("[close] Connection closed cleanly, code=" + event.code + " reason=" + event.reason);
	            } else {
	                // e.g. server process killed or network down
	                // event.code is usually 1006 in this case
	                console.log("[close] Connection died");

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



	$timeout(function() {
	    _connectSocket();
	});
   
});