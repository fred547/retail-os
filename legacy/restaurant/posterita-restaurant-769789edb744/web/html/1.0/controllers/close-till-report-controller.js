angular.module('app').controller("CloseTillReportController", function($scope, $modal)
{
	
	var ctrl = this;
	jQuery.get('/json/CLOSE_TILL',
	{
		json:{}
	}, function(json, textStatus, jqXHR)
	{
		
		var terminal = null;
		
		var records = [];
		
		for(var i=0; i<json.length; i++){
			
			terminal = APP.TERMINAL.getTerminalById(json[i]['terminal_id']);
			
			if(terminal == null) continue;
			
			json[i]['terminal'] = terminal['u_posterminal_name'];
			
			records.push( json[i]);
			
		}
		
		jQuery('#close_till_history_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 15,

			data : records,
			
			"columns": [
				{
					"data": "time_open"
				},
				{
					"data": "time_close"
				},
				{
					"data": "terminal"
				},
				{
					"data": "closing_amt"
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
						return data ? moment(data).format("DD-MMM-YYYY, HH:mm") : data ;
					},
					"targets": 1
					
			    },
			    
			    {
					"render": function(data, type, row) {
						return new Number(data).toFixed(2) ;
					},
					"targets": 3
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.close.till.data"));
	});
	
	
});