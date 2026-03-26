angular.module('app').service('CustomerService', function( ShoppingCartService ){
	
	var service = this;
	
	service.default_customer = null;	
	service.current_customer = null;
	
	service.reset = function(){
		this.current_customer = this.default_customer;
	};
	
	service.isCustomerDefault = function(){
		return this.current_customer != null && this.default_customer.c_bpartner_id == this.current_customer.c_bpartner_id;
	};
	
	service.getDefaultCustomer = function(){		
		return this.default_customer;		
	};
	
	service.setDefaultCustomer = function(customer){		
		this.default_customer = customer;
		this.current_customer = customer;
		return;
	};
		
	service.getCustomer = function(){
		
		/* return this.current_customer || this.default_customer; */
		return this.current_customer;
		
	};
	
	service.setCustomer = function(customer){
		
		/*console.log("Customer updated " + JSON.stringify(customer));*/
		
		var cart = ShoppingCartService.shoppingCart;
		
		var bp = null;
		
		if( typeof customer == "object" ){
			bp = customer;
		}
		
		this.current_customer = bp;			
		
		if(cart != null && bp != null){
			
			cart.setBp( bp );
			
		}		
		
	};
	
	service.saveCustomer = function(json){
		
		this.current_customer = json;
		
	};
	
	service.searchCustomer = function(searchTerm){
		
		var query = [
				     {"name":{likenocase:searchTerm}},
				     {"phone":{leftnocase:searchTerm}},
				     {"phone2":{leftnocase:searchTerm}},
				     {"identifier":{leftnocase:searchTerm}},
				     {"c_bpartner_id":{'==':searchTerm}}				     
				];				
		
		var results = APP.BP.cache({"iscustomer":"Y"},query).limit(5).get();
		
		return results;
		
	};
	
});