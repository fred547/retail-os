angular.module('app').controller("RestaurantLogsController", function($scope, $modal)
{
	
	var ctrl = this;
	jQuery.get('/json/RESTAURANT_LOG',
	{
		json:{}
	}, function(json, textStatus, jqXHR)
	{
		
		var terminal = null;
		
		var records = json;
		
		jQuery('#restaurant_log_table').DataTable({
			
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
					"data": "action"
				},
				{
					"data": "description"
				},
				{
					"data": "user_id"
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
						return APP.USER.getUserById(data).name ;
					},
					"targets": 3
					
			    }
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.restaurant.log.data"));
	});
	
	
}); //RestaurantLogController


//ItemsOrderedLogsController