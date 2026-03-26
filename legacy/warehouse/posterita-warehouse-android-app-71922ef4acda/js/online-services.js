var OnlineService = {
		call : function(url, post, errorMessage){
			
			//jQuery.blockUI({ message: '<h1>' + I18n.t('Please wait ...') + '</h1>' });
			
			var timeout = setTimeout(function() {
				
				onTimeout();
				
		    }, 1000 * 60 * 2 ); // 
			
			var onTimeout = function(){
								
				ajax.abort();
				
				console.log('Connection timeout');
			};
			
			var dfd = new jQuery.Deferred();
			
			var ajax = jQuery.post( APP.SERVER_URL + url,
	    		{ json : post},
	    		function(json, textStatus, jqXHR){	
	    			
	    			//jQuery.unblockUI();
	    			
	    			clearTimeout( timeout );
	    			
	    			if(json == null || jqXHR.status != 200){
	    				dfd.reject(errorMessage); 
	    				return;
	    			}  
	    			
	    			if(json.error){
	    				dfd.reject(json.error);
	    				return;
	    			}
	    			
	    			dfd.resolve(json); 	    			
	    			
	    		},
			"json").fail(function( jqXHR, textStatus, errorThrown ){
				
				//jQuery.unblockUI();
				
				clearTimeout( timeout );
				
				if( 'abort' == textStatus )
				{
					dfd.reject(errorMessage + " Connection timeout.");
				} 
				else
				{
					dfd.reject(errorMessage);
				}
			});
			
			return dfd;
		}
};

var LogInService = jQuery.extend({
	logIn : function(post){		
		var url = "/service/Login/logIn";
		var errorMessage = "Failed to log in!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var PickingListService = jQuery.extend({
	document : function(post){		
		var url = "/service/PickingList/document";
		var errorMessage = "Failed to load document!";	
		return this.call(url, post, errorMessage);
	},
	complete : function(post){		
		var url = "/service/PickingList/complete";
		var errorMessage = "Failed to complete document!";	
		return this.call(url, post, errorMessage);
	},
	warehouseList : function(post){		
		var url = "/service/PickingList/warehouseList";
		var errorMessage = "Failed to get warehouse list!!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

/*
var XXXService = jQuery.extend({
	
}, OnlineService);
*/