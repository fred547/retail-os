angular.module('app').controller("TakeAwayHistoryController", function($scope, $modal, $window, $state, $http, OrderService)
{
	
	$window.$$viewOrder = function( uuid ){
		
		$scope.showModal();
		
		$http.get('/json/orders/' + uuid).then( function( response ){
			
			var order = response.data;
			
			$state.go('view-order', {
				'order' : order
			});
			
			$scope.closeModal();
			
		}, function(){
			
			$scope.closeModal();
			
			$scope.alert("Failed to load order!");
			
		});
		
	
	};
	
	var post = {};
	post['action'] = 'get-take-aways';
	post = JSON.stringify(post);
	
	var url = "/restaurant?json=" + post;
	
	var ctrl = this;
	jQuery.get(url,
	{
		json:{}
	}, function(json, textStatus, jqXHR)
	{
		
		var terminal = null;
		
		var records = json;
		
		var commandInfo;
		for(var i=0; i<records.length; i++){
			commandInfo = records[i].commandInfo;
			records[i].customerInfo = "" + (commandInfo.customer || '') + " / " + (commandInfo.phone || '');
		}
		
		jQuery('#take_away_history_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			data : records,
			
			"columns": [
				{
					"data": "dateOrdered"
				},
				{
					"data": "commandInfo.takeAwayId"					
				},
				{
					"data": "customerInfo"					
				},
				{
					"data": "documentNo"
				},
				{
					"data": "docStatusName"
				},
				{
					"data": "tenderType"
				},
				{
					"data": "grandTotal"
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
						return data ;
					},
					
					"orderData": [ 0, 1 ],
					
					"targets": 1
					
			    },
			    
			    {
					"render": function(data, type, row) {
						var uuid = row["uuid"];
						
						return "<a href='javascript:void(0);' onclick='$$viewOrder(\"" + uuid + "\")'>" + data + "</a>";
					},
					"targets": 3
					
			    },
			    
			 ]
		});
		
	}, "json").fail(function()
	{
		$scope.alert(I18n.t("failed.to.query.take.aways.data"));
	});
	
	
});