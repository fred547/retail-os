angular.module('app').service('ViewOrderService', function(OrderService){
	
	var service = this;
	
	service.order = null;
	
	service.setOrder= function( order ){
		this.order = order;
	};
	
	service.getOrder = function(){
		return this.order;
	};	
	
	service.reset = function(){
		this.order = null;
	};
	
	service.getOpenAmt = function(){
		return OrderService.getOpenAmt( this.order );
	};
	
});