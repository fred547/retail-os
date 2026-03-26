angular.module('app').service('ProductService', function(){
	
	var service = this;
	
	service.searchBarcode = function( searchTerm, limit){
		
		var query = {"upc":searchTerm};
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.search(searchTerm, limit);
			results = JSON.parse(results);
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
				
		return results;
	};
	
	service.search = function( searchTerm, limit){
		
		var query = [
				     {"upc":searchTerm},
				     {"sku":searchTerm},
				     {"name":{leftnocase:searchTerm}},
				     {"primarygroup":{leftnocase:searchTerm}},
				     {"product_category":{leftnocase:searchTerm}},
				     {"description":{likenocase:searchTerm}},
				     {"extendeddescription":{likenocase:searchTerm}}
				     
				];
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.search(searchTerm, "and ismodifier='N' and m_product_parent_id = 0", limit);
			results = JSON.parse(results);
			
			if(results.length == 0){
				
				results = window.PRODUCT_DB.search(searchTerm, "and ismodifier='N' and m_product_parent_id > 0", limit);
				results = JSON.parse(results);
				
			}
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
				
		return results;
	};
	
	service.distinct = function(query, column){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			var filter = "";
			
			var keys = Object.keys(query);
			var key = null;
			var value = null;
			
			for(var i=0; i< keys.length; i++){
				
				key = keys[i];
				value = query[key];
				/* escape single quote */
				key = key.replace("'", "''");
				value = value.replace("'", "''");
				
				filter += " and " + key + "='" + value  + "'";
			}
			
			results = window.PRODUCT_DB.distinct(column, filter);
			results = JSON.parse(results);
		}
		else
		{
			results = APP.PRODUCT.cache(query).distinct(column);
		}
		
		return results;
	};
	
	service.filter = function(query, limit){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			var filter = "";
			
			var keys = Object.keys(query);
			var key = null;
			var value = null;
			
			for(var i=0; i< keys.length; i++){
				
				key = keys[i];
				value = query[key];
				/* escape single quote */
				key = key.replace("'", "''");
				value = value.replace("'", "''");
				
				filter += " and " + key + "='" + value  + "'";
			}
			
			results = window.PRODUCT_DB.filter(filter + " and ismodifier='N' and m_product_parent_id = 0", limit);
			results = JSON.parse(results);
			
			if(results.length == 0){
				
				results = window.PRODUCT_DB.filter(filter + " and ismodifier='N' and m_product_parent_id > 0", limit);
				results = JSON.parse(results);
				
			}
		}
		else
		{
			/* get parents first */	
			results = APP.PRODUCT.cache({"ismodifier":"N" ,"m_product_parent_id":{"==":""}}).filter(query).limit(limit).get();
			
			if(results.length == 0){
				// try to look for variants 
				results = APP.PRODUCT.cache({"ismodifier":"N", "m_product_parent_id":{">":"0"}}).filter(query).limit(limit).get();
			}
		}
		
		return results;
		
	};
	
	service.variants = function( m_product_parent_id ){
		
		var results = [];
		
		if(window.PRODUCT_DB){
			
			results = window.PRODUCT_DB.filter("and m_product_parent_id = " + m_product_parent_id, 1000);
			results = JSON.parse(results);
		}
		else
		{
			results = APP.PRODUCT.cache({"m_product_parent_id" : {"==":m_product_parent_id}}).get();			
		}
		
		return results;
		
	};
	
});