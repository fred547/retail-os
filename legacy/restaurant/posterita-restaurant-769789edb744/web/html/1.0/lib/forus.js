window.location.hash = "";


if (typeof process !== 'undefined' && 
	     typeof process.versions !== 'undefined' &&
	     'node-webkit' in process.versions) {
	        moment = global.moment;
}

//error handling
window.addEventListener('error', function (event) {
	var errorData = {
			"message" : event.message, 
			"source" : event.filename, 
			"lineno" : event.lineno, 
			"colno" : event.colno, 
			"error" : event.error
	};

	alert(JSON.stringify(errorData));
});

//flags for pole display
var WATCH_CART_FLAG = false; 
var CAN_CLEAR_TOTAL = true;

var formatPoleDisplayLine = function(label, value){
	return label + JSReceiptUtils.format(value, (20 - label.length), true);
};

var exportReport = function(report){
	
	if(window.PosteritaBrowser){
		
		window.PosteritaBrowser.exportReport( report );
		
	}
	else
	{
		var url = "/report/?name=" + report + "&format=csv";
		window.location.href = url;
	}	
	
};


var exportInventoryAvailableReport = function(){						
	
	if(window.PosteritaBrowser){
		
		window.PosteritaBrowser.downloadInventoryAvailableReport();
	}
	else
	{
		var url = "/stock?action=inventoryAvailableReport";
		window.location.href = url;
	}						
	
};

var exportPDF = function( id ){						
	
	if(window.PosteritaBrowser){
		
		window.PosteritaBrowser.exportPDF( id );
	}
	else
	{
		var url = "/order?action=exportPDF&id=" + id;
		window.location.href = url;
	}						
	
};

var DateUtils = {
		/** return date string YYYY-MM-DD HH:mm:ss */
		getCurrentDate : function(date){
			
			var d = date || new Date();
			
			var year = d.getFullYear();
	        var month = d.getMonth() + 1;
	        var day = d.getDate();
	        var hour = d.getHours();
	        var minute = d.getMinutes();
	        var second = d.getSeconds();
	        
	        if (month < 10) {
	        	month = "0" + month
	        }
	        if (day < 10) {
	        	day = "0" + day
	        }
	        if (hour < 10) {
	        	hour = "0" + hour
	        }
	        if (minute < 10) {
	        	minute = "0" + minute
	        }
	        if (second < 10) {
	        	second = "0" + second
	        }
	        
	        return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
		}
};

/* used in purchase controller */
var StringUtils = {		
		isEmpty : function( str ){
			return str == null || str.length == 0;
		}
};