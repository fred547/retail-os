var POSTERITA_DEBUGGER = {

	status : 'Disconnected',
	terminal : null,
	
	connect : function(callback){
		
		jQuery.getJSON('/system/?json={"action":"systemInfo"}').done(function( json ) {
			
			var terminalKey = json["terminal-key"];
			var serverAddress = json["server-address"];
			var domain = json["domain"];
			
			POSTERITA_DEBUGGER.identifier = domain + ":" + terminalKey;
			
			var url = "ws" + serverAddress.substr(4) + "/websocket/offline-debugger?channel=" + POSTERITA_DEBUGGER.identifier;
			
			POSTERITA_DEBUGGER._connect(url, callback);
			
			
		}).fail(function( jqxhr, textStatus, error ) {
			
		    var err = textStatus + ", " + error;
		    
		    callback(err);
		    
		});
	},
	
	_emailLogs : function(callback){
		
		jQuery.getJSON('/system/?json={"action":"sendErrorLog"}').done(function( json ) {
			
			callback(json);
			
			
		}).fail(function( jqxhr, textStatus, error ) {
			
		    var err = textStatus + ", " + error;
		    
		    callback({"error" : err});
		    
		});
	},
	
	_emailDB : function(callback){
		
		jQuery.getJSON('/system/?json={"action":"sendDB"}').done(function( json ) {
			
			callback(json);
			
			
		}).fail(function( jqxhr, textStatus, error ) {
			
		    var err = textStatus + ", " + error;
		    
		    callback({"error" : err});
		    
		});
	},
	
    _connect : function(url, callback){
    	
    	/* /system/?json={"action":"systemInfo"} */
    	
    	var piesocket = new WebSocket(url);  

        var ref = this;
        
        piesocket.onopen = function() {
        	
        	ref.status = "Connected. ID:" + POSTERITA_DEBUGGER.identifier;
        	
            console.log('Websocket connected');
            
            callback(ref.status);            
            
        };

        piesocket.onmessage = this.onmessage.bind(this);
        
        piesocket.onerror = function(event) {
        	console.error(event);
        };

        this.socket = piesocket;

    },

    onmessage : function(message){

        var piesocket = this.socket;        
        
        if(message.data.charAt(0) != '{') return;
        
        var payload = JSON.parse(message.data);

                
        var ref = this;
        
        if (payload.event == "ping") {
        	piesocket.send(JSON.stringify({
                event: 'ping',
                sender: ref.identifier,
                data: 'pong'
            }));
        	
        	return;
        }
        
        if(payload.event == "action"){
        	
        	if (payload.action == "email-logs") {
            	
        		POSTERITA_DEBUGGER._emailLogs(function(data){
            		
            		piesocket.send(JSON.stringify({
                        event: 'email-logs',
                        data: data
                    }));
            		
            	});  
            	
            	return;
            	
            }
        	
        	if (payload.action == "email-db") {
            	
        		POSTERITA_DEBUGGER._emailDB(function(data){
            		
            		piesocket.send(JSON.stringify({
                        event: 'email-db',
                        data: data
                    }));
            		
            	});  
            	
            	return;
            	
            }
        	
        	if (payload.action == "disconnect-client") {
            	
        		piesocket.send(JSON.stringify({
                    event: 'disconnect-client',
                    data: {"status" : "disconnecting ..."}
                }));
        		
        		setTimeout(function(){
        			
        			POSTERITA_DEBUGGER.disconnect(console.log);
					
				}, 2 * 1000);
            	
            	return;
            	
            }
        }

        if (payload.event == "sql") {
        	
        	var query = payload.query;

        	jQuery.getJSON("/sql?q=" + query).done(function( json ) {
    			
        		piesocket.send(JSON.stringify({
                    event: 'sql',
                    sender: ref.identifier,
                    data: json,
                    query: query
                }));
    		    
    		}).fail(function( jqxhr, textStatus, error ) {
    			
    		    var err = textStatus + ", " + error;
    		    
    		    piesocket.send(JSON.stringify({
                    event: 'sql',
                    sender: ref.identifier,
                    data: err,
                    query: query
                }));
    		    
    		});
            
            return;
        }
        
        if (payload.event == "saveOrder") {
        	
        	var order = payload.order;
        	
        	console.log("Saving order ..")
        	
        	APP.ORDER.saveOrder(order).done(function(order, msg){
        		console.log(msg);
        		
        		piesocket.send(JSON.stringify({
                    event: 'saveOrder',
                    sender: ref.identifier,
                    data: msg
                }));
        		
        	}).fail(function(msg){        		
        		console.log(msg);
        		
        		piesocket.send(JSON.stringify({
                    event: 'saveOrder',
                    sender: ref.identifier,
                    data: msg
                }));
        		
        	});
        	
        }

    },

    disconnect : function(callback){
    	this.status = 'Disconnected';
        this.socket.close();
        callback(this.status);
    }
};