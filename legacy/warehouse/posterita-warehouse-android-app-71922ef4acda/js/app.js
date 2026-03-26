var APP = {};

APP.quit = function(){
	
	if( navigator && navigator.app ){
		
		navigator.app.exitApp();
		
	}
	
};

APP.checkServer = function( endpoint, domain ){
	
	var dfd = new jQuery.Deferred();	
	
	jQuery.getJSON( endpoint + "/service/LogIn/validateDomain?json={'merchantKey':0,'terminalKey':0, 'domain':" + domain + "}", function( data ){
		
		dfd.resolve( data );
		
	}).fail(function() {
		
		dfd.reject("Failed to connect to server");
	});
	
	return dfd.promise();
	
};

APP.getUserList = function(){
	
	var dfd = new jQuery.Deferred();	
	
	jQuery.getJSON( CONFIG.getServerEndpoint() + "/service/LogIn/users?json={'merchantKey':" + CONFIG.getClientId() + ",'terminalKey':0}", function( data ){
		
		if( data.error )
		{
			dfd.reject( data.error );
		}
		else
		{
			dfd.resolve( data );
		}		
		
	}).fail(function() {
		
		dfd.reject("Failed to connect to server");
	});
	
	return dfd.promise();
	
};

APP.login = function( username, pin ){
	
	var dfd = new jQuery.Deferred();	
	
	jQuery.getJSON( CONFIG.getServerEndpoint() + "/service/LogIn/logIn?json={'merchantKey':" + CONFIG.getClientId() 
			+ ",'terminalKey':0, 'username':'" + username + "', 'pin':'" + pin + "', 'password':''}", function( data ){
		
		dfd.resolve( data );
		
	}).fail(function() {
		
		dfd.reject("Failed to connect to server");
	});
	
	return dfd.promise();
	
};

APP.logout = function(){
	
	var dfd = new jQuery.Deferred();	
	
	CONFIG.resetUser();
	
	dfd.resolve();
	
	return dfd.promise();
};

APP.getWarehouseList = function(){
	
	var dfd = new jQuery.Deferred();	
	
	jQuery.getJSON( CONFIG.getServerEndpoint() + "/service/LogIn/storeAndWarehouse?json={'merchantKey':" + CONFIG.getClientId() + ",'terminalKey':0}", function( data ){
		
		if( data.error )
		{
			dfd.reject( data.error );
		}
		else
		{
			dfd.resolve( data );
		}		
		
	}).fail(function() {
		
		dfd.reject("Failed to connect to server");
	});
	
	return dfd.promise();
	
};

document.addEventListener("exitButton",function(){ 

    navigator.notification.confirm(
           'Do you want to quit', 
           onConfirmQuit, 
           'QUIT TITLE', 
           'OK,Cancel'  
    );

}, true);

function onConfirmQuit(button){
   if(button == "1"){
     navigator.app.exitApp(); 
   }
}

APP.writeToFile = function(fileName, data, isAppend) {

	var dfd = new jQuery.Deferred();

	var errorHandler = function (fileName, e) {  
		var msg = '';
	
		switch (e.code) {
				case FileError.QUOTA_EXCEEDED_ERR:
						msg = 'Storage quota exceeded';
						break;
				case FileError.NOT_FOUND_ERR:
						msg = 'File not found';
						break;
				case FileError.SECURITY_ERR:
						msg = 'Security error';
						break;
				case FileError.INVALID_MODIFICATION_ERR:
						msg = 'Invalid modification';
						break;
				case FileError.INVALID_STATE_ERR:
						msg = 'Invalid state';
						break;
				default:
						msg = 'Unknown error';
						break;
		};
	
		console.log('Error (' + fileName + '): ' + msg);

		dfd.reject('Error (' + fileName + '): ' + msg);
	};
		
	window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (directoryEntry) {
			directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
					fileEntry.createWriter(function (fileWriter) {
							fileWriter.onwriteend = function (e) {
									// for real-world usage, you might consider passing a success callback
									console.log( 'File ' + fileName + ' saved.' );
									dfd.resolve( 'File ' + fileName + ' saved.' );
							};

							fileWriter.onerror = function (e) {
									// you could hook this up with our global error handler, or pass in an error callback
									console.log('Failed to save file: ' + e.toString());
									dfd.reject('Failed to save file: ' + e.toString());
							};

							if (isAppend) {
									try {
											fileWriter.seek(fileWriter.length);
									}
									catch (e) {
											console.log('Failed to save file: ' + e.toString());
											dfd.reject('Failed to save file: ' + e.toString());
									}
							}

							var blob = new Blob([data], { type: 'text/plain' });
							fileWriter.write(blob);

					}, errorHandler.bind(null, fileName));
			}, errorHandler.bind(null, fileName));
	}, errorHandler.bind(null, fileName));	

	return dfd.promise();

};

//dummy for webbrowser
if(!navigator.notification){
	navigator.notification = {
		beep : function(){
			console.log("Beeeeeeep ...");
		}
	};
}
	

