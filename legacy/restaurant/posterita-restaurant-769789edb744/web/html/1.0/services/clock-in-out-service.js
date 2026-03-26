angular.module('app').service('ClockInOutService', function(){
	
	var service = this;
	
	service.clockedInUsers = [];
	
	service.setClockedInUsers = function( users ){
		this.clockedInUsers = users;
	};
	
	service.isUserClockedIn = function(user_id){
		
		var user;
		
		for(var i=0; i<this.clockedInUsers.length; i++){
			
			user = this.clockedInUsers[i];
			
			if( user['user_id'] == user_id ){
				return true;
			}
		}
		
		return false;
		
	};
	
});