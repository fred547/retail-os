angular.module('app').controller("ItemsOrderedLogsController", function($scope, $modal, $window, $state, $http)
{	
	var ctrl = this;
	
	$scope.params = {				
		dateFrom : "",
		dateTo : "",
		date1: new Date(),
		date2: new Date()
	};
	
	$scope.params.dateFrom = moment().format('YYYY-MM-DD');
	$scope.params.dateTo = moment().format('YYYY-MM-DD');
	
	$scope.getParameter = function(name){		
		return $scope.params[name];		
	};
	
	$scope.renderReport = function(){
		
		$scope.report = jQuery('#items_ordered_log_table').DataTable({
			
			dom: 'Bfrtip',
			buttons: [{
	                extend: 'excelHtml5',
	                exportOptions: {
	                    columns: ':visible'
	                }
	            }],
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": true,
			"lengthChange": false,
			"pageLength": 12,
			 "scrollX": true,
			
			"language": {
		      "emptyTable": "There are no data."
		    },
			    
			"fnServerParams": function(aoData) {
				
				aoData.push({
					"name": "name",
					"value": "ItemsOrderedReport"
				}); //report name
				
				aoData.push({
					"name": "format",
					"value": "json"
				}); //report format
				
				
				aoData.push({
					"name": "dateFrom",
					"value": $scope.getParameter("dateFrom")
				}); //date from
				aoData.push({
					"name": "dateTo",
					"value": $scope.getParameter("dateTo")
				}); //date to				
			},

			"sAjaxSource": "/report",

			"fnPreDrawCallback": function() {},
			"columns": [
				{
					"data": "dateOrdered"
				},
				{
					"data": "cashier"
				},
				{
					"data": "documentNo"
				},
				{
					"data": "docAction"
				},
				{
					"data": "bpName"
				},
				{
					"data": "commandInfo"
				},
				{
					"data": "waiter"
				},				
				{
					"data": "qty"
				},
				{
					"data": "product"
				},
				{
					"data": "price"
				},
				{
					"data": "discount"
				}
		   		  ],
			"columnDefs": [
				{
					"render": function(data, type, row) {
						return moment(parseInt(data)).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
				},
				
				{
					"render": function(data, type, row) {
						var uuid = row["uuid"];						
						return "<a href='javascript:void(0);' onclick='$$viewOrder(\"" + uuid + "\")'>" + data + "</a>";
					},
					"targets": 2
				},

				{
					"render": function(data, type, row) {
						
						var order = row;
						var info = order['commandInfo'];
						
						if(info){
							
							if(info['type'] == 'D'){
								return "Table #" + info['tableId'];
							}
							else
							{
								return "Take-Away #" + info['takeAwayId'];
							}
							
						}
						else
						{
							if (data == "POS Order") {
								return "Sales";
							} else {
								return "Return";
							}
						}						

					},
					"targets": 5
					},

				{
					"render": function(data, type, row) {

						var id = parseInt(data);
						var user = APP.USER.getUserById(id);						
						return user != null ? user.name : data;

					},
					"targets": [1,6]
					},

				{
					"render": function(data, type, row) {
						return {
							'CO': 'Completed',
							'DR': 'Drafted',
							'VO': 'Voided'
						}[data];
					},
					"targets": 3
					}
		   		  ]
		});		
		
	};
	
	$scope.reloadReport = function(params){
		$scope.params = params;
		$scope.report.ajax.reload();
	};
	
	$scope.showSearchDialog = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/search-by-date.html',
			//size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			resolve:{},
			controller: function($scope, $timeout, $modalInstance)
			{
				var ctrl = this;
				
				ctrl.opened1 = false;
				ctrl.open1 = function(e) {
				    e.stopPropagation ();
				    this.opened1 = true;
				}
				
				ctrl.opened2 = false;
				ctrl.open2 = function(e) {
				    e.stopPropagation ();
				    this.opened2 = true;
				}
				
				ctrl.reset = function(){
					
					$scope.params = {				
							dateFrom : "",
							dateTo : "",
							date1: null,
							date2: null
						};
				};
				
				ctrl.search = function(){
					
					if($scope.params.date1 != null){
						
						$scope.params.dateFrom = moment($scope.params.date1).format("YYYY-MM-DD");
						$scope.params.date1 = $scope.params.dateFrom;
						
					}
					else
					{
						$scope.params.dateFrom = "";
					}
					
					if($scope.params.date2 != null){
						
						$scope.params.dateTo = moment($scope.params.date2).format("YYYY-MM-DD");
						$scope.params.date2 = $scope.params.dateTo;
					}
					else
					{
						$scope.params.dateTo = "";
					}			
					
					$scope.reloadReport($scope.params);
					
					$modalInstance.close();
				};
			}
		});
		
	};
	
	$window.$$viewOrder = function( uuid ){
		
		$scope.showModal();
		
		$http.get('/json/orders/' + uuid).then( function( response ){
			
			var order = response.data;
			
			/*
			OrderService.setOrder(order);
			$location.path("/view-order");
			*/
			$state.go('view-order', {
				'order' : order
			});
			
			$scope.closeModal();
			
		}, function(){
			
			$scope.closeModal();
			
			$scope.alert("Failed to load order!");
			
		});
		
	};
	
	$scope.renderReport();
	
	
}); //ItemsOrderedLogsController

//KitchenOrderLogsController