angular.module('app',[]);
angular.module('app').service('PickingListService', function($q, $http){
		
	var service = this;
	service.document = null;
	
	service.PICKING_STATE_NAME = CONFIG.getClientId() + "_" + 'PICKING_STATE';
	
	service.getDocument = function(){
		return this.document;
	};
	
	service.loadDocument = function( documentno ){	
		
		var defer = $q.defer()		
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'documentno': documentno
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/PickingList/document?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.found === true){
	    		
	    		var pickinglist = data.pickinglist;
	    		service.document = pickinglist;
	    		
	    		defer.resolve(pickinglist);
	    	}
	    	else
	    	{
	    		defer.reject("Document not found!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	service.setPicks = function( pickingListId, lines ){
		
		var picks = {
			id : pickingListId,
			lines : []	
		};		
		
		var line;
		var pick;
		
		for(var i=0; i<lines.length; i++){
			
			line = lines[i];
			
			pick = {					
					"id" : line.pickingListLineId,
					"mapping_id" : line.itemMappingId,
					"qtypicked" : line.qtyPicked,
					"qtytopick" : line.qtyToPick					
				};
			
			if(line.nostock){
				pick.nostock = line.nostock;
			}
			
			if(line.skipline){
				pick.skipline = line.skipline;
			}
			
			picks.lines.push(pick);
			
		}
		
		this.picks = picks;
		
	};
	
	service.completePickingList = function(){		

		
		var defer = $q.defer()		
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'id': this.picks.id,
			'lines': this.picks.lines,
			'date': moment().format("YYYY-MM-DD HH:mm:ss")
		});
		
		var data = $.param({
			json: parameter
        });
		
		var url = CONFIG.getServerEndpoint() + "/service/PickingList/complete";
		
		var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };

        $http.post(url, data, config).success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.completed === true){
	    		
	    		defer.resolve("Picking list completed");
	    	}
	    	else
	    	{
	    		defer.reject("Failed to complete!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	
	};
	
	service.clear = function(){
		this.document = null;
		this.picks = null;
	};
	
	service.saveState = function( state ){
		
		var s = JSON.stringify(state);
		localStorage.setItem(service.PICKING_STATE_NAME, s);

	};
	
	service.getSavedState = function(){
		
		var state = localStorage.getItem(service.PICKING_STATE_NAME);
		
		if(state != null){
			
			state = JSON.parse( state );
		}
		
		return state;
	};
	
	service.resetState = function(){
		localStorage.removeItem(service.PICKING_STATE_NAME);
	};
	
		
});


angular.module('app').service('WarehouseService', function($q, $http){
	
	var service = this;
	
	/* move item from one location to another */
	service.moveItem = function( barcode, oldLocation, newLocation ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'barcode': barcode,
			'oldLocation': oldLocation,
			'newLocation' : newLocation
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/moveItem?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.moved === true){
	    		
	    		defer.resolve("Item mapping updated");
	    	}
	    	else
	    	{
	    		defer.reject("Failed to move item! " + data.error);
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* get mappings for items to put on shelves */
	service.getMappings = function( barcodes ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'barcodes': barcodes
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/getMappings?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.mappings){
	    		
	    		defer.resolve(data.mappings);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to get mappings!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};

	/* get product info */
	service.getProductInfo = function( barcode ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'barcode': barcode
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/getProductInfo?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available

			if(data.productInfo.error){
				defer.reject(data.productInfo.error);
				return;
			}

	    	defer.resolve(data.productInfo);	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* get stocks from different warehouses */
	service.getStocks = function( barcode ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'barcode': barcode
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/getStocks?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.stocks){
	    		
	    		defer.resolve(data.stocks);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to get stocks!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* get replenishments from different warehouses */
	service.getReplenishments = function( barcode ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'barcode': barcode,
			'm_warehouse_id':warehouse['m_warehouse_id']
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/getReplenishments?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.replenishments){
	    		
	    		var map = {};
	    		var ids;
	    		
	    		//need to filter based on stores
	    		var ad_client_id = CONFIG.getClientId();
	    		
	    		switch( ad_client_id ){
	    		
		    		//BataRetail
		    		case '10005131' : ids = [10006541,10006599,10006604,10006596,10006597,10006601,10006483]; break;
		    		
		    		//Citadel
		    		case '10000543' : ids = [10001056,10001055,10003870,10003187,10003189,10001342,10005504,10001053]; break;
		    		
		    		//Adopt
		    		case '10006351' : ids = [10007711,10007712,10007715,10007716,10007713,10007718,10007714]; break;
		    		
		    		//Funky
		    		case '10003345' : ids = [10005506,10007661,10004570]; break;
		    		
		    		default: ids = [];
	    		
	    		}
	    		
	    		if(ids.length > 0){
	    			
	    			//need to filter
	    			var replenishments = data.replenishments;
	    			
	    			for(var i=0; i<ids.length; i++){
	    				
	    				map[ids[i] + ''] = true;
	    				
	    			}
	    			
	    			var replenishment = null;
	    			var m_warehouse_id;

	    			var filtered = [];
	    			
	    			for(var j=0; j<replenishments.length; j++){
	    				
	    				replenishment = replenishments[j];
	    				m_warehouse_id = replenishment['m_warehouse_id'];
	    				
	    				if( map[ m_warehouse_id + ''] ){
	    					filtered.push( replenishment );
	    				}
	    				
	    			}
	    			
	    			data.replenishments = filtered;
	    			
	    		}	    		
	    		
	    		defer.resolve(data);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to get replenishments!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* save mappings for items  */
	service.saveMappings = function( mappings ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'mappings': mappings
		});
		
		var data = $.param({
			json: parameter
        });
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/saveMappings";
		
		var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };

        $http.post(url, data, config).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.result){
	    		
	    		defer.resolve(data.result);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to save mappings!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* save replenishments  */
	service.saveReplenishments = function( m_product_id, replenishments ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'replenishments': replenishments,
			'm_product_id' : m_product_id
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/saveReplenishments?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.result){
	    		
	    		defer.resolve(data.result);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to save replenishments!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* add a new mapping for item */
	service.addNewMapping = function( m_product_id, location ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'm_product_id': m_product_id,
			'location': location
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/addNewMapping?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.saved){
	    		
	    		defer.resolve(data.saved);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to save mappings!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	/* get previous mappings  */
	service.mappingHistory = function( m_product_id ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'm_product_id' : m_product_id
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/mapping_history?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.mappings){
	    		
	    		defer.resolve(data.mappings);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to get mapping history!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
	service.getReplenishmentReport = function( stocks ){
		
		var warehouse = CONFIG.getWarehouse();
		
		var defer = $q.defer()
		
		var parameter = JSON.stringify({
			'merchantKey':CONFIG.getClientId(),
			'terminalKey':0,
			'ad_user_id':CONFIG.getUserId(),
			'm_warehouse_id':warehouse['m_warehouse_id'],
			'stocks' : stocks
		});
		
		var url = CONFIG.getServerEndpoint() + "/service/Warehouse/getReplenishmentReport?json=" + parameter;
		
	    $http.get(url).
	    
	    success(function(data, status, headers, config) {
	        // this callback will be called asynchronously
	        // when the response is available
	    	if(data.mappings){
	    		
	    		defer.resolve(data.report);
	    	}
	    	else
	    	{
	    		defer.reject("Failed to get replenishment report!");
	    	}
	        
	        
	      }).
	      error(function(data, status, headers, config) {
	        // called asynchronously if an error occurs
	        // or server returns response with an error status.
	    	  
	    	  defer.reject("Failed to connect to server!");
	      });		
		
		return defer.promise;
		
	};
	
});

