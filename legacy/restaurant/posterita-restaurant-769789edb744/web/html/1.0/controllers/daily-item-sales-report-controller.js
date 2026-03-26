angular.module('app').controller("DailyItemSalesReportController", function($scope, $modal, $window)
{
	var ctrl = this;
	
	jQuery.get('/report/?name=DailyItemSalesReport&format=json',
	{
		json:
		{}
	}, function(json, textStatus, jqXHR)
	{
		ctrl.data = json;
		
		jQuery('#daily_item_sales_report_table').DataTable({

			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 15,
			
			"language": {
			      "emptyTable": "There are no changes."
			    },

			data : json,
						
			"columns": [
				{
					"data": "barcode"
				},
				{
					"data": "item"
				},
				{
					"data": "description"
				},
				{
					"data": "qty"
				},
				{
					"data": "primarygroup"
				},
				{
					"data": "group1"
				},
				{
					"data": "group2"
				},
				{
					"data": "group3"
				},
				{
					"data": "group4"
				},
				{
					"data": "group5"
				},
				{
					"data": "group6"
				},
				{
					"data": "group7"
				},
				{
					"data": "group8"
				}
			],
			
			"columnDefs": []
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.daily.item.sales"));
	});
		
});