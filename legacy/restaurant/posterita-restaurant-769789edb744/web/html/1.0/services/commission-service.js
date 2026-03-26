angular.module('app').service('CommissionService', function(){
	
	var service = this;	
		
	service.commissions = new HashMap();
	
	service.active_user_id = null;
	service.amount = 0;
	
		
	service.updateUsers = function( json ){
		
		this.commissions.clear();
		
		for(var i=0; i<json.length; i++ ){
			
			user = json[i];
			
			commission = {
					
					amount : 0,
					user_id : user['user_id'],
					username : user['name'],
					active: false					
			};
			
			this.commissions.put( user['user_id'], commission );			
		}
		
		if(! this.commissions.hasItem( this.active_user_id ) ){
			
			var ids = this.commissions.keys();
			
			this.active_user_id = ids[0];
		}
		
		
		this.reset();	
	}
	
	service.setActive = function( id ){	
		
		this.active_user_id = id;
		
		this.reset();	
		
	}
	
	service.setAmount = function(amount){
		
		if(amount < 0){
			
			amount = 0;			
		}
		
		this.amount = amount;
		
		this.reset();		
	}
	
	service.reset = function(){
		
		this.commissions.each(function(user_id, commission){
			
			commission.amount = 0;
			commission.active = false;
			
		});	
		
		var commission = this.commissions.get(this.active_user_id);
		
		if( commission != null ){
			
			commission.amount = this.amount;
			commission.active = true;
		}
		
	}
	
	service.getCommissions = function(){
		return this.commissions.toArray();
	}
	
	service.setCommissions = function( commissions ){
		
		this.commissions = new HashMap();
		
		var i, commission;
		
		for( i=0; i<commissions.length; i++ ){
			
			commission = commissions[i];
			
			this.commissions.put( commission['user_id'], commission );
			
		}		
		
	}
	
	service.getSplits = function(){
		
		var splits = [];
		
		this.commissions.each(function(user_id, commission){
			
			if( commission.amount > 0 ){
				
				splits.push( commission );				
			}			
		});
		
		if( splits.length == 0){
			
			var commission = this.commissions.get(this.active_user_id);
			splits.push( commission );	
		}
		
		return splits;
	}
	
	service.setCommission = function( user_id, amount ){
		
		var commission = this.commissions.get(user_id);
		commission.amount = amount;
		
	};
	
});