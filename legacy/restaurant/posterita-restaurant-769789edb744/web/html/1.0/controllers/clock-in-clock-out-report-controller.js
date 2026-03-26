angular.module('app').controller("ClockInClockOutReportController", function($scope, $modal)
{
	var ctrl = this;
	jQuery.get('/json/CLOCK_IN_OUT',
	{
		json:{}
	}, function(json, textStatus, jqXHR)	
	{
		
		var terminal = null;		
		var records = [];
		var user = null;
		
		for(var i=0; i<json.length; i++){
			
			terminal = APP.TERMINAL.getTerminalById(json[i]['terminal_id']);
			user = APP.USER.getUserById(json[i]['user_id']);
			
			if(terminal == null) continue;
			
			json[i]['terminal'] = terminal['u_posterminal_name'];			
			json[i]['user'] = user != null ? user.name || '?' : '?';
			
			records.push( json[i]);
						
		}
		
		jQuery('#clock_in_out_history_table').DataTable({

			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 15,

			data : records,
			
			"columns": [
				{
					"data": "time_in"
				},
				{
					"data": "time_out"
				},
				{
					"data": "user"
				},
				{
					"data": "terminal"
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
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.clock.in.out.data"));
	});
});