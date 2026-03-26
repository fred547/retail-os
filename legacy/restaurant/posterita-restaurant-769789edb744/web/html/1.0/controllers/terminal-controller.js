angular.module('app').controller("TerminalController", function( $scope, $modal, $window, $location, $timeout, LoginService ){
	
	var ctrl = this;
	
	ctrl.terminalList = []; 
	
	ctrl.storeList = APP.STORE.searchStores({});	
	
	ctrl.renderTerminalList = function( store ){	
		
		var terminals = APP.TERMINAL.searchTerminals({ "ad_org_id" : {'==':store.ad_org_id }});
		ctrl.terminalList = terminals;
		ctrl.terminal = null;
	};	
	
	
	ctrl.exit = function(){
		
		if($window.PosteritaBrowser){
			
			$window.PosteritaBrowser.exit2();			
		}	
		/*
		 * var remote = require('electron').remote; var window =
		 * remote.getCurrentWindow(); window.close();
		 */
		
		/*
		var isNodeApp = !!window.process;
		if(isNodeApp){
			
			var remote = require('electron').remote;
			var window = remote.getCurrentWindow();
			window.close();
		}
		*/
		
	};
	
	ctrl.isValid = function(){
		
		return ( ctrl.store != null && ctrl.store != ""
				&& ctrl.terminal != null && ctrl.terminal != "" );
		
	};
	
	ctrl.ok = function(){
		
		LoginService.store = ctrl.store;
		LoginService.terminal = ctrl.terminal;
		
		var details = {};
		details.store_id = ctrl.store.id;
		details.terminal_id = ctrl.terminal.id;
		
		details = JSON.stringify( details );
		
		localStorage.setItem("#STORE-TERMINAL-DETAILS", details);			
		
		$timeout(function()
		{
			$location.path("/login");
		});
		
	};
	
});