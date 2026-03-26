angular.module('app').controller("PrinterLogsController", function($scope, $modal, $window)
{	
	var ctrl = this;
	
	var cache = null;
	
	$window.$$reprintKitchenReceipt = function(uuid){
		
		var record = cache({'uuid': uuid}).first();
		
		var header = [["FEED"],["CENTER"],["FEED"],["H1","## RE-PRINT ##"]];
		
		var printFormat = JSON.parse(record.raw_receipt);
		
		header = header.concat(printFormat);
		
		var configuration = PrinterManager.getPrinterConfiguration();
		var printers = configuration['KITCHEN_PRINTERS'];
		
		var printer;
		var printer_ip;
		var printer_name;
		var printer_lines;
		
		for(var p=0; p<printers.length; p++)
		{
			printer = printers[p];
			printer_ip = printer['ip'];
			printer_name = printer['name'];
			
			if(record.printer_name == printer_name){
				
				HTTP_Printer.print( printer_ip, POSTERITA_Printer.format(header) ).done(function(msg){
					
					APP.RESTAURANT.updatePrinterLog({
						'uuid' : uuid
					});
					
				}).fail(function(error){
					
					alert(error);
					
				}).always(function(){
				});				
			}
			
		}
		
	};
	
	jQuery.get('/json/PRINTER_LOG',
	{
		json:{}
	}, function(json, textStatus, jqXHR)
	{
		
		var terminal = null;
		
		var records = json;
		
		cache = TAFFY(json);
		
		jQuery('#printer_log_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			data : records,
			
			"columns": [
				{
					"data": "date_logged"
				},
				{
					"data": "order_type"
				},
				{
					"data": "printer_name"
				},
				{
					"data": "receipt"
				},
				{
					"data": "printed"
				}
			],
			
			"createdRow": function ( row, data, index ){
				
				if(data.printed == 'N'){
					jQuery('td', row).css({"background-color":"#e84f64"});
				}
				
			},
			
			"columnDefs": [
			    {
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return data == 'D' ? "Dine-In" : "Take-Away" ;
					},
					"targets": 1
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return "<pre>" + data + "</pre>" ;
					},
					"targets": 3
					
			    },
			    
			    {
					"render": function(data, type, row) {
						
						if(data == "N"){
							
							return "<button type=\"button\" onclick=\"$$reprintKitchenReceipt('" + row['uuid'] + "')\">Reprint</button>";
							
						}
						else
						{
							return "Printed";
						}
					},
					"targets": 4
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert("Failed to query printer logs");
	});
	
	
}); //PrinterLogsController


//TakeAwayHistoryController