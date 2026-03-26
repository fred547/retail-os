var CONFIG = {
		
		getServerEndpoint : function(){
			
			return localStorage.getItem('SERVER_ENDPOINT');
			
		},
		
		setServerEndpoint : function( url ){
			
			localStorage.setItem('SERVER_ENDPOINT', url);
			
		},
		
		getClientId : function(){
			
			return localStorage.getItem('CLIENT_ID') || 0;
			
		},
		
		setClientId : function( client_id ){
			
			localStorage.setItem('CLIENT_ID', client_id);
			
		},
		
		getDomain : function(){
			
			return localStorage.getItem('DOMAIN');
			
		},
		
		setDomain : function( domain ){
			
			localStorage.setItem('DOMAIN', domain);
			
		},
		
		getStoreId : function(){
			
			return localStorage.getItem('STORE_ID') || 0;
			
		},
		
		setStore : function( store ){
			
			localStorage.setItem('STORE', JSON.stringify(store));
			
		},
		
		getStore : function(){
			
			var store = localStorage.getItem('STORE');
			
			if(store){
				store = JSON.parse(store);
			}
			
			return store;
		},
		
		resetStore : function(){
			localStorage.removeItem('STORE');
		},
		
		setStoreId : function( store_id ){
			
			localStorage.setItem('STORE_ID', store_id);
			
		},
		
		getTerminalId : function(){
			return localStorage.getItem('TERMINAL_ID') || 0;
		},
		
		setTerminalId : function( terminal_id ){
			localStorage.setItem('TERMINAL_ID', terminal_id);
		},
		
		getUserId : function(){
			
			var user = CONFIG.getUser();
			if(user == null) return 0;
			
			return user['ad_user_id'];
		},
		
		setUser : function( user ){
			
			localStorage.setItem('USER', JSON.stringify(user));
		},
		
		getUser : function(){
			
			var user = localStorage.getItem('USER');
			
			if(user){
				user = JSON.parse(user);
			}
			
			return user;
		},
		
		getWarehouseId : function(){
			return localStorage.getItem('WAREHOUSE_ID') || 0;
		},
		
		setWarehouseId : function( warehouse_id ){
			localStorage.setItem('WAREHOUSE_ID', warehouse_id);
		},
		
		setWarehouse : function( warehouse ){
			
			localStorage.setItem('WAREHOUSE', JSON.stringify(warehouse));
			
		},
		
		getWarehouse : function(){
			
			var warehouse = localStorage.getItem('WAREHOUSE');
			
			if(warehouse){
				warehouse = JSON.parse(warehouse);
			}
			
			return warehouse;
		},
		
		resetWarehouse : function(){
			localStorage.removeItem('WAREHOUSE');
		},
		
		resetUser : function(){
			localStorage.removeItem('USER');
		},
		
		resetTerminal : function(){
			this.resetWarehouse();
			this.resetStore();
		},
};