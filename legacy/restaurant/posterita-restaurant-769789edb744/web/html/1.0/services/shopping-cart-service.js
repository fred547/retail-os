angular.module('app').service('ShoppingCartService', function(LoginService){
	
	var service = this;
	
	service.carts = new HashMap();
	
	service.getShoppingCart = function( orderType ){
		
		var cart = this.carts.get( orderType );
		
		if( cart == null){
			
			cart = new ShoppingCart( orderType );
			
			var terminal = LoginService.terminal;
			cart.pricelistId = terminal['m_pricelist_id'];
			cart.default_pricelistId = terminal['m_pricelist_id'];
			
			this.carts.put( orderType, cart );
			
		}
		
		this.shoppingCart = cart;
		
		return cart;
		
	}
	
	service.setShoppingCart = function( cart ){
		
		this.shoppingCart = cart;
		
	};
	
	service.reset = function(userTriggered){
		
		if(this.shoppingCart != null){
			this.shoppingCart.clearCart(userTriggered);
		}		
		
	};
	
});