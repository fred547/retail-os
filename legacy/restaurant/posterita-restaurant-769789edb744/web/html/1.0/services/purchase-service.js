angular.module('app').service('PurchaseService', function(){
	
	var service = this;
	
	service.document = null;
	
	service.setDocument = function( doc ){
		this.document = doc;
	};
	
	service.getDocument = function(){
		return this.document;
	};
	
});