angular.module('app').service('TableService', function($http, LoginService){
	
	var service = this;
	
	service.tables = [];	
	service.tableMap = {};
	service.activeTable = null;
	
	service.getActiveTable = function(){
		
		return this.activeTable;
	};
	
	service.setActiveTable = function( table ){
		
		this.activeTable = table;
	};
	
	service.getTable = function(table_id){
		
		var post = {};
		post['action'] = 'get-table';
		post['table_id'] = table_id;
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.getTables = function(){
		
		var post = {};
		post['action'] = 'get-tables';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.getAvailableTables = function(){
		
		var post = {};
		post['action'] = 'available-tables';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};
	
	service.switchTable = function(from_id, to_id, identifier){
		
		var post = {};
		post['action'] = 'switch-table';
		post['table_id'] = from_id;
		post['to_table_id'] = to_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
	
	service.reserveTable = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'reserve-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.cancelReservation = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'cancel-reservation';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.assignOrder = function( table_id, order_id, identifier ){
		
		var post = {};
		post['action'] = 'assign-order';
		post['table_id'] = table_id;
		post['order_id'] = order_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.clearTable = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'clear-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.updateTableStatus = function( table_id, status, identifier ){
		
		var post = {};
		post['action'] = 'update-table-status';
		post['table_id'] = table_id;
		post['status'] = status;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.mergeTables = function( table_id, child_table_ids, identifier ){
		
		var post = {};
		post['action'] = 'merge-tables';
		post['table_id'] = table_id;
		post['child_table_ids'] = child_table_ids;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};
	
	service.getTakeAwayNo = function(){
		
		var post = {};
		post['action'] = 'get-take-away-no';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
	
	service.getDineInNo = function(){
		
		var post = {};
		post['action'] = 'get-dine-in-no';
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
		
	};	
		
	service.sendToKitchen = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'send-to-kitchen';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.checkoutTable = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'checkout-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.voidOrder = function( order_id, table_id, identifier ){
		
		var post = {};
		post['action'] = 'void-order';
		post['order_id'] = order_id;
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.lockTable = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'lock-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
	
	service.unlockTable = function( table_id, identifier ){
		
		var post = {};
		post['action'] = 'unlock-table';
		post['table_id'] = table_id;
		post['ad_user_id'] = LoginService.user.ad_user_id;
		post['terminal_id'] = LoginService.terminal.id;
		post['identifier'] = identifier;
		
		post = JSON.stringify(post);
		
		var url = "/restaurant/?json=" + post;
		
		return $http.post(url);
	};
		
});