angular.module('app').controller("PriceChangeReportController", function($scope, $modal, $window)
{
	var ctrl = this;
	
	ctrl.print = function(){
		
		var configuration = PrinterManager.getPrinterConfiguration();
	    var LINE_WIDTH = configuration.LINE_WIDTH;
	    var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);
	    
	    var printFormat = [
		            ['FEED'],
		            ['CENTER'],
		            ['N',LINE_SEPARATOR],
		            ['H3', 'Price Changes'],
		           	['N', LINE_SEPARATOR],
		          	['B', JSReceiptUtils.format(I18n.t('Name'), LINE_WIDTH - 16) + JSReceiptUtils.format(I18n.t('Old'), 8, true) + JSReceiptUtils.format(I18n.t('New'), 8, true)],
		          	['N', LINE_SEPARATOR]
			];
	    
	    var text = null;
	    var record = null;
	    
	    var records = this.data;
	    
	    for(var i=0; i<records.length; i++ )
	    {
	    	record = records[i];
	    	
	    	text = record.description || record.name;
	    	
	    	while (text.length > (LINE_WIDTH - 16)) {
	            printFormat.push(['N', JSReceiptUtils.format(text, LINE_WIDTH)]);
	            text = text.substr(LINE_WIDTH);
	        }

	        var s = (JSReceiptUtils.format(text, LINE_WIDTH - 16) + JSReceiptUtils.format(Number(record.old_price).toFixed(2), 8, true) + JSReceiptUtils.format(Number(record.new_price).toFixed(2), 8, true));

	        printFormat.push(['N', s]);
	    }
	    
	    printFormat.push(['FEED']);
	    printFormat.push(['PAPER_CUT']);
	    
	    PrinterManager.print(printFormat);
	};
	
	jQuery.get('/json/PRODUCT_UPDATED',
	{
		json:
		{}
	}, function(json, textStatus, jqXHR)
	{
		ctrl.data = json;
		
		jQuery('#price_change_history_table').DataTable({

			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,
			
			"language": {
			      "emptyTable": "There are no changes."
			    },

			data : json,
						
			"columns": [
				{
					"data": "date_updated"
				},
				{
					"data": "name"
				},
				{
					"data": "description"
				},
				{
					"data": "upc"
				},
				{
					"data": "sku"
				},
				{
					"data": "old_price"
				},
				{
					"data": "new_price"
				}
			],
			
			"columnDefs": [
			    {
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
					
			    },
			    
			   
			    
			    {
					"render": function(data, type, row) {
						return new Number(data).toFixed(2) ;
					},
					"targets": [5,6]					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.price.change.data"));
	});
		
});