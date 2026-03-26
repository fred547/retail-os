/**
 * Application main class
 */
 var APP = {};

 /**
 * Definition of DB class
 */
 APP.DB = {};
 
 
 /**
 * Definition for db schema
 * For more info see http://dev.yathit.com/ydn-db/getting-started.html
 */
 APP.DB.DB_SCHEMA = {
    /*stores are tables in index DB*/
    stores: [
    {
        name: 'product',
        keyPath: "m_product_id"
    }, 
    {
        name: 'tax',
        keyPath: 'taxId'
    },
    {
        name: 'bom',
        keyPath: 'm_product_bom_id',
        indexes: [{keyPath: "bomId"}, {keyPath: "productId"}]
    }, 
    {
        name: 'bp',
        keyPath: 'c_bpartner_id'
    }, 
    {
        name: 'user',
        keyPath: 'ad_user_id'
    }, 
    {
        name: 'role',
        keyPath: 'ad_role_id'
    }, 
    {
        name: 'roleOrgAccess',
        keyPath: 'roleOrgAccessId',
        indexes: [{keyPath: "ad_org_id"}, {keyPath: "ad_role_id"}]
    }, 
    {
        name: 'terminal',
        keyPath: 'terminalId'
    }, 
    {
        name: 'order',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [{keyPath: "status"}, {keyPath: "uuid"}]
    }, 
    {
        name: 'purchase',
        keyPath: 'id',
        autoIncrement: true
    }, 
    {
        name: 'system',
        keyPath: 'table'
    },
    {
        name: 'modifierGroup',
        keyPath: 'groupId'
    },
    {
        name: 'productModifierGroup',
        keyPath: 'm_product_group_id',
        indexes: [{keyPath: "group_id"}, {keyPath: "product_id"}]
    }]
 };
 
 /**
 * Initialize database
 */
 APP.DB.isInitialized = false;
 APP.DB.initializeDatabase = function(){
	 
	 var dfd = new jQuery.Deferred();
	 
	 if(this.isInitialized){
		 dfd.resolve('db already initialized');
		 return dfd.promise();
	 }
	 
	 /* note: each domain has a db associated to it */
	 var domain = jQuery.cookie('pos.domain');
	 
	 if(domain == null){
		 /* domain not found */
		 dfd.reject('Failed to load domain. Cookie not set!');
		 return dfd.promise();
	 }
	 
	 var dbName = "posterita_" + domain; 
	 this.DB_NAME = dbName;
	 
	 /* load db */
	 /* for more info see http://dev.yathit.com/ydn-db/getting-started.html */
	 
	 jQuery.db = new ydn.db.Storage(this.DB_NAME, this.DB_SCHEMA);

	 jQuery.db.onReady = function (event) {
		 var e = event.getError();
		 if(e){
			 dfd.reject('Fail to connect to the database');
		 }
		 
		 /* successfully connected to db */
		 console.log('Database ' + jQuery.db.getName() + ' version ' + event.getVersion() + ' [' + jQuery.db.getType() + '] ready.');
		 dfd.resolve('Successfully connected to db -- ' + jQuery.db.getName());
     };
	 
	 return dfd.promise();
 };
 
 /**
 * Synchronize database
 */
 APP.DB.synchronizeDatabase = function(){
	 
	 var dfd = new jQuery.Deferred();
	 
	 /* synchronize all tables */
	 /* product,tax,bom,bp,user,role,roleOrgAccess,terminal */
	 
	 /* table product */
	 APP.DB.synchronizeTableProduct().done(function(msg){
		 dfd.notify(msg);
		 
		 /* table tax */
		 APP.DB.synchronizeTableTax().done(function(msg){
			 dfd.notify(msg);
			 
			 /* table bom */
			 APP.DB.synchronizeTableBOM().done(function(msg){
				 dfd.notify(msg);
				 
				 /* table bp */
				 APP.DB.synchronizeTableBp().done(function(msg){
					 dfd.notify(msg);
					 
					 /* table user */
					 APP.DB.synchronizeTableUser().done(function(msg){
						 dfd.notify(msg);
						 
						 /*table role */
						 APP.DB.synchronizeTableRole().done(function(msg){
							 dfd.notify(msg);
							 
							 /* table roleOrgAccess */
							 APP.DB.synchronizeTableRoleOrgAccess().done(function(msg){
								 dfd.notify(msg);
								 
								 /* table terminal */
								 APP.DB.synchronizeTableTerminal().done(function(msg){
									 dfd.notify(msg);									 
									 
									 /* table modifiers */
									 APP.DB.synchronizeTableModifierGroup().done(function(msg){
										 dfd.notify(msg);
										 
										 APP.DB.synchronizeTableProductModifierGroup().done(function(msg){
											 dfd.notify(msg);
											 
											 dfd.resolve('tables synchronization completed');
											 
										 }).fail(function(msg){dfd.reject(msg);});										
										 
									 }).fail(function(msg){dfd.reject(msg);});										 
									 
								 }).fail(function(msg){dfd.reject(msg);});
								 
							 }).fail(function(msg){dfd.reject(msg);});
							 
						 }).fail(function(msg){dfd.reject(msg);});
						 
					 }).fail(function(msg){dfd.reject(msg);});
					 
				 }).fail(function(msg){dfd.reject(msg);});
				 
			 }).fail(function(msg){dfd.reject(msg);});
			 
		 }).fail(function(msg){dfd.reject(msg);});
		 
	 }).fail(function(msg){dfd.reject(msg);});
	 
	 return dfd.promise();
 };
  
  /**
  * Apply updates
  *	- table : table name
  * - records : updated records
  * - date : date and time updated
  */
  APP.DB.applyUpdates = function(table, records, date){
	  
	  var dfd = new jQuery.Deferred();

	  jQuery.db.put('system', {
	      'table': table,
	      'lastUpdated': date
	  }).done(function (key) {

	      if (records.length == 0) {
	          dfd.resolve('[' + table + '] No updates found.');
	          return;
	      }

	      dfd.notify('[' + table + '] Found ' + records.length + ' updates.');

	      jQuery.db.put(table, records).done(function (keys) {
	    	  dfd.resolve('[' + table + '] Updated ' + keys.length + ' records');
	      }).fail(function (e) {
	          console.error(e);
	          dfd.reject('[' + table + '] Failed to save updates');
	      });

	  }).fail(function (e) {
	      console.error(e);
	      dfd.reject('[' + table + '] Failed to update last updated');
	  });

	  return dfd.promise();
  };
  
  /**
  * Synchronize products
  * each time we request a fresh copy of products
  */
  APP.DB.synchronizeTableProduct = function(){
	  
	  var dfd = new jQuery.Deferred();	  
	  
	  /* request a fresh copy */
	  jQuery.post("OfflineAction.do", {
	        action: "getProducts",
	        lastUpdated: '01/01/10 00:00:00'
	    },
	    function (json, textStatus, jqXHR) {

	        if (json == null || jqXHR.status != 200) {
	            dfd.reject('synchronizeTableProduct - autentication failed');
	            return;
	        }

	        var updated = json.updated;
	        var columns = json.columns;
	        var records = json.data;

	        var products = [];

	        for (var i = 0; i < records.length; i++) {
	            var product = {};
	            for (var j = 0; j < columns.length; j++) {
	                if (records[i][j] == null) {
	                    records[i][j] = '';
	                }
	                product[columns[j]] = records[i][j];
	            }
	            products.push(product);
	        }
	        
	        /* clear previous records */
	  	    jQuery.db.clear('product').done(function(){}).fail(function (e) {
	      	  dfd.reject('synchronizeTableProduct - failed to clear table product');
	        });

	        APP.DB.applyUpdates('product', products, updated).done(function (msg) {
	            dfd.resolve(msg);
	        }).fail(function(msg){
	        	dfd.reject(msg);
	        });

	    },
	    "json").fail(function () {
	    dfd.reject('synchronizeTableProduct - request failed');
	    });	  
	  
	  return dfd.promise();
  };
  
  /**
  * Synchronize taxes
  */
  APP.DB.synchronizeTableTax = function(){
	  
	  var dfd = new jQuery.Deferred();
	  
	  jQuery.db.get('system', 'tax').done(function (record){
		  
		  var updatedOn = '01/01/10 00:00:00';
		  if(record){
			  updatedOn = record.lastUpdated;
		  }
		  
		  jQuery.post("OfflineAction.do",
		    		{ action: "getTaxes", lastUpdated : updatedOn},
		    		function(json, textStatus, jqXHR){
		    			
		    			if(json == null || jqXHR.status != 200){
		    				dfd.reject('synchronizeTableTax - autentication failed');
		    				return;
		    			}
		    			
		    			var updated = json.updated;
		    			var records = json.taxes;
		    			
		    			APP.DB.applyUpdates('tax', records, updated).done(function (msg) {
				            dfd.resolve(msg);
				        }).fail(function(msg){
				        	dfd.reject(msg);
				        });
		    		},
					"json").fail(function(){console.error('synchronizeTableTax - request failed');}); 
		  
		  
	  }).fail(function(){
		  dfd.reject('synchronizeTableTax - failed query last updated');
	  });
	  
	  return dfd.promise();
  };
  
  /**
   * Synchronize BOMs
   */
  APP.DB.synchronizeTableBOM = function(){
	  
	  var dfd = new jQuery.Deferred();
	  
	  jQuery.db.get('system', 'bom').done(function (record){
		  
		  var updatedOn = '01/01/10 00:00:00';
		  if(record){
			  updatedOn = record.lastUpdated;
		  }
		  
		  jQuery.post("OfflineAction.do",
		    		{ action: "getBoms", lastUpdated : updatedOn},
		    		function(json, textStatus, jqXHR){
		    			
		    			if(json == null || jqXHR.status != 200){
		    				dfd.reject('synchronizeTableBOM - autentication failed');
		    				return;
		    			}
		    			
		    			var updated = json.updated;
		    			var records = json.boms;
		    			
		    			APP.DB.applyUpdates('bom', records, updated).done(function (msg) {
				            dfd.resolve(msg);
				        }).fail(function(msg){
				        	dfd.reject(msg);
				        });
		    		},
					"json").fail(function(){console.error('synchronizeTableBOM - request failed');}); 
		  
		  
	  }).fail(function(){
		  dfd.reject('synchronizeTableBOM - failed query last updated');
	  });
	  
	  return dfd.promise();
  };
  
  /**
  * Synchronize bps
  */
  APP.DB.synchronizeTableBp = function(){
	  
	  var dfd = new jQuery.Deferred();
	  
	  jQuery.db.get('system', 'bp').done(function (record){
		  
		  var updatedOn = '01/01/10 00:00:00';
		  if(record){
			  updatedOn = record.lastUpdated;
		  }
		  
		  jQuery.post("OfflineAction.do",
		    		{ action: "getBusinessPartners", lastUpdated : updatedOn},
		    		function(json, textStatus, jqXHR){
		    			
		    			if(json == null || jqXHR.status != 200){
		    				dfd.reject('synchronizeTableBp - autentication failed');
		    				return;
		    			}
		    			
		    			var updated = json.updated;
		    			var records = json.bps;
		    			
		    			APP.DB.applyUpdates('bp', records, updated).done(function (msg) {
				            dfd.resolve(msg);
				        }).fail(function(msg){
				        	dfd.reject(msg);
				        });
		    		},
					"json").fail(function(){console.error('synchronizeTableBp - request failed');}); 
		  
		  
	  }).fail(function(){
		  dfd.reject('synchronizeTableBp - failed query last updated');
	  });
	  
	  return dfd.promise();
  };
  
  /**
   * Synchronize users
   */
   APP.DB.synchronizeTableUser = function(){
		  
		  var dfd = new jQuery.Deferred();
		  
		  jQuery.db.get('system', 'user').done(function (record){
			  
			  var updatedOn = '01/01/10 00:00:00';
			  if(record){
				  updatedOn = record.lastUpdated;
			  }
			  
			  jQuery.post("OfflineAction.do",
			    		{ action: "getUsers", lastUpdated : updatedOn},
			    		function(json, textStatus, jqXHR){
			    			
			    			if(json == null || jqXHR.status != 200){
			    				dfd.reject('synchronizeTableUser - autentication failed');
			    				return;
			    			}
			    			
			    			var updated = json.updated;
			    			var records = json.users;
			    			
			    			APP.DB.applyUpdates('user', records, updated).done(function (msg) {
					            dfd.resolve(msg);
					        }).fail(function(msg){
					        	dfd.reject(msg);
					        });
			    		},
						"json").fail(function(){console.error('synchronizeTableUser - request failed');}); 
			  
			  
		  }).fail(function(){
			  dfd.reject('synchronizeTableUser - failed query last updated');
		  });
		  
		  return dfd.promise();
	  };
  
  /**
   * Synchronize roles
   */
   APP.DB.synchronizeTableRole = function(){
		  
		  var dfd = new jQuery.Deferred();
		  
		  jQuery.db.get('system', 'role').done(function (record){
			  
			  var updatedOn = '01/01/10 00:00:00';
			  if(record){
				  updatedOn = record.lastUpdated;
			  }
			  
			  jQuery.post("OfflineAction.do",
			    		{ action: "getRoles", lastUpdated : updatedOn},
			    		function(json, textStatus, jqXHR){
			    			
			    			if(json == null || jqXHR.status != 200){
			    				dfd.reject('synchronizeTableRole - autentication failed');
			    				return;
			    			}
			    			
			    			var updated = json.updated;
			    			var records = json.roles;
			    			
			    			APP.DB.applyUpdates('role', records, updated).done(function (msg) {
					            dfd.resolve(msg);
					        }).fail(function(msg){
					        	dfd.reject(msg);
					        });
			    		},
						"json").fail(function(){console.error('synchronizeTableRole - request failed');}); 
			  
			  
		  }).fail(function(){
			  dfd.reject('synchronizeTableRole - failed query last updated');
		  });
		  
		  return dfd.promise();
	  };
  
  /**
   * Synchronize role org accesses
   */
   APP.DB.synchronizeTableRoleOrgAccess = function(){
		  
		  var dfd = new jQuery.Deferred();
		  
		  jQuery.db.get('system', 'roleOrgAccess').done(function (record){
			  
			  var updatedOn = '01/01/10 00:00:00';
			  if(record){
				  updatedOn = record.lastUpdated;
			  }
			  
			  jQuery.post("OfflineAction.do",
			    		{ action: "getRoleOrgAccess", lastUpdated : updatedOn},
			    		function(json, textStatus, jqXHR){
			    			
			    			if(json == null || jqXHR.status != 200){
			    				dfd.reject('synchronizeTableRoleOrgAccess - autentication failed');
			    				return;
			    			}
			    			
			    			var updated = json.updated;
			    			var records = json.roleOrgAccess;
			    			
			    			//genarate ids
			    			for(var i=0; i<records.length; i++){
			    				records[i].roleOrgAccessId = records[i].ad_role_id + '_' + records[i].ad_org_id; 
			    			}
			    			
			    			APP.DB.applyUpdates('roleOrgAccess', records, updated).done(function (msg) {
					            dfd.resolve(msg);
					        }).fail(function(msg){
					        	dfd.reject(msg);
					        });
			    		},
						"json").fail(function(){console.error('synchronizeTableRoleOrgAccess - request failed');}); 
			  
			  
		  }).fail(function(){
			  dfd.reject('synchronizeTableRoleOrgAccess - failed query last updated');
		  });
		  
		  return dfd.promise();
	  };
	  
	/**
	* Synchronize terminals
	*/
	APP.DB.synchronizeTableTerminal = function(){
		  
		  var dfd = new jQuery.Deferred();
		  
		  var lastUpdated = '01/01/10 00:00:00';
		  
		  jQuery.post("OfflineAction.do", {
		        action: "getTerminals",
		        lastUpdated: lastUpdated
		    },
		    function (json, textStatus, jqXHR) {

		        if (json == null || jqXHR.status != 200) {
		            dfd.reject('synchronizeTableTerminal - autentication failed');
		            return;
		        }

		        var updated = json.updated;
		        var records = json.terminals;

		        APP.DB.applyUpdates('terminal', records, updated).done(function (msg) {
		            dfd.resolve(msg);
		        }).fail(function (msg) {
		            dfd.reject(msg);
		        });
		    },
		    "json").fail(function () {
		    console.error('synchronizeTableTerminal - request failed');
		});
		  
		return dfd.promise();
	};
	
  /**
  * Synchronize modifier groups
  * each time we request a fresh copy
  */
  APP.DB.synchronizeTableModifierGroup = function(){
	  
	  var dfd = new jQuery.Deferred();	  
	  
	  /* request a fresh copy */
	  jQuery.post("OfflineAction.do", {
	        action: "getModifierGroups",
	        lastUpdated: '01/01/10 00:00:00'
	    },
	    function (json, textStatus, jqXHR) {

	        if (json == null || jqXHR.status != 200) {
	            dfd.reject('synchronizeTableModifierGroup - autentication failed');
	            return;
	        }

	        var updated = json.updated;
	        var records = json.modifierGroups;
	        
	        /* clear previous records */
	  	    jQuery.db.clear('modifierGroup').done(function(){}).fail(function (e) {
	      	  dfd.reject('synchronizeTableModifierGroup - failed to clear table modifierGroup');
	        });

	        APP.DB.applyUpdates('modifierGroup', records, updated).done(function (msg) {
	            dfd.resolve(msg);
	        }).fail(function (msg) {
	            dfd.reject(msg);
	        });

	    },
	    "json").fail(function () {
	    dfd.reject('synchronizeTableModifierGroup - request failed');
	});	  
	  
	  return dfd.promise();
  };
	
  /**
  * Synchronize product modifier groups
  * each time we request a fresh copy
  */
  APP.DB.synchronizeTableProductModifierGroup = function(){
	  
	  var dfd = new jQuery.Deferred();	  
	  
	  /* request a fresh copy */
	  jQuery.post("OfflineAction.do", {
	        action: "getProductModifierGroups",
	        lastUpdated: '01/01/10 00:00:00'
	    },
	    function (json, textStatus, jqXHR) {

	        if (json == null || jqXHR.status != 200) {
	            dfd.reject('synchronizeTableProductModifierGroup - autentication failed');
	            return;
	        }

	        var updated = json.updated;
	        var records = json.productModifierGroups;
	        
	        //genarate ids
			for(var i=0; i<records.length; i++){
				records[i].m_product_group_id = records[i].product_id + '_' + records[i].group_id; 
			}
			
			  /* clear previous records */
			  jQuery.db.clear('productModifierGroup').done(function(){}).fail(function (e) {
		    	  dfd.reject('synchronizeTableProductModifierGroup - failed to clear table productModifierGroup');
		      });

	        APP.DB.applyUpdates('productModifierGroup', records, updated).done(function (msg) {
	            dfd.resolve(msg);
	        }).fail(function (msg) {
	            dfd.reject(msg);
	        });

	    },
	    "json").fail(function () {
	    dfd.reject('synchronizeTableProductModifierGroup - request failed');
	});
	    
	  
	  return dfd.promise();
  };
  
  /**
   * Synchronize modifier groups
   * each time we request a fresh copy
   */
   APP.DB.synchronizeTableVariant = function(){
 	  
 	  var dfd = new jQuery.Deferred();	  
 	  
 	  /* request a fresh copy */
 	  jQuery.post("OfflineAction.do", {
 	        action: "getVariants",
 	        lastUpdated: '01/01/10 00:00:00'
 	    },
 	    function (json, textStatus, jqXHR) {

 	        if (json == null || jqXHR.status != 200) {
 	            dfd.reject('synchronizeTableVariant - autentication failed');
 	            return;
 	        }

 	        var updated = json.updated;
 	        var records = json.products;
 	        
 	        /* clear previous records */
 	  	    jQuery.db.clear('variant').done(function(){}).fail(function (e) {
 	      	  dfd.reject('synchronizeTableVariant - failed to clear table variant');
 	        });

 	        APP.DB.applyUpdates('variant', records, updated).done(function (msg) {
 	            dfd.resolve(msg);
 	        }).fail(function (msg) {
 	            dfd.reject(msg);
 	        });

 	    },
 	    "json").fail(function () {
 	    dfd.reject('synchronizeTableVariant - request failed');
 	});	  
 	  
 	  return dfd.promise();
   };
	/**
	* We use taffy db library to cache tables in memory
	* Taffy search api is must easier and faster than that of HTML5 DB
	* http://www.taffydb.com/
	*/
	
	 /**
	 * Define table models
	 */
	 
	 APP.PRODUCT = {
			tableName : "product",
			
			initialize : function(){
				var dfd = new jQuery.Deferred();
				
				dfd.notify('[PRODUCT] caching');
				
				/*
				jQuery.db.values('product', null, 10000).done(function(records){
					APP.PRODUCT.cache = TAFFY(records);
					dfd.resolve('[PRODUCT] Cached ' + records.length + ' records.');
			    });
				*/							
				
				if(window.PRODUCT_DB) {
					dfd.resolve('PRODUCT_DB');
					return dfd.promise();
				}
				
				jQuery.getJSON( "/json/product", function( records ){
					APP.PRODUCT.cache = TAFFY(records);
					
					dfd.notify('[PRODUCT] setting variants');
					
					var parents = APP.PRODUCT.cache({"m_product_parent_id" : {">":0}}).distinct("m_product_parent_id");
					APP.PRODUCT.cache({"m_product_id":parents}).update("isparent","Y");
					
					dfd.resolve('[PRODUCT] Cached ' + records.length + ' records.');
				});
				
				return dfd.promise();
			},
			
			getProductById : function(productId){
				
				if(window.PRODUCT_DB) {
					var product = window.parent.PRODUCT_DB.getProductById(productId);
					if(product == null)
					{
						return null;
					}
					
					return JSON.parse(product);
				}
				
				var query = {"m_product_id" : {'==':productId}};			
				var results = this.searchProducts(query);
				
				if(results.length != 0){
					var product = jQuery.extend({}, results[0]);					
					return product;
				}
				
				return null;
			},
			
			searchProducts : function(query, limit){
				var max = limit || 50;
				
				if(window.PRODUCT_DB) {
					
					var filter = "";
					
					if( typeof query == 'string' ){
						//no need to convert
					}
					else
					{
						var keys = Object.keys(query);
						
						for(var i=0; i< keys.length; i++){
							
							filter += " and " + keys[i] + "='" + query[keys[i]]  + "'";
						}
						
						query = "";
					}
					
					var products = window.PRODUCT_DB.search(query, filter, max);
					if(products == null)
					{
						return null;
					}
					
					return JSON.parse(products);
				}
				
				var results = this.cache(query).limit(max).get();
				return results;
			}
		};
	 
	 APP.PRODUCT_PRICE = {
				tableName : "product_price",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[PRODUCT_PRICE] caching');
					
					/*
					jQuery.db.values('product', null, 10000).done(function(records){
						APP.PRODUCT.cache = TAFFY(records);
						dfd.resolve('[PRODUCT] Cached ' + records.length + ' records.');
				    });
					*/							
					
					if(window.PRODUCT_DB) {
						dfd.resolve('PRODUCT_DB');
						return dfd.promise();
					}
					
					jQuery.getJSON( "/json/product_price", function( records ){
						APP.PRODUCT_PRICE.cache = TAFFY(records);						
						dfd.resolve('[PRODUCT_PRICE] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getProductPrice : function(product_id, pricelist_id, default_pricelist_id){
					
					if(window.PRODUCT_DB) {
						var price = window.parent.PRODUCT_DB.getProductPrice(product_id, pricelist_id, default_pricelist_id);
						if(price == null)
						{
							return null;
						}
						
						return JSON.parse(price);
					}
					
					var query = {"m_product_id" : {'==':product_id}, "m_pricelist_id" : {'==':pricelist_id}};			
					var results = this.cache(query).get();
					
					if(results.length == 0){						
						query = {"m_product_id" : {'==':product_id}, "m_pricelist_id" : {'==':default_pricelist_id}};
						results = this.cache(query).get();						
					}
					
					if(results.length != 0){
						var product = jQuery.extend({}, results[0]);					
						return product;
					}
					
					return null;
				}
			};
	
	 APP.BOM = {
				tableName : "bom",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[BOM] caching');
					
					/*
					jQuery.db.values('bom', null, 10000).done(function(records){
						APP.BOM.cache = TAFFY(records);
						dfd.resolve('[BOM] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/bom", function( records ){
						APP.BOM.cache = TAFFY(records);
						dfd.resolve('[BOM] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getBoms : function(productId){		
					var query = {"productId" : {'==':productId}};		
					return this.cache(query).get();
				}
	}; 
	 
	
	 APP.TAX = {
				tableName : "tax",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[TAX] caching');
					
					/*
					jQuery.db.values('tax', null, 10000).done(function(records){
						APP.TAX.cache = TAFFY(records);
						dfd.resolve('[TAX] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/tax", function( records ){
						APP.TAX.cache = TAFFY(records);
						dfd.resolve('[TAX] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getTaxById : function(taxId){
					taxId = parseInt(taxId);
					var query = {"taxId" : {'==':taxId}};
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					return null;
				},
				
				getTaxByTaxCategoryId : function(taxCategoryId, isSoTrx){
					var tax = null;	
					
					if(!this.taxCategoryCache){
						this.taxCategoryCache = new HashMap();
					}
					
					var cacheKey = taxCategoryId + '_' + isSoTrx;
					
					tax = this.taxCategoryCache.get(cacheKey);
					if(tax != null) return tax;
					
					tax = this.searchTaxByTaxCategoryId(taxCategoryId, isSoTrx);
					
					if(tax != null){
						this.taxCategoryCache.set(cacheKey, tax)
					}
					
					return tax;			
				},
				
				searchTaxByTaxCategoryId : function(taxCategoryId, isSoTrx){
					/* see ShoppingCartLine.java line 177 setTax() */
					var terminal = APP.TERMINAL.searchTerminals({})[0];
					var orgId = terminal.orgId;
					
					var sopotype = 'P';
					
					if(isSoTrx){
						sopotype = 'S';
					}
					
					var query = null;
					var results = null;
					
					/*1*/
					query = {};
					query.taxCategoryId = taxCategoryId;
					query.orgId = orgId;
					query.isDefault = true;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*2*/
					query = {};
					query.taxCategoryId = taxCategoryId;
					query.orgId = 0;
					query.isDefault = true;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*3*/
					query = {};
					query.taxCategoryId = taxCategoryId;
					query.orgId = orgId;
					query.isDefault = false;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					
					
					/*4*/
					query = {};
					query.taxCategoryId = taxCategoryId;
					query.orgId = 0;
					query.isDefault = false;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*5*/
					query = {};
					query.orgId = orgId;
					query.isDefault = true;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*6*/
					query = {};
					query.orgId = orgId;
					query.isDefault = false;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*7*/
					query = {};
					query.isDefault = true;
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					/*8*/
					query = {};
					query.sopotype = ['B',sopotype];
					
					results = this.searchTaxes(query);
					
					if(results.length != 0){
						var tax = jQuery.extend({}, results[0]);
						return tax;
					}
					
					return null;			
				},
				
				searchTaxes : function(query){
					var results = this.cache(query).get();
					return results;
				}
		};	 
	 
	 APP.BP = {
				tableName : "bp",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[BP] caching');
					
					/*
					jQuery.db.values('bp', null, 10000).done(function(records){
						APP.BP.cache = TAFFY(records);
						dfd.resolve('[BP] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/bp", function( records ){
						APP.BP.cache = TAFFY(records);
						dfd.resolve('[BP] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getBPartnerById : function(bPartnerById){
					var query = {"c_bpartner_id" : {'==':bPartnerById}};			
					var results = this.searchBPartners(query);
					
					if(results.length != 0){
						var bp = jQuery.extend({}, results[0]);
						return bp;
					}
					
					return null;
				},
				
				searchBPartners : function(query){
					var results = this.cache(query).get();
					return results;
				},
				
				getCustomers : function(){
					return this.searchBPartners({"iscustomer" : "Y"});
				}
		};
	 
	 APP.USER = {
				tableName : "user",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[USER] caching');
					
					/*
					jQuery.db.values('user', null, 10000).done(function(records){
						APP.USER.cache = TAFFY(records);
						dfd.resolve('[USER] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/users", function( records ){
						APP.USER.cache = TAFFY(records);
						dfd.resolve('[USER] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getUserById : function(userId){					
					var query = {"ad_user_id" : {'==':userId}};			
					var results = this.searchUsers(query);
					
					if(results.length != 0){
						var user = jQuery.extend({}, results[0]);
						return user;
					}
					
					return null;
				},
				
				getUserByPin : function(pin){					
					var query = {"userpin" : {'==':pin}};			
					var results = this.searchUsers(query);
					
					if(results.length != 0){
						var user = jQuery.extend({}, results[0]);
						return user;
					}
					
					return null;
				},
				
				searchUsers : function(query){					
					var results = this.cache(query).get();
					return results;
				},
				
				getUser : function(username, password){
					var encryptedPassword = CryptoJS.SHA1(password);
					var query = {};
					query["name"] = username;
					query["password"] = encryptedPassword + '';
					
					var results = this.searchUsers(query);
					if(results == null || results.length == 0){
						return null;
					}
					
					return results[0];
				}
		};
	 
	 APP.ROLE = {
				tableName : "role",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[ROLE] caching');
					/*
					jQuery.db.values('role', null, 10000).done(function(records){
						APP.ROLE.cache = TAFFY(records);
						dfd.resolve('[ROLE] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/role", function( records ){
						APP.ROLE.cache = TAFFY(records);
						dfd.resolve('[ROLE] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getRoleById : function(roleId){					
					var query = {"ad_role_id" : {'==':roleId}};			
					var results = this.searchRoles(query);
					
					if(results.length != 0){
						var role = jQuery.extend({}, results[0]);
						return role;
					}
					
					return null;
				},
				
				searchRoles : function(query){					
					var results = this.cache(query).get();
					return results;
				}
		};
	 
	 APP.ROLE_ORG_ACCESS = {
				tableName : "roleOrgAccess",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[ROLE_ORG_ACCESS] caching');
					
					/*
					jQuery.db.values('roleOrgAccess', null, 10000).done(function(records){
						APP.ROLE_ORG_ACCESS.cache = TAFFY(records);
						dfd.resolve('[ROLE_ORG_ACCESS] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/role_org_access", function( records ){
						APP.ROLE_ORG_ACCESS.cache = TAFFY(records);
						dfd.resolve('[ROLE_ORG_ACCESS] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getAccessibleOrgs : function(roleId){					
					var query = {"ad_role_id" : {'==':roleId}};
					var results = this.cache(query).get();
					
					var accessibleOrgs = [];
					for(var i=0; i<results.length; i++){
						accessibleOrgs[i] = results[i].ad_org_id;
					}
					
					return accessibleOrgs;
				}
		};
	 
	 APP.TERMINAL = {
				tableName : "terminal",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[TERMINAL] caching');
					
					/*
					jQuery.db.values('terminal', null, 10000).done(function(records){
						APP.TERMINAL.cache = TAFFY(records);
						dfd.resolve('[TERMINAL] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/terminal", function( records ){
						APP.TERMINAL.cache = TAFFY(records);
						dfd.resolve('[TERMINAL] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getTerminalById : function(terminalId){					
					var query = {"u_posterminal_id" : {'==':terminalId}};			
					var results = this.searchTerminals(query);
					
					if(results.length != 0){
						var Terminal = jQuery.extend({}, results[0]);
						return Terminal;
					}
					
					return null;
				},
				
				searchTerminals : function(query){					
					var results = this.cache(query).get();
					return results;
				}
		};
		
	 APP.STORE = {
				tableName : "store",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[STORE] caching');
					
					jQuery.getJSON( "/json/store", function( records ){
						APP.STORE.cache = TAFFY(records);
						dfd.resolve('[STORE] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getStoreById : function(storeId){					
					var query = {"ad_org_id" : {'==':storeId}};			
					var results = this.searchStores(query);
					
					if(results.length != 0){
						var store = jQuery.extend({}, results[0]);
						return store;
					}
					
					return null;
				},
				
				searchStores : function(query){					
					var results = this.cache(query).get();
					return results;
				}
		};
	 
	 APP.WAREHOUSE = {
				tableName : "warehouse",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[WAREHOUSE] caching');
					
					jQuery.getJSON( "/json/warehouse", function( records ){
						APP.WAREHOUSE.cache = TAFFY(records);
						dfd.resolve('[WAREHOUSE] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getWarehouseById : function(warehouseId){					
					var query = {"m_warehouse_id" : {'==':warehouseId}};			
					var results = this.searchWarehouses(query);
					
					if(results.length != 0){
						var warehouse = jQuery.extend({}, results[0]);
						return warehouse;
					}
					
					return null;
				},
				
				searchWarehouses : function(query){					
					var results = this.cache(query).get();
					return results;
				}
		};
	 
	 APP.ORDER = {
				tableName : "order",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[ORDER] caching');
					
					/*
					jQuery.db.values('order', null, 10000).done(function(records){
						APP.ORDER.cache = TAFFY(records);
						dfd.resolve('[ORDER] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/orders", function( records ){
						APP.ORDER.cache = TAFFY(records);
						dfd.resolve('[ORDER] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				searchOrders : function(query){
					var results = this.cache(query).get();
					/* Note: we need to parse all records returned.
					 * Web sql stores JSON as plain text, so we must
					 * convert the records back as JSON
					 */
					var dbType = 'websql';
					if(results != null){
						//bug fix for websql
	    				if(dbType == 'websql'){
	    					for(var i=0; i<results.length; i++){
	    						var result = results[i];
	    						
	    						if(!jQuery.isArray(result.lines)){
	    							result.lines = jQuery.parseJSON(result.lines);
	    						}
	    						
	    						if(!jQuery.isArray(result.orderTaxes)){
	    							result.orderTaxes = jQuery.parseJSON(result.orderTaxes);
	    						}
	    						
	    						if(!jQuery.isArray(result.comments)){
	    							result.comments = jQuery.parseJSON(result.comments);
	    						}
	    						
	    						if(!jQuery.isArray(result.payments)){
	    							result.payments = jQuery.parseJSON(result.payments);
	    						}
	    					}	    					
	    				}
					}					
					
					return results;
				},
				
				saveOrder : function(order){
					
					var postData = null;
					
					postData = JSON.stringify(order);
					
					var dfd = new jQuery.Deferred();
					
					jQuery.post("/json/orders", {
		                json: postData

			            }, function (json, textStatus, jqXHR) {
	
			                if (json == null || jqXHR.status != 200) {
			                    /* failed to post */
			                	dfd.reject('[ORDER] failed to save order.');
			                    return;
			                }
			                
			                if (json.error) {
			                	/* error occured */
			                	dfd.reject('[ORDER] failed to save order. ' + json.error);
			                    return;
			                }
			                
			                var id = json.id;
							
							var results = APP.ORDER.searchOrders({'id':id});
							var msg = '';
							if(results.length == 0){
									
								APP.ORDER.cache.insert(json);	
								msg = '[ORDER] saved #' + json.id;
							}
							else
							{
								APP.ORDER.cache({'id':id}).update(json);
								msg = '[ORDER] updated #' + json.id;
							}
							
							
							/* order = APP.ORDER.getOrderById(json.id);*/
							
							dfd.resolve(msg, json);
	
			            },
			            "json").fail(function (e) {
			            /* failed to post*/
			            dfd.reject('[ORDER] failed to save order. ' + e);
			        });
					
					/*
					
					jQuery.db.put('order', order).done(function(key){
						
						jQuery.db.get('order', key).done(function(result){
							
							var order = result;							
							var id = result.id;
							
							var results = APP.ORDER.searchOrders({'id':id});
							var msg = '';
							if(results.length == 0){
									
								APP.ORDER.cache.insert(order);	
								msg = '[ORDER] saved #' + order.id;
							}
							else
							{
								APP.ORDER.cache({'id':id}).update(order);
								msg = '[ORDER] updated #' + order.id;
							}
							
							
							order = APP.ORDER.getOrderById(order.id);
							dfd.resolve(msg, order);							
													
							
						}).fail(function(e){
							dfd.reject('[ORDER] failed to load saved order. ' + e);
						});					
						
					}).fail(function(e) {
						dfd.reject('[ORDER] failed to save order. ' + e);
					});	
					
					*/
					
					return dfd.promise();					
				},
				
				getOrderById : function(id){
					var query = {"id" : {'==':id}};			
					var results = this.searchOrders(query);
					
					if(results.length != 0){
						var order = jQuery.extend({}, results[0]);
						return order;
					}
					
					return null;
				},
				
				getTaxes : function(order){
					if(order.taxes) return order.taxes;
					
					var orderTaxes = order.orderTaxes;
					var taxes = [];
					
					for(var i=0; i<orderTaxes.length; i++){
						var taxId = parseInt(orderTaxes[i].taxId);
						var taxAmt = parseFloat(orderTaxes[i].taxAmt);
						
						var tax = APP.TAX.getTaxById(taxId);
						
						if(tax.subTaxes == null){
							tax.subTaxes = [];
						}
						
						if(tax.subTaxes.length == 0){
							taxes.push({
								'name'	: tax.taxName,
								'amt'	: taxAmt
							});
						}
						else
						{
							for(var j=0; j<tax.subTaxes.length; j++){
								var subTax = tax.subTaxes[j];
								
								var subTaxAmt = new BigNumber(0);
								
								if(tax.taxRate != 0){
									subTaxAmt = new BigNumber(taxAmt).times(subTax.subTaxRate).dividedBy(tax.taxRate);
								}
								
								taxes.push({
									'name'	: subTax.subTaxName,
									'amt'	: subTaxAmt.toFixed(3)
								});
							}
						}
						
					}
					
					order.taxes = taxes;
					return taxes;
				},
				
				getOpenAmt : function(ORDER){
					
					var PAYMENTS = ORDER.payments || [];
					var OPEN_AMT = new BigNumber(ORDER.grandTotal);
					                        		
                    for(var i=0; i<PAYMENTS.length; i++){
                    	var payment = PAYMENTS[i];
                    	var payAmt = new BigNumber(payment.payAmt);
                        OPEN_AMT = OPEN_AMT.minus(payAmt);
                    }
                    
                    return OPEN_AMT;
				},
				
				getReceiptJSON : function(order){
					/* 1. load order */
					if(order == null){
						console.error('Order cannot be null!');
						return null;
					}
					
					/* 2. load terminal */
					var terminalId = order.terminalId;
					
					var terminal = APP.TERMINAL.getTerminalById(terminalId);
										
					if(terminal == null){
						console.error('Failed to load terminal[' + terminalId + ']!');
						return null;
					}
					
					var statusNames = {'CO':'Completed', 'DR':'Drafted', 'VO' : 'Voided'};
					order.docStatusName = statusNames[order.docAction];
					
					var paymentRule = APP.getPaymentRuleFromTenderType( order.tenderType );
					
					var store = APP.STORE.getStoreById(terminal.ad_org_id);		            
					
					var json = { 
						      "comments" : order.comments,
						      "commissions" : [],
						      "header" : { 	
						          "client" : terminal.ad_client_name,
						    	  "orgName" : terminal.ad_org_name,
						    	  
						    	  "orgAddress1" : store.address1,
						          "orgAddress2" : store.address2,
						          "orgAddress3" : store.address3,
						          "orgAddress4" : store.address4,
						          "orgCity" : store.city,
						          "orgFax" : store.fax,    
						          "orgPhone" : store.phone,
						          "orgTaxId" : store.taxid,
						          "orgCountryId" : store.c_country_id,
						          
						          "receiptFooterMsg" : store.receiptfootermsg,
						          "receiptFormat" : store.receiptformat,
						          
						          "terminal" : terminal.u_posterminal_name,
						          "currencySymbol" : terminal.c_currency_name,
						          
						          "title" : ((order.orderType == "Customer Returned Order") ? "Return" : "Sales Receipt"),
						          "soTrx" : true,
						          "bpName" : order.bpName,
						          "bpName2" : " ",
						          
						          "salesRep" : order.salesRep,
						          "docStatus" : order.docAction,
						          "docStatusName" : order.docStatusName,
						          "paymentRule" : paymentRule,
						          "paymentRuleName" : order.tenderType,
						          "dateOrdered" : order.dateOrdered,
						          
						          "documentNo" : order.documentNo,
						    	  
						    	  "amountRefunded" : order.amountRefunded,
						          "amountTendered" : order.amountTendered,
						          
						          "loyaltyPointsEarned" : order.loyaltyPointsEarned,
						          
						          "cardAmt" : "0",
						          "cardType" : "",
						          "cashAmt" : "0",
						          "chequeAmt" : "0",
						          
						          "mcbJuiceAmt" : "0",
						          "mytMoneyAmt" : "0",
						          "emtelMoneyAmt" : "0",
						          "giftsMuAmt" : "0",
						          "mipsAmt" : "0",
						          
						          "discountAmt" : order.discountAmt,					          
						          "externalCardAmt" : "0",
						          "loyaltyAmt" : "0",
						          "giftCardAmt" : "0",
						          "openAmt" : "0.00",
						          "orderType" : "POS Order",      
						          
						          "payAmt" : "0",      
						          "qtyTotal" : order.qtyTotal,      
						          "taxTotal" : order.taxTotal,      
						          "totalLines" : order.subTotal,
						          "subTotal" : order.subTotal,
						          "grandTotal" : order.grandTotal,
						          "voucherAmt" : "0",
						          "writeOffAmt" : "0",          
						          
						          "creditCardDetails" : '',
						          "signature" : order.signature						          
						          
						        },
						        
						      "lines" : order.lines,
						      
						      "payments" : order.payments,
						          
						      "taxes" : this.getTaxes(order),
						      
						      "giftCards" : order.giftCards
						    };
					
					/* Restaurant */
					
					json.header.commandInfo = order["commandInfo"];
					
					/* Restaurant */
					
					
					/* set payment details */
					var cashAmt = new BigNumber(0);
					var cardAmt = new BigNumber(0);
					var chequeAmt = new BigNumber(0);
					var externalCardAmt = new BigNumber(0);
					var giftCardAmt = new BigNumber(0);
					var voucherAmt = new BigNumber(0);
					var loyaltyAmt = new BigNumber(0);
					
					var mcbJuiceAmt = new BigNumber(0);
					var mytMoneyAmt = new BigNumber(0);
					var emtelMoneyAmt = new BigNumber(0);
					var giftsMuAmt = new BigNumber(0);					
					var mipsAmt = new BigNumber(0);
					
					var payAmt = new BigNumber(0);
					var openAmt = new BigNumber(order.grandTotal);					
					
					for(var i=0; i<order.payments.length; i++){
						var payment = order.payments[i];
						
						var tenderType = payment.tenderType;
												
						if(tenderType == APP.TENDER_TYPE.CASH){
							cashAmt = cashAmt.plus(payment.cashAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.CARD){
							cardAmt = cardAmt.plus(payment.cardAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.CHEQUE){
							chequeAmt = chequeAmt.plus(payment.chequeAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.EXTERNAL_CARD){
							externalCardAmt = externalCardAmt.plus(payment.externalCardAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.GIFT_CARD){
							giftCardAmt = giftCardAmt.plus(payment.giftCardAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.LOYALTY){
							loyaltyAmt = loyaltyAmt.plus(payment.loyaltyAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.VOUCHER){
							try
							{
								voucherAmt = voucherAmt.plus(payment.voucherAmt);
							}
							catch (e) 
							{
								console.info("Invalid voucher amount --> " + payment.voucherAmt)
							}							
						}
						else if(tenderType == APP.TENDER_TYPE.MCB_JUICE){
							mcbJuiceAmt = mcbJuiceAmt.plus(payment.mcbJuiceAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.MY_T_MONEY){
							mytMoneyAmt = mytMoneyAmt.plus(payment.mytMoneyAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.EMTEL_MONEY){
							emtelMoneyAmt = emtelMoneyAmt.plus(payment.emtelMoneyAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.GIFTS_MU){
							giftsMuAmt = giftsMuAmt.plus(payment.giftsMuAmt);
						}
						else if(tenderType == APP.TENDER_TYPE.MIPS){
							mipsAmt = mipsAmt.plus(payment.mipsAmt);
						}
						else{
							console.info('Unsupported tender type --> ' + tenderType);
							continue;
						}
						
						payAmt = payAmt.plus(payment.payAmt);
					}
					

					openAmt = openAmt.minus(payAmt);
					
					json.header.payAmt = payAmt;
					json.header.openAmt = openAmt;
					
					json.header.cashAmt = cashAmt;
					json.header.cardAmt = cardAmt;
					json.header.chequeAmt = chequeAmt;
					json.header.externalCardAmt = externalCardAmt;
					json.header.loyaltyAmt = loyaltyAmt;
					json.header.giftCardAmt = giftCardAmt;
					json.header.voucherAmt = voucherAmt;
					
					json.header.mcbJuiceAmt = mcbJuiceAmt;
					json.header.mytMoneyAmt = mytMoneyAmt;
					json.header.emtelMoneyAmt = emtelMoneyAmt;
					json.header.giftsMuAmt = giftsMuAmt;
					json.header.mipsAmt = mipsAmt;
					
					/* printing preferences */
					var preference = terminal.preference;
					
					json.printReceipt = ( preference.printPaymentRule.indexOf( paymentRule ) >= 0 );
					json.printReceiptCopy = ( preference.printCopyPaymentRule.indexOf( paymentRule ) >= 0 );
					json.openDrawer = ( preference.openCashDrawer.indexOf( paymentRule ) >= 0 );
					
					json.printName = preference.printName;
					json.printDescription = preference.printDescription;
					json.printBarcode = preference.printBarcode || false;
					
					//backward compatibility
					if( order.version ){
						
						var payment = null;
						
						//fix payments
						for(var i=0; i<order.payments.length; i++){
							
							payment = order.payments[i];
							
							if(payment.tenderType == 'Cash'){
								
								json.header.amountTendered = payment['amountTendered'];
								json.header.amountRefunded = payment['amountRefunded'];
								
							}
						}
					}
					
					//set tax names on lines
					var line, tax = null;
					
					for(var i=0; i<json.lines.length; i++){
						
						line = json.lines[i];
						
						tax = APP.TAX.getTaxById(line.taxId);
						line.taxName = tax.taxName;
					}
					
					return json;
				}
		};
	 
	 APP.PURCHASE = {
				tableName : "purchase",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[PURCHASE] caching');
					
										
					jQuery.getJSON( "/json/purchase", function( records ){
						APP.PURCHASE.cache = TAFFY(records);
						dfd.resolve('[PURCHASE] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				searchPurchases : function(query){
					
					var results = this.cache(query).get();
					
					return results;
				},
				
				savePurchase : function(purchase){
					
					var postData = null;
					
					postData = JSON.stringify(purchase);
					
					var dfd = new jQuery.Deferred();
					
					jQuery.post("/json/purchase", {
		                json: postData

			            }, function (json, textStatus, jqXHR) {
	
			                if (json == null || jqXHR.status != 200) {
			                    /* failed to post */
			                	dfd.reject('[PURCHASE] failed to save purchase.');
			                    return;
			                }
			                
			                if (json.error) {
			                	/* error occured */
			                	dfd.reject('[PURCHASE] failed to save purchase. ' + json.error);
			                    return;
			                }
			                
			                var id = json.id;
							
							var results = APP.PURCHASE.searchPurchases({'id':id});
							var msg = '';
							if(results.length == 0){
									
								APP.PURCHASE.cache.insert(json);	
								msg = '[PURCHASE] saved #' + json.id;
							}
							else
							{
								APP.PURCHASE.cache({'id':id}).update(json);
								msg = '[PURCHASE] updated #' + json.id;
							}
							
							
							/* order = APP.ORDER.getOrderById(json.id);*/
							
							dfd.resolve(msg, json);
	
			            },
			            "json").fail(function (e) {
			            /* failed to post*/
			            dfd.reject('[PURCHASE] failed to save purchase. ' + e);
			        });
					
					return dfd.promise();					
				},
				
				getPurchaseById : function(id){
					var query = {"id" : {'==':id}};			
					var results = this.searchPurchases(query);
					
					if(results.length != 0){
						var order = jQuery.extend({}, results[0]);
						return order;
					}
					
					return null;
				}
		};
	 
	 APP.SYSTEM = {
				tableName : "system"
		};
		
	APP.MODIFIER_GROUP = {
				tableName : "modifierGroup",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[MODIFIER_GROUP] caching');
					
					/*
					jQuery.db.values('modifierGroup', null, 10000).done(function(records){
						APP.MODIFIER_GROUP.cache = TAFFY(records);
						dfd.resolve('[MODIFIER_GROUP] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/modifier_group", function( records ){
						APP.MODIFIER_GROUP.cache = TAFFY(records);
						dfd.resolve('[MODIFIER_GROUP] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getModifierGroupById : function(groupId){					
					var query = {"groupId" : {'==':groupId}};			
					var results = this.search(query);
					
					if(results.length != 0){
						var ModifierGroup = jQuery.extend({}, results[0]);
						return ModifierGroup;
					}
					
					return null;
				},
				
				search : function(query){					
					var results = this.cache(query).get();
					return results;
				}
	};
	
	APP.PRODUCT_MODIFIER_GROUP = {
				tableName : "productModifierGroup",
				
				initialize : function(){
					var dfd = new jQuery.Deferred();
					
					dfd.notify('[PRODUCT_MODIFIER_GROUP] caching');
					
					/*
					jQuery.db.values('productModifierGroup', null, 10000).done(function(records){
						APP.PRODUCT_MODIFIER_GROUP.cache = TAFFY(records);
						dfd.resolve('[PRODUCT_MODIFIER_GROUP] Cached ' + records.length + ' records.');
				    });
				    */
					
					jQuery.getJSON( "/json/product_modifier_group", function( records ){
						APP.PRODUCT_MODIFIER_GROUP.cache = TAFFY(records);
						dfd.resolve('[PRODUCT_MODIFIER_GROUP] Cached ' + records.length + ' records.');
					});
					
					return dfd.promise();
				},
				
				getModifierGroups : function(product_id){					
					var query = {"product_id" : {'==':product_id}};			
					var results = this.search(query);
					
					if(results.length > 0){						
						return results;
					}
					
					return [];
				},
				
				search : function(query){					
					var results = this.cache(query).get();
					return results;
				}
	};
	 
/**
 * =================================================================================================================== *
 * Some utilities
 * =================================================================================================================== *
 */
APP.UTILS = {};

/**
 * UUID generator
 */

APP.UTILS.UUID = {
		getUUID : function(){
			var length = 32;
			if(arguments.length > 0){
				length = parseInt(arguments[0]);
			}
			
			var uuid = "", i, random;
			for (i = 0; i < length; i++) {
				random = Math.random() * 16 | 0;

				if (i == 8 || i == 12 || i == 16 || i == 20) {
					uuid += "-"
				}
				uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
			}
			return uuid;
		}
};

/**
 * Smart Order Synchronizier
 * synchronised orders in batch
 * limit - batch size
 * interval - data push interval 
 */
APP.UTILS.SmartOrderSynchronizer = {
	offset : 0,
    status: 'IDLE',
    orderQueue: null,
    
    pushTimeoutHandle: null,
    
    synchronize: function (options) {
        if (this.status == 'RUNNING') return this;
        
        var defaults = {
    			limit : 100,
    			interval : 30
    		};
    	
    	jQuery.extend(this, defaults, options || {});

        this.status = 'RUNNING';
        this.getOrders();
        
        return this;
    },

    getOrders: function () {
        var query = {
            status: ["", "DR", "IP"]
        };
        this.orderQueue = APP.ORDER.searchOrders(query);

        if (this.orderQueue.length == 0){
        	this.doneFn();
        	return;
        }

        console.log('[SmartOrderSynchronizer] processing ' + this.orderQueue.length + ' orders');
        this.offset = 0;
        this.push();
    },

    push: function () {
    	
    	if(navigator.onLine == false){
			 APP.UTILS.SmartOrderSynchronizer.abort('[SmartOrderSynchronizer] failed to connect to app server.');
			 alert("You are currently offline! Please check your internet connection.");
            return;
		}
    	
        var tmp = [];
        var orders = null;

        if (this.offset == this.orderQueue.length) {
        	
        	/* look for unprocessed orders */
        	var query = {
                status: ["", "DR", "IP"]
            };        	
        	
            this.orderQueue = APP.ORDER.searchOrders(query);
            
            if(this.orderQueue.length == 0){
            	console.log('[SmartOrderSynchronizer] synchronization completed.');
                this.status = 'IDLE';
                
                this.doneFn();	            
                return;
            }
            else
        	{
            	this.offset = 0;
            	console.log('[SmartOrderSynchronizer] completing queued orders.');
        	}               
            
        }

        var startAt = this.offset;
        var stopAt = this.limit + this.offset;

        if (stopAt > this.orderQueue.length) {
            stopAt = this.orderQueue.length;
        }

        console.log('[SmartOrderSynchronizer] synchronizing ' + startAt + ' to ' + stopAt + ' ...');

        for (var i = startAt; i < stopAt; i++) {
            tmp.push(this.orderQueue[i]);
        }

        this.offset = stopAt;

        if (typeof Prototype == "undefined") {
            orders = JSON.stringify(tmp);
        } else {
            orders = Object.toJSON(tmp);
        }

        jQuery.post("OfflineAction.do", {
                action: "syncOrders",
                json: orders

            }, function (json, textStatus, jqXHR) {

                if (json == null || jqXHR.status != 200) {
                    APP.UTILS.SmartOrderSynchronizer.abort('[SmartOrderSynchronizer] failed to connect to app server.');
                    return;
                }

                var results = json;
                for (var i = 0; i < results.length; i++) {

                    var result = results[i];
                    var uuid = result.uuid;
                    var status = result.status;

                    var query = {
                        'uuid': uuid
                    };
                    var order = APP.ORDER.searchOrders(query)[0];

                    if (status == 'ER') {
                        order.error = true;
                        order.sync = false;
                        order.status = status;
                        order.errormsg = result.error;

                        console.error('[SmartOrderSynchronizer] failed to synchronize #' + uuid + '! Error: ' + result.error);

                    } else {
                        order.sync = true;
                        order.status = status;

                        if (status == 'DR') {
                            console.log('[SmartOrderSynchronizer] queued #' + uuid);
                        }
                        
                        if (status == 'IP') {
                            console.log('[SmartOrderSynchronizer] processing #' + uuid);
                        }

                        if (status == 'CO') {
                            console.log('[SmartOrderSynchronizer] synchronized #' + uuid);
                        }
                    }

                    APP.ORDER.saveOrder(order).done(function (msg) {
                        console.log(msg);
                    }).fail(function (err) {
                        console.error(err);
                    });


                } /*for*/

                /*wait before pushing again*/
                window.clearTimeout(this.pushTimeoutHandle);
                this.pushTimeoutHandle = window.setTimeout(function () {
                    APP.UTILS.SmartOrderSynchronizer.push();
                }, APP.UTILS.SmartOrderSynchronizer.interval * 1000);
            },
            "json").fail(function (e) {
            APP.UTILS.SmartOrderSynchronizer.abort(e);
        });
    },

    abort: function (e) {
        console.log('[SmartOrderSynchronizer] push aborted. Returning ...');
        this.status = 'IDLE';
        this.failFn(e);
    },
    
    done : function(fn){
    	this.doneFn = fn;
    	return this;
    },
    
    doneFn : function(){
    	console.log('synchronization completed.');
    },
    
    fail : function(fn){
    	this.failFn = fn;
    	return this;
    },
    
    failFn : function(e){
    	console.error('synchronization failed. ' + e);
    }

};

/** 
 * Application cache event listner 
 * ====================================================================
 * 
 * usage example
 * 
 * new APP.UTILS.ApplicationCacheEventListner().cached().error();
 * 
 * */

APP.UTILS.ApplicationCacheEventListener = function(){
	
};


/** 
 * Network event listener 
 * ====================================================================
 * 
 *  usage example
 *  
 *  new APP.UTILS.NetworkEventListener().connected(function(){
 * 		// code to execute on network connect
 * 	}).disconnected(function(){
 * 		// code to execute on network disconnect
 * 	});
 * 
 * */

APP.UTILS.NetworkEventListener = function(){
	
	var listner = {};	
	
	listner.online = function(){
		if(this.connectedFn) this.connectedFn();
	};
	
	listner.offline = function(){
		if(this.disconnectedFn) this.disconnectedFn();
	};
	
	listner.connected = function(fn){
		this.connectedFn = fn;
		return this;
	};
	
	listner.disconnected = function(fn){
		this.disconnectedFn = fn;
		return this;
	};
			
	window.addEventListener("online", function(){
		listner.online();
	});
	
	window.addEventListener("offline", function(){
		listner.offline()
	});	
	
	return listner;
};


/**
 * Server monitor
 * ====================================================================
 * 
 *  usage example
 *  
 *  new APP.UTILS.ServerMonitor({options}).reachable(function(){
 * 		// code to execute when connection is established with server
 * 	}).unreachable(function(){
 * 		// code to execute when server connection is lost
 * 	});
 * 
 * options:
 *  frequency - ping frequency
 *  pingtimeout - ping timeout  
 *  decay - frequency decay
 *  pingURL - url to ping
 * 
 **/

APP.UTILS.ServerMonitor = function(options){
	
	this.frequency = 5000;
	this.decay = 2000;
	this.pingtimeout = 4000;
	this.pingURL = 'server-ping.jsp';
	this.serverStatus = '';
	
	if(options){
		this.frequency = options.frequency || this.frequency;
		this.decay = options.decay || this.decay;
		this.pingtimeout = options.pingtimeout || this.pingtimeout;
		this.pingURL = options.pingURL || this.pingURL;
	}
	
	var defer = {};
	defer.online = function(){
		if(this.connectedFn) this.connectedFn();
	};
	
	defer.offline = function(){
		if(this.disconnectedFn) this.disconnectedFn();
	};
	
	defer.reachable = function(fn){
		this.connectedFn = fn;
		return this;
	};
	
	defer.unreachable = function(fn){
		this.disconnectedFn = fn;
		return this;
	};
	
			
	this.updateServerStatus = function(status){
		
		var previousServerStatus = this.serverStatus;
		if(status == '200'){
			this.serverStatus = 'online';
		}
		else
		{
			this.serverStatus = 'offline';
		}
		
		if(previousServerStatus != this.serverStatus)
		{
			this.onServerStatusChange();
		}
		
		var monitor = this;
		this.frequency = this.frequency + this.decay;
		
		this.pingTimeoutHandle = window.setTimeout(function(){
			monitor.ping();
		},this.frequency);
		
	};
	
	this.onServerStatusChange = function(){			
		
		if(this.serverStatus == 'online'){
			defer.online();
		}
		else
		{
			defer.offline();
		}
	};
	
	this.ping = function(){
		
		var monitor = this;
		var urlToPing = monitor.pingURL + '?' + Math.random();
		
		jQuery.ajax({
		    cache: false,
		    timeout: monitor.pingtimeout,
		    type: "HEAD",
		    url: urlToPing,
		    complete:function(xhr, status){ 			    	
		    	monitor.updateServerStatus(xhr.status);
		    }
		   });
		
	};
	
	/* start ping */
	
	var monitor = this;
	var frequency = this.frequency;
	
	this.pingTimeoutHandle = window.setTimeout(function(){
		monitor.ping();
	}, this.frequency);
	
	
	return defer;
};

/*
new NetworkEventListner().connected(function(){
	console.log('connected :)');
}).disconnected(function(){
	console.log('disconnected :(');
});

 new ServerMonitor().reachable(function(){
 	console.log('server up');
 }).unreachable(function(){
 	console.log('server down');
 });
 */

/*============================================================================================*/
APP.switchOffline = function(){
	/* check if offline data is ready */
	var IS_OFFLINE_READY = sessionStorage.getItem("IS_OFFLINE_READY");
	if(IS_OFFLINE_READY != 'true'){
		alert('Offline mode is not ready! Please try later.');
		return;
	}
	
	if(window.confirm("Do you want to switch to OFFLINE mode?")){
		window.localStorage.setItem('continue-offline-flag', 'true'); /* see offline-monitor.js line 25*/
		window.location = "offline/select-user.do";
	}
	
};

APP.switchOnline = function(){
	if(window.confirm("Do you want to switch to ONLINE mode?")){
				
		jQuery.ajax({
		    cache: false,
		    timeout: 4000,
		    type: "HEAD",
		    url: 'server-ping.jsp',
		    complete:function(xhr, status){ 
		    	if(xhr.status == '200'){
		    		window.localStorage.setItem('continue-offline-flag', 'false');
		    		window.location = "select-user.do";
		    	}
		    	else
		    	{
		    		dialog.hide();
		    		alert('Unable to connect to posterita.');
		    	}
		    }
	   });
		
		
	}
	
};

/* Some utility functions */
/*============================================================================================*/
APP.logout = function() {
	
	var logout = window.confirm(I18n.t('Are you sure you want to logout?'));
	
	if(!logout) return;
	
	
	/* clear session storage */
	sessionStorage.clear();
	
	/* clear local storage */
	/* DO NOT clear localstorage as it is used as cookie replacement
	 *  localStorage.clear(); */
	
	/* forward to select-user.html */
	window.top.location = 'html/4.2/select-user.html';
};

APP.TENDER_TYPE = {
		CARD : 'Card',
		CASH : 'Cash',
		CHEQUE : 'Cheque',
		CREDIT : 'Credit',
		MIXED : 'Mixed',
		VOUCHER : 'Voucher',
		EXTERNAL_CARD : 'Ext Card',
		GIFT_CARD : 'Gift Card',
		SK_WALLET : 'SK Wallet',
		ZAPPER : 'Zapper',
		LOYALTY : 'Loyalty',
		
		MCB_JUICE : 'MCB Juice',
		MY_T_MONEY : 'MY.T Money',
		EMTEL_MONEY : 'Emtel Money',
		GIFTS_MU : 'Gifts.mu',
		MIPS : 'MIPS'
};

APP.PAYMENT_RULE = {
		CARD : 'K',
		CASH : 'B',
		CHEQUE : 'S',
		CREDIT : 'P',
		MIXED : 'M',
		VOUCHER : 'V',
		EXTERNAL_CARD : 'E',
		GIFT_CARD : 'G',
		SK_WALLET : 'W',
		ZAPPER : 'Z',
		LOYALTY : 'L',
		
		MCB_JUICE : 'J',
		MY_T_MONEY : 'Y',
		EMTEL_MONEY : 'T',
		GIFTS_MU : 'U',
		MIPS : 'I'
};

APP.getPaymentRuleFromTenderType = function( tenderType ){
	
	var paymentRule = "?";
	
	switch( tenderType ){
	
		case APP.TENDER_TYPE.CARD : paymentRule = APP.PAYMENT_RULE.CARD; break;
		
		case APP.TENDER_TYPE.CASH : paymentRule = APP.PAYMENT_RULE.CASH; break;
		
		case APP.TENDER_TYPE.CHEQUE : paymentRule = APP.PAYMENT_RULE.CHEQUE; break;
		
		case APP.TENDER_TYPE.CREDIT : paymentRule = APP.PAYMENT_RULE.CREDIT; break;
		
		case APP.TENDER_TYPE.MIXED : paymentRule = APP.PAYMENT_RULE.MIXED; break;
		
		case APP.TENDER_TYPE.VOUCHER : paymentRule = APP.PAYMENT_RULE.VOUCHER; break;
		
		case APP.TENDER_TYPE.EXTERNAL_CARD : paymentRule = APP.PAYMENT_RULE.EXTERNAL_CARD; break;
		
		case APP.TENDER_TYPE.GIFT_CARD : paymentRule = APP.PAYMENT_RULE.GIFT_CARD; break;
		
		case APP.TENDER_TYPE.SK_WALLET : paymentRule = APP.PAYMENT_RULE.SK_WALLET; break;
		
		case APP.TENDER_TYPE.ZAPPER : paymentRule = APP.PAYMENT_RULE.ZAPPER; break;
		
		case APP.TENDER_TYPE.LOYALTY : paymentRule = APP.PAYMENT_RULE.LOYALTY; break;
		
		case APP.TENDER_TYPE.MCB_JUICE : paymentRule = APP.PAYMENT_RULE.MCB_JUICE; break;
		
		case APP.TENDER_TYPE.MY_T_MONEY : paymentRule = APP.PAYMENT_RULE.MY_T_MONEY; break;
		
		case APP.TENDER_TYPE.EMTEL_MONEY : paymentRule = APP.PAYMENT_RULE.EMTEL_MONEY; break;
		
		case APP.TENDER_TYPE.GIFTS_MU : paymentRule = APP.PAYMENT_RULE.GIFTS_MU; break;
		
		case APP.TENDER_TYPE.MIPS : paymentRule = APP.PAYMENT_RULE.MIPS; break;
		
		default: paymentRule = "?";
	
	}
	
	return paymentRule;
	
};


/*===========================================================================================*/
APP.initCache = function(){
	
var dfd = new jQuery.Deferred();
	
	jQuery.when (
		  
			APP.USER.initialize(),
			APP.ROLE.initialize(),
			APP.ROLE_ORG_ACCESS.initialize(),
			APP.PRODUCT.initialize(),
			APP.TAX.initialize(),
			APP.ORDER.initialize(),
			APP.TERMINAL.initialize(),
			APP.BOM.initialize(),
			APP.BP.initialize(),
			APP.PRODUCT_MODIFIER_GROUP.initialize(),
			APP.MODIFIER_GROUP.initialize(),		  
			APP.STORE.initialize(),
			APP.WAREHOUSE.initialize(),
			APP.PRODUCT_PRICE.initialize(),
			APP.PURCHASE.initialize()
			
			
			).done(function(){
				
				for (var i = 0, j = arguments.length; i < j; i++) {
		        	if(arguments[i]) console.log(arguments[i]);
		        }
				
				dfd.resolve("Caching completed");
				
			}).fail(function(){
				
				dfd.reject("Caching failed!");
			});
	
	return dfd.promise();
	
};

APP.sendEmail = function(subject, htmlContent){
	
	var data = {  
			"sender":{  
		      "name":"Celebs POS",
		      "email":"no-reply@posterita.com"
		   },
		   "to":[  
			  /*
		      {  
		         "email":"taslim.motaleb@posterita.com",
		         "name":"Taslim Motaleb"
		      },
		      {  
		         "email":"yan@tamakgroup.com",
		         "name":"Yan"
		      }
		      */
		      {
		    	  "email":"praveen.beekoo@posterita.com",
		    	  "name":"Praveen Beekoo"
		      }
		   ],
		   "subject": subject,
		   "htmlContent": htmlContent
	};
	
	var settings = {
			  "async": true,
			  "crossDomain": true,
			  "url": "https://api.sendinblue.com/v3/smtp/email",
			  "type": "POST",
			  "headers": {
			    "accept": "application/json",
			    "content-type": "application/json",
			    "api-key": "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",
			    "cache-control": "no-cache"
			  },
			  "processData": false,
			  "data": JSON.stringify( data )
	};

	jQuery.ajax(settings).done(function (response) {
	  console.log(response);
	});
};

