var module = ons.bootstrap('my-app', ['onsen', 'app']);

module.directive('ngEnter', function()
{
	return function(scope, element, attrs)
	{
		element.bind("keydown keypress", function(event)
		{
			if (event.which === 13)
			{
				scope.$apply(function()
				{
					scope.$eval(attrs.ngEnter);
				});
				event.preventDefault();
			}
		});
	};
});

module.controller('AppController', function(){	
});


module.controller('MenuController', function( $scope ){
	
	$scope.exit = function(){
		
		navigator.notification.beep(1);
		
		ons.notification.confirm({
			  message: 'Do you want to exit?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse Management App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	APP.quit();   	
			    }
			  }
		});
		
	};
	
	$scope.logout = function(){
		
		navigator.notification.beep(1);
		
		ons.notification.confirm({
			  message: 'Do you want to logout?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse Management App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	APP.logout().done(function(){
			    		
			    		menu.setMainPage('page/select-user.html', {closeMenu: true});
			    		
			    	}); 	
			    }
			  }
		});
		
	};
	
});

module.controller('ServerEndpointController', function($scope){	
	
	/*disable menu*/
	menu.setSwipeable(false);
	
	$scope.endpoint = CONFIG.getServerEndpoint() || 'https://my.posterita.com';
	$scope.domain = CONFIG.getDomain() || '';
	
	$scope.ok = function(){
		
		var endpoint = $scope.endpoint;
		var domain = $scope.domain;		
		
		APP.checkServer( endpoint, domain ).done(function( data ){
			
			CONFIG.setServerEndpoint( endpoint );
			
			if(data.found && data.found === true){
				
				CONFIG.setDomain( domain );
				CONFIG.setClientId( data['ad_client_id'] );
				
				menu.setMainPage('page/select-warehouse.html', {closeMenu: true});	
				
			}
			else
			{	
				navigator.notification.beep(1);
				ons.notification.alert({message: 'Invalid domain!' , callback: function(){
					
					document.getElementById('domain').select();
					
				}});
			}
			
		}).fail(function( error ){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				document.getElementById('endpoint-url').select();
				
			}});
			
		});		
		
	}
	
	$scope.test = function(){
		
		var endpoint = $scope.endpoint;
		var domain = $scope.domain;	
		
		modal.show();
		
		APP.checkServer( endpoint, domain ).done(function( data ){
			
			if(data.found && data.found === true){
				
				navigator.notification.beep(1);
				ons.notification.alert({message: 'Connection successful' , callback: function(){					
					
					
				}});	
				
			}
			else
			{
				navigator.notification.beep(1);
				ons.notification.alert({message: 'Invalid domain!' , callback: function(){
					
					document.getElementById('domain').select();
					
				}});
			}
			
		}).fail(function( error ){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				document.getElementById('endpoint-url').select();
				
			}});
			
		}).always(function(){
			
			modal.hide();
			
		});
		
	}
		
});

module.controller('SplashScreenController', function($scope){
		
	/*disable menu*/
	menu.setSwipeable(false);
	
	/* wait for cordova to load */
	ons.ready(function(){
		
		var endpoint = CONFIG.getServerEndpoint();
		var domain = CONFIG.getDomain();
		
		if( endpoint == null || domain == null){
			
			menu.setMainPage('page/server-endpoint.html', {closeMenu: true});
			
		}
		else
		{
			modal.show();
			
			APP.checkServer( endpoint, domain ).done(function(x){			
				
				//validate warehouse
				var warehouse= CONFIG.getWarehouse();
				
				if( warehouse == null ){
					
					menu.setMainPage('page/select-warehouse.html', {closeMenu: true});
				}
				else
				{
					//validate user
					var user = CONFIG.getUser();
					
					if( user == null ){
						
						menu.setMainPage('page/select-user.html', {closeMenu: true});
					}
					else
					{
						menu.setMainPage('page/home.html', {closeMenu: true});
					}
				}
				
			}).fail(function(error){
				
				navigator.notification.beep(1);
				ons.notification.alert({message: error , callback: function(){
					
					menu.setMainPage('page/server-endpoint.html', {closeMenu: true});
					
				}});
				
			}).always(function(){
				
				modal.hide();
				
			});		
			
		}
		
	});
	
});


module.controller('HomeController', function($scope, $http, PickingListService){
	
	var user = CONFIG.getUser();
	
	$scope.role = user['role'];
		
	menu.setSwipeable(true);
	
	$scope.startPicking = function(){
		
		//look for suspended picking list
		var state = PickingListService.getSavedState();
		
		if(state == null){
			
			menu.setMainPage('page/load-document.html', {closeMenu: true});
		}
		else
		{
			ons.notification.confirm({
				  messageHTML: '<div><p>Do you want to resume last picking?</p></div>',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Resume Picking',
				  buttonLabels: ['Yes', 'No'],
				  animation: 'default', // or 'none'
				  primaryButtonIndex: 1,
				  cancelable: false,
				  callback: function(index) {
				    // -1: Cancel
				    // 0-: Button index from the left
				    if(index == 0){
				    	
				    	PickingListService.state = state;						
						menu.setMainPage('page/picking.html', {closeMenu: true});  	
				    }
				    else
				    {
				    	PickingListService.resetState();						
						menu.setMainPage('page/load-document.html', {closeMenu: true}); 
				    }
				    
				  }
			});
			
		}
		
		
	};
	
});

module.controller('AboutController', function(){
	
	var ctrl = this;
	
	ctrl.domain = CONFIG.getDomain();
	ctrl.store = CONFIG.getStore();
	ctrl.warehouse = CONFIG.getWarehouse();
	ctrl.user = CONFIG.getUser();
	ctrl.version = APP.version;
	ctrl.server = CONFIG.getServerEndpoint();
	
	ctrl.updateApp = function(){
		navigator.app.loadUrl('https://my.posterita.com/apk/warehouse-app.apk', { openExternal:true });
		//navigator.app.loadUrl('http://192.168.100.92:8081/app-debug.apk', { openExternal:true });
	};
	
});

module.controller('DocumentController', function( $scope, $http, $timeout, PickingListService ){
	
	//reset
	PickingListService.clear();
	
	var ctrl = this;
	var input = document.getElementById('documentno');
	
	input.addEventListener("keyup", function(event) {
		
		  if (event.keyCode === 13) {
		   
			  event.preventDefault();
			  
			  if( ctrl.isValid() )
			  {
				  ctrl.loadDocument();
			  }
		    
		  }
		  else
		  {
			  $timeout(function(){});
		  }
	});
	
	ctrl.isValid = function(){
		
		return ( input.value != null && input.value.length > 0 );
	};
	
	ctrl.loadDocument = function(){
		
		input.blur();
		
		var documentno = input.value;
		
		modal.show();
		
		PickingListService.loadDocument( documentno ).then( function (doc) {
			
			//validate document status
			var docStatus = doc.header.docStatus;
			
			if(docStatus == 'IP'){
				
				//validate warehouse
				var from_warehouse_id = doc.header.warehouse;
				var current_warehouse = CONFIG.getWarehouse();
				
				if(current_warehouse.m_warehouse_id == from_warehouse_id)
				{
					menu.setMainPage('page/picking.html', {closeMenu: true});
				}
				else
				{
					navigator.notification.beep(1);
					ons.notification.alert({message: 'Error: Warehouse mistmatch!' , callback: function(){
						
						input.select();
						
					}});
				}
				
				
			}
			else
			{
				navigator.notification.beep(1);
				ons.notification.alert({message: 'Error: Document has been processed! ' , callback: function(){
					
					input.select();
					
				}});
			}		    
			
			
		}, function (error) {
		    
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				input.select();
				
			}});

		}).finally(function(){
			
			modal.hide();
			
		});  
		
	};
	
	$timeout(function(){
		input.select();
	});
	
	 
});

module.controller('LoginController', function( $scope, $http, $timeout ){
	
	var ctrl = this;
	
	modal.show();
	
	APP.getUserList().done(function( data ){
		
		$timeout(function(){
			ctrl.userList = data.list;			
		});
		
	}).fail(function(error){
		
		navigator.notification.beep(1);
		ons.notification.alert({message: error , callback: function(){
			
		}});
		
	}).always(function(){
		
		modal.hide();
		
	});
	
	ctrl.store = CONFIG.getStore();
	ctrl.warehouse = CONFIG.getWarehouse();
	
	ctrl.isValid = function(){
		
		return ( ctrl.username != null && ctrl.username.length != 0 
		&& ctrl.pin != null && ctrl.pin.length != 0 );
		
	};
	
	ctrl.login = function(){
		
		modal.show();
		
		APP.login( ctrl.username, ctrl.pin ).done(function( result ){
			
			if( result.found == true ){
				
				var user = result['user'];
				
				if( user.isactive == false ){
					
					navigator.notification.beep(1);
					ons.notification.alert({message: "User has been deactivated!" , callback: function(){
						
						document.getElementById('username').select();
						
					}});
				}
				else
				{
					CONFIG.setUser( user );
					
					menu.setMainPage('page/home.html', {closeMenu: true});
				}
				
			}
			else
			{
				navigator.notification.beep(1);
				ons.notification.alert({message: "Invalid PIN!" , callback: function(){
					
					document.getElementById('pin').select();
					
				}});
			}
			
		})
		.fail(function( error ){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				document.getElementById('username').select();
				
			}});
			
		})
		.always(function(){
			
			modal.hide();
			
		});
		
	};
	
});

module.controller('WarehouseController', function( $scope, $http, $timeout ){
	
	var ctrl = this;
	
	ctrl.isValid = function(){
		
		return ctrl.store != null && ctrl.warehouse != null;
		
	};
	
	ctrl.setLocation = function(){
		
		CONFIG.setStore( ctrl.store );
		CONFIG.setWarehouse( ctrl.warehouse );
		
		menu.setMainPage('page/select-user.html', {closeMenu: true});
		
	};
	
	ctrl.storeList = null;
		
	modal.show();
	
	APP.getWarehouseList().done(function( data ){
		
		$timeout(function(){
			ctrl.storeList = data.list;			
		});
		
	}).fail(function(error){
		
		navigator.notification.beep(1);
		ons.notification.alert({message: error , callback: function(){
			
		}});
		
	}).always(function(){
		
		modal.hide();
		
	});
	
});

module.controller('PickingController', function( $scope, $http, $timeout, PickingListService, WarehouseService ){
		
	var form = document.getElementById('form');
	var container = form.parentElement;
	
	var barcode_input = document.getElementById('barcode');
	var qtypicked_input = document.getElementById('qtypicked');
	
	barcode_input.onfocus = function(){
		container.scrollTop = 0;
	};
	
	qtypicked_input.onfocus = function(){
		container.scrollTop = container.scrollHeight;
	};
	
	barcode_input.addEventListener("keyup", function(event) {
		
		  if (event.keyCode === 13) {
		   
			  event.preventDefault();
			  
			  $timeout(function(){
				  $scope.validateBarcode();
			  });
		    
		  }
		  else
		  {
			  $timeout(function(){});
		  }
	});
	
	qtypicked_input.addEventListener("keyup", function(event) {
		
		  if (event.keyCode === 13) {
		   
			  event.preventDefault();
			  
			  if($scope.isValid())
			  {
				  $timeout(function(){
					  $scope.validateLine();
				  });
			  }		    
		  }
		  else
		  {
			  $timeout(function(){});
		  }
	});
	
	$timeout(function(){
		barcode_input.value = "";
		barcode_input.focus();
	});	
	
	
	var pickingList = null;
	var qtyPickedMap = {};	
	$scope.index = -1;
	$scope.currentLine = null;
	$scope.resumed = false;
	
	var state = PickingListService.state;
	
	if( state ){
		
		pickingList = state.pickingList;
		qtyPickedMap = state.qtyPickedMap;
		$scope.index = state.index;
		$scope.currentLine = pickingList.lines[ $scope.index ];
		$scope.resumed = true;
	}
	else
	{
		pickingList = PickingListService.getDocument();
	}	
	
	$scope.pickingList = pickingList;
	$scope.lines = pickingList.lines;	
	
	$scope.isValid = function(){
		
		return ( barcode_input.value != null && barcode_input.value.length > 0 && ( qtypicked_input.value > 0 || qtypicked_input.value === 0 ) );
	};
	
	$scope.validateBarcode = function(){
		
		if( barcode_input.value != $scope.currentLine.barcode ){
			
			barcode_input.blur();
			
			navigator.notification.beep(1);
			ons.notification.alert({message: "Barcode mistmatch!" , callback: function(){
				
				barcode_input.select();
				
			}});
		}
		else
		{
			qtypicked_input.select();
		}
	};
	
	$scope.validateLine = function(){
		
		console.log('validating line-' + this.index );
		
		if( this.index >= 0 ){
			
			if( barcode_input.value != $scope.currentLine.barcode ){
				
				barcode_input.blur();
				
				navigator.notification.beep(1);
				ons.notification.alert({message: "Barcode mistmatch!" , callback: function(){
					
					barcode_input.select();
					
				}});
				
				return;
			}
			else
			{
				$scope.validateQty();
			}
			
		}
		else
		{
			$timeout(function(){
				$scope.next();
			});			
		}
		
	};
	
	$scope.validateQty = function(){
		
		qtypicked_input.blur();
		
		var actual_qty = parseInt(qtypicked_input.value);
		var expected_qty = parseInt($scope.currentLine.qtyToPick);
		
		if( actual_qty > expected_qty ){
			
			var errorMsg = "Qty picked cannot be greater than " + expected_qty;
					
			navigator.notification.beep(1);
			ons.notification.alert({message: errorMsg, callback: function(){
				
				qtypicked_input.select();
				
			}});
		}
		else if( actual_qty < expected_qty )
		{
			ons.notification.confirm({
				  messageHTML: '<div><p class="dialog-error-msg">Picked ' + actual_qty + ' of ' + expected_qty + '?</p><p>Do you want to continue?</p></div>',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Qty Mismatch',
				  buttonLabels: ['Yes', 'No'],
				  animation: 'default', // or 'none'
				  primaryButtonIndex: 1,
				  cancelable: false,
				  callback: function(index) {
				    // -1: Cancel
				    // 0-: Button index from the left
				    if(index == 0){
				    	
				    	$timeout(function(){
							$scope.next();
						});	  	
				    }
				    else
				    {
				    	qtypicked_input.select();
				    }
				    
				  }
			});
		}
		else
		{
			$timeout(function(){
				$scope.next();
			});	
		}
		
	};
	
	$scope.next = function(){
		
		console.log('next line-' + this.index );
		console.log( JSON.stringify( qtyPickedMap ) );
		
		if( this.index >= 0 ){
			
			/*
			//validate barcode
			if( $scope.barcode != $scope.currentLine.barcode ){
				
				alert("Invalid barcode " + $scope.barcode + "!");
				document.getElementById('barcode').select();
				
				return;
			}
			
			//valide qty
			if( $scope.qtypicked > $scope.currentLine.qtyToPick ){
				
				alert("Qty picked cannot be greater than " + $scope.currentLine.qtyToPick );
				document.getElementById('qtypicked').select();
				
				return;
			}
			*/
			
			$scope.currentLine.qtyPicked = qtypicked_input.value;
			
			var key = $scope.currentLine.productId + '';
			
			if(!qtyPickedMap[key]){
				
				qtyPickedMap[key] = parseInt(qtypicked_input.value);
			}
			else
			{
				qtyPickedMap[key] = parseInt(qtyPickedMap[key]) + parseInt(qtypicked_input.value);
			}
		}
		
		var skipLine = false;
		var reachedEnd = false;
		
		do {
			
			if(this.index < this.lines.length - 1){
				
				this.index = this.index + 1;
				
				$scope.currentLine = $scope.lines[ this.index ];
				barcode_input.value = "";
				qtypicked_input.value = "";
				
				var key = $scope.currentLine.productId + '';
				
				if(qtyPickedMap[key]){	
					
					var qtyToPick = parseInt($scope.currentLine.qtyToPick) - parseInt(qtyPickedMap[key]);
					
					if( qtyToPick == 0 )
					{
						$scope.currentLine.qtyPicked = 0;
						
						skipLine = true;
						
						//mark line as skip
						$scope.currentLine.skipline = true;
						
						console.log('skipping line-' + this.index );
					}
					else
					{
						skipLine = false;
						
						$scope.currentLine.qtyToPick = qtyToPick;						
					}
				}
				else
				{
					skipLine = false;
				}
				
			}
			else
			{
				reachedEnd = true;
			}
			
		} while( skipLine && !reachedEnd )
			
		//save state
		$scope.saveState();
		
		if(reachedEnd){
			
			//console.info( JSON.stringify( $scope.lines ) );
			
			PickingListService.setPicks( $scope.pickingList.header.pickingListId, $scope.lines );
			
			menu.setMainPage('page/complete-document.html', {closeMenu: true});
		}
		else
		{
			$timeout(function(){
				barcode_input.value = "";
				qtypicked_input.value = "";
				barcode_input.focus();
			});
		}
		
	};

	$scope.noStock = function(){
		
		//$scope.barcode = $scope.currentLine.barcode;		
		//$scope.qtypicked = 0;
		
		barcode_input.value = $scope.currentLine.barcode;
		qtypicked_input.value = 0;
		
		//mark line as no stock
		$scope.currentLine.nostock = true;
		
		$timeout(function(){
			$scope.next();
		});	
		
	};
	
	
	$timeout(function(){
		if($scope.resumed == false){
			$scope.next();
		}
		else
		{
			barcode_input.focus();
		}
	});	
	
	$scope.save = function(){
		
		$scope.saveState();
		
		navigator.notification.beep(1);
		ons.notification.alert({message: "Picking saved successfully" , callback: function(){
			
			menu.setMainPage('page/home.html', {closeMenu: true});
			
		}});
	};
	
	$scope.saveState = function(){
		
		var state  = {
				'pickingList' : $scope.pickingList,
				'index' : $scope.index,
				'qtyPickedMap' : qtyPickedMap
		};
		
		PickingListService.saveState( state );
	};
	
	$scope.showHistory = function(){
		
		var productId = $scope.currentLine.productId;
		
		modal.show();
		
		WarehouseService.mappingHistory( productId ).then( function ( history ){
			
			navigator.notification.beep(1);
			
			var msg = "<div style='font-size: 25px;font-weight: bold;padding: 20px 0px;'>" + history + "</div>";
			ons.notification.alert({title: "Previous Locations", messageHTML: msg , callback: function(){				
			}});
			
			
		}, function (error) {
		    
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
			}});

		}).finally(function(){
			
			modal.hide();
			
		}); 
	};
	 
});

module.controller('CompleteController', function( $scope, $http, $timeout, PickingListService ){
	
	var ctrl = this;
	
	ctrl.completeDocument = function(){
		
		modal.show();
		
		PickingListService.completePickingList().then( function (){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: "Picking completed successfully" , callback: function(){
				
				PickingListService.resetState();
				
				menu.setMainPage('page/home.html', {closeMenu: true});
				
			}});
			
			
		}, function (error) {
		    
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
			}});

		}).finally(function(){
			
			modal.hide();
			
		}); 
		
	};
	
});

module.controller('CycleCountController', function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	
	var input = document.getElementById("barcode");
	var container = document.getElementById("csv-container");

	var state = localStorage.mapping || "Location, Barcode";
	
	var locationBarcodeMap = {};
	
	var splits = state.split("\n");
	
	for(var i=1; i<splits.length; i++){
		
		locationBarcodeMap[ splits[i] ] = true;
	}
	
	
	input.addEventListener("keyup", function(event) {
		
		  if (event.keyCode === 13) {
		   
			  event.preventDefault();
			  
			  var barcode = input.value;
			  
			  $timeout(function(){
				  ctrl.scan( barcode );
			  });
		    
		  }
	});
	
	ctrl.currentLocation = null;
	ctrl.lastBarcode = null;
		
	ctrl.csv = state;
	
	ctrl.reset = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to reset?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){	    	
			    	
			    	$timeout(function(){
			    		
						ctrl.csv = "Location, Barcode";
						localStorage.mapping = ctrl.csv;
						
						ctrl.currentLocation = null;
						ctrl.lastBarcode = null;
						ctrl.barcode = null;
						
						locationBarcodeMap = {}
						
						_resetBarcode();
			    		
			    	});
			    }
			  }
			});		
		
	};
	
	ctrl.scan = function( barcode ){
		
		/* remove white spaces */
		barcode = barcode.trim();
		
		if( barcode.length == 0 ){
			
			input.blur();
			navigator.notification.beep(1);
			
			ons.notification.alert({message: "Invalid barcode!" , callback: function(){					
				
				_resetBarcode();
				
			}});
			
			return;
			
		}
		
		if( /^[\w]{4}(-\d{1,2})?$/.test( barcode ) ){
			
			ctrl.currentLocation = barcode;	
			
			_resetBarcode();
		}
		else
		{
			if( ctrl.currentLocation == null ){
				
				input.blur();
				navigator.notification.beep(1);
				
				ons.notification.alert({message: "Scan a location first!" , callback: function(){					
					
					_resetBarcode();
					
				}});
			}
			else
			{				
				if(barcode != ctrl.lastBarcode && barcode){
					
					var line = ctrl.currentLocation + "," + barcode;
					
					if( ! locationBarcodeMap[ line ] ){
						
						ctrl.lastBarcode = barcode;
						ctrl.csv += ( "\n" + line );
						container.scrollTop = container.scrollHeight;					
						localStorage.mapping = ctrl.csv;
						
						locationBarcodeMap[ line ] = true;
						
					}
					else
					{
						console.log("Detected duplicate line!");
					}
					
				}
				
				_resetBarcode();
				
			}
		}
		
	};
	
	ctrl.finishCount = function(){
		
		
		modal.show("Saving mappings ...");
		
		WarehouseService.saveMappings( ctrl.csv ).then(function( results ){
			
			ctrl.results = results;		
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				input.focus();
				
			}});
			
		}).finally(function(){
			
			modal.hide();
			
		});
		

		/*
		modal.show();
								
		APP.writeToFile( "mapping.csv", ctrl.csv, false ).done(function(msg){

			ons.notification.alert({message: msg , callback: function(){
				
				_resetBarcode();
				
			}});

		}).fail(function(error){

			ons.notification.alert({message: error , callback: function(){
				
				_resetBarcode();
				
			}});

		}).always(function(){

			modal.hide();

		});
		*/
		
	};
	
	var _resetBarcode = function(){		
		input.value="";
		input.focus();
	};
	
	$timeout(function(){
		_resetBarcode();
	});
	
});

module.controller("MoveItemController", function( $scope, $http, $timeout, WarehouseService ){
	
	var input = document.getElementById("barcode");
	
	var ctrl = this;
	ctrl.step = 1;
	
	ctrl.getLabelText = function(){
		
		if(ctrl.step == 1) return "Scan From Location";
		if(ctrl.step == 2) return "Scan Item Barcode";
		
		return "Scan To Location";
	};
	
	ctrl.getButtonText = function(){
		
		if(ctrl.step == 3){
			return "Move";
		}
		
		return "Next";
		
	};	
	
	var _focus = function(){
		
		$timeout(function(){	
			input.value="";
			input.focus();		
		});
	};
	
	var _reset = function(){
		
		input.value="";
		
		$timeout(function(){
			
			ctrl.currentLocation = null;
			ctrl.newLocation = null;
			ctrl.item = null;
			
			ctrl.step = 1;
			
			input.focus();
			
		});
		
	};
		
	ctrl.reset = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to reset?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){				    	
			    	_reset();
			    }
			  }
			});			
	
	};	
	
	ctrl.moveItem = function(){
		
		modal.show();
		
		WarehouseService.moveItem( ctrl.item, ctrl.currentLocation, ctrl.newLocation ).then(function(){
			
			var msg = "<div>Successfully moved <b>" + ctrl.item + "</b> from <b>" + ctrl.currentLocation + "</b> to <b>" + ctrl.newLocation + "</b></div>";
			
			navigator.notification.beep(1);
			ons.notification.alert({messageHTML: msg , callback: function(){
				
				_reset();
				
			}});
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
								
			}});
			
		}).finally(function(){
			
			modal.hide();
			
		});		
		
	};
	
	ctrl.isValid = function(){
		var barcode = input.value;
		return barcode != null && barcode.length > 0;
		
	};
	
	ctrl.next = function(){
		
		var barcode = input.value;
		
		if(barcode == null || barcode.length == 0){
			
			input.blur();
			
			navigator.notification.beep(1);
			ons.notification.alert({message: "Scan/Enter a barcode!" , callback: function(){
				
				input.focus();
				
			}});
			
			return;
		}
		
		if(ctrl.step == 1)
		{
			ctrl.currentLocation = barcode;
		}
		else if(ctrl.step == 2)
		{
			ctrl.item = barcode;
		}
		else
		{
			ctrl.newLocation = barcode;
		}
		
		if( ctrl.step < 3 ){
			ctrl.step = ctrl.step + 1;
			_focus();
		}
		else
		{
			ctrl.moveItem();
		}
		
	};
	
	//reset form
	_reset();	
	
});

module.controller("PutAwayController", function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	var input = document.getElementById("barcode");
	
	var barcodeMap = {};
	
	var _reset = function(){
		
		$timeout(function(){
			input.value = "";
			input.focus();
			ctrl.items = [];
			
			barcodeMap = {};
		});		
		
	};	
	
	input.addEventListener("keyup", function(event) {
		
		  if (event.keyCode === 13) {
		   
			  event.preventDefault();
			  
			  var barcode = input.value;
			  
			  $timeout(function(){
				  
				  if(! barcodeMap[ barcode ] ){
					  
					  barcodeMap[ barcode ] = true;
					  
					  ctrl.items.push( barcode );
				  }
				  	    
			  });
			  
			  input.value = "";
			  input.focus();
		    
		  }
	});
	
	
	ctrl.reset = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to reset?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){				    	
			    	_reset();
			    }
			  }
			});			
	
	};	
	
	ctrl.getMappings = function(){
		
		modal.show();
		
		WarehouseService.getMappings( ctrl.items ).then(function( mappings ){
			
			if(mappings.length == 0){
				
				navigator.notification.beep(1);
				ons.notification.alert({message: "Barcode [" + ctrl.items + "] not found!" , callback: function(){
					
				}});
			}
			else
			{
				WarehouseService.putAwayMappings = mappings;
				
				menu.setMainPage('page/put-away-item.html', {closeMenu: true});
			}
			
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
			}});
			
		}).finally(function(){
			
			modal.hide();
			
		});
		
	};
	
	ctrl.isValid = function(){
		return ctrl.items != null && ctrl.items.length > 0; 
	};
	
	_reset();
	
});

module.controller("PutAwayItemController", function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	var mappings = WarehouseService.putAwayMappings;
	var index = 0;
	
	ctrl.showNewLocation = false;
	ctrl.location = null;
	
	WarehouseService.putAwayMappings = null; /* clean service */
	
	ctrl.mapping = mappings[ index ];
	
	ctrl.next = function(){
		index = index +1;
		ctrl.mapping = mappings[ index ];
	};
	
	ctrl.isValid = function(){
		
		if(ctrl.showNewLocation == true){
			
			return document.getElementById("new-location").value.length > 0;
		}
		else
		{
			return index < mappings.length - 1;
		}
		
	};
	
	ctrl.showNewMappingView = function(){
		ctrl.showNewLocation = true;
		$timeout(function(){			
			document.getElementById("new-location").focus();
		});		
	};
	
	ctrl.addNewMapping = function(){
		
		var m_product_id = ctrl.mapping['m_product_id'];
		var newLocation = document.getElementById("new-location").value;
		
		modal.show();
		
		WarehouseService.addNewMapping( m_product_id, newLocation ).then(function(){
			
			var msg = "<div>Successfully saved new mapping <b>" + newLocation + "</b></div>";
			
			navigator.notification.beep(1);
			ons.notification.alert({messageHTML: msg , callback: function(){
								
				$timeout(function(){
					ctrl.showNewLocation = false;
					ctrl.location = null;
				});
				
				
			}});
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
								
			}});
			
		}).finally(function(){
						
			modal.hide();
			
		});	
		
		
	};
		
});

module.controller("ViewStockController", function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	var input = document.getElementById("barcode");
	
	ctrl.isValid = function(){
		
		return ( ctrl.barcode && ctrl.barcode.length > 0 );
		
	};
	
	ctrl.getStocks = function(){
		
		var barcode = ctrl.barcode;
		
		modal.show();
		
		WarehouseService.getStocks( barcode ).then(function( stocks ){
			
			if(stocks.length == 0){
				
				input.blur();
				
				navigator.notification.beep(1);
				ons.notification.alert({message: "Product not found!" , callback: function(){
					
					input.select();
					
				}});
				
			}
			else
			{
				ctrl.stocks = stocks;
				input.blur();
			}			
			
		}, function(error){
			
			input.blur();
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
				
				input.select();
				
			}});
			
		}).finally(function(){
			
			modal.hide();
			
		});
		
	};
	
	$timeout(function(){
		input.focus();
	});
	
});

module.controller("ViewProductInfoController", function ($scope, $http, $timeout, WarehouseService) {

	var ctrl = this;
	var input = document.getElementById("barcode");

	ctrl.isValid = function(){
		
		return ( ctrl.barcode && ctrl.barcode.length > 0 );
		
	};

	ctrl.getProductInfo = function(){

		var barcode = ctrl.barcode;

		modal.show();

		WarehouseService.getProductInfo(barcode).then(function (productInfo) {

			ctrl.productInfo = productInfo;
			input.blur();

		}, function (error) {

			input.blur();

			navigator.notification.beep(1);
			ons.notification.alert({
				message: error, callback: function () {

					input.select();

				}
			});

		}).finally(function () {

			modal.hide();

		});	

	};

	

	$timeout(function () {
		input.focus();
	});
});

module.controller("ReplenishmentController", function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	var input = document.getElementById("barcode");
	
	ctrl.isValid = function(){
		
		return ( ctrl.barcode && ctrl.barcode.length > 0 );
		
	};
	
	ctrl.getReplenishments = function(){
		
		var barcode = ctrl.barcode;
		
		modal.show();
		
		WarehouseService.getReplenishments( barcode ).then(function( data ){
			
			if(!data.product){
				
				input.blur();
				
				navigator.notification.beep(1);
				ons.notification.alert({message: "Product not found!" , callback: function(){
					
					input.select();
					
				}});
				
			}
			else
			{
				ctrl.replenishments = data.replenishments;
				ctrl.product = data.product;
				input.blur();
			}			
			
		}, function(error){
			
			input.blur();
			
			navigator.notification.beep(1);			
			ons.notification.alert({message: error , callback: function(){
				
				input.select();
				
			}});
			
		}).finally(function(){
			
			modal.hide();
			
		});
		
	};
	
	ctrl.saveReplenishments = function(){
		
		var m_product_id = ctrl.product['m_product_id'];
		var replenishments = ctrl.replenishments;
		
		modal.show();
		
		WarehouseService.saveReplenishments( m_product_id, replenishments ).then(function(){
			
			var msg = "<div>Successfully saved replenishments</div>";
			
			navigator.notification.beep(1);
			ons.notification.alert({messageHTML: msg , callback: function(){
								
				$timeout(function(){
					ctrl.barcode = null;
					ctrl.product = null;
					ctrl.replenishments = null;
					
					$timeout(function(){
						input.select();
					}, 500);					
				});
				
				
			}});
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
								
			}});
			
		}).finally(function(){
						
			modal.hide();
			
		});	
		
		
	}
	
	$timeout(function(){
		input.focus();
	});
	
});


module.controller("StockCountController", function( $scope, $http, $timeout, WarehouseService ){
	
	var ctrl = this;
	var input = document.getElementById("barcode");
	var index = 0;

	var map = new Map();
	ctrl.map = map;

	ctrl.stocks = [];

	ctrl.selectInput = function(){
		input.select();
	};
	
	ctrl.isValid = function(){
		
		return ( ctrl.barcode && ctrl.barcode.length > 0 );
		
	};
	
	ctrl.addBarcode = function(){
		
		var barcode = ctrl.barcode;	
		
		var entry = map.get(barcode) || { "barcode" : barcode, "qty" : 0};

		entry.qty += 1;
		entry.index = ++ index;

		map.set(barcode, entry);

		console.log(map);

		input.select();

		ctrl.update();

			
	};

	ctrl.remove = function(barcode){
		
		ons.notification.confirm({
			message: `Do you want to remove line ${barcode}?`,
			// or messageHTML: '<div>Message in HTML</div>',
			title: 'Warehouse App',
			buttonLabels: ['Yes', 'No'],
			animation: 'default', // or 'none'
			primaryButtonIndex: 1,
			cancelable: false,
			callback: function(index) {
			  // -1: Cancel
			  // 0-: Button index from the left
			  if(index == 0){				    	
				_remove(barcode);
			  }

			  ctrl.selectInput();
			}
		});
	};

	var _remove = function(barcode){
		$timeout(()=>{
			map.delete(barcode);
			ctrl.update();
			input.select();
		});
	};

	ctrl.update = function(){
		let stocks = [];

		map.forEach((value, key, map) => {
			stocks.push(value);
		});

		ctrl.stocks = stocks;	

		document.getElementById('scrollpane').scrollTop = 0;
	};


	ctrl.reset = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to reset?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Warehouse App',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){				    	
			    	_reset();
			    }

				ctrl.selectInput();
			  }
			});			
	
		};

	function _reset(){
		$timeout(()=>{
			ctrl.stocks = [];
			map.clear();
			ctrl.barcode = "";
		});
	}

	ctrl.next = function(){

		let stocks = ctrl.stocks;

		stocks = stocks.map( stock => {
			return {
				"barcode" : stock.barcode,
				"qty" : stock.qty
			};
		});

		console.log(stocks);

		modal.show();
		
		WarehouseService.getReplenishmentReport( stocks ).then(function(){
			
			
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
								
			}});
			
		}).finally(function(){
						
			modal.hide();
			
		});	

	}

	
	ctrl.saveReplenishments = function(){

		/*
		
		var m_product_id = ctrl.product['m_product_id'];
		var replenishments = ctrl.replenishments;
		
		modal.show();
		
		WarehouseService.saveReplenishments( m_product_id, replenishments ).then(function(){
			
			var msg = "<div>Successfully saved replenishments</div>";
			
			navigator.notification.beep(1);
			ons.notification.alert({messageHTML: msg , callback: function(){
								
				$timeout(function(){
					ctrl.barcode = null;
					ctrl.product = null;
					ctrl.replenishments = null;
					
					$timeout(function(){
						input.select();
					}, 500);					
				});
				
				
			}});
			
		}, function(error){
			
			navigator.notification.beep(1);
			ons.notification.alert({message: error , callback: function(){
								
			}});
			
		}).finally(function(){
						
			modal.hide();
			
		});	

		*/
		
		
	}
	
	$timeout(function(){
		input.focus();
	});
	
});


function closeApp(){
	
	navigator.notification.beep(1);
	
	ons.notification.confirm({
	  message: 'Do you want to quit?',
	  // or messageHTML: '<div>Message in HTML</div>',
	  title: 'Warehouse Management App',
	  buttonLabels: ['Yes', 'No'],
	  animation: 'default', // or 'none'
	  primaryButtonIndex: 1,
	  cancelable: false,
	  callback: function(index) {
	    // -1: Cancel
	    // 0-: Button index from the left
	    if(index == 0){	    	
	    	navigator.app.exitApp();  		    	
	    }
	  }
	});
	
}
