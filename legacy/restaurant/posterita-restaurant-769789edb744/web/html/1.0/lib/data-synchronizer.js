var DataSynchronizer = {
		synchronizeOrders : function(){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['action'] = "order";

			post = JSON.stringify(post);

			jQuery.get(
			    "/synchronize?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to synchronize orders!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject(json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to synchronize orders!");
			});
			
			return dfd.promise();
		},
		
		synchronizePOS : function(){
			
			var dfd = new jQuery.Deferred();
			
			var post = {};
			post['action'] = "pos";

			post = JSON.stringify(post);

			jQuery.get(
			    "/synchronize?json=" + post, {},
			    function(json, textStatus, jqXHR) {

			        if (json == null || jqXHR.status != 200) {
			            dfd.reject("Failed to synchronize POS!");
			            return;
			        }

			        if (json.error) {
			            dfd.reject(json.error);
			            return;
			        }
			        
			        dfd.resolve(json);

			    }, "json").fail(function() {
			    dfd.reject("Failed to synchronize POS!");
			});
			
			return dfd.promise();
		}
};