angular.module('app').controller("ExchangeOrderController", function($scope, $modal, $location, $state, $window, ProductService, OrderService){
		
	var ctrl = this;
	ctrl.customers = APP.BP.searchBPartners({});
	ctrl.stores = APP.STORE.searchStores({});
	
	$scope.params = {				
		dateFrom : "",
		dateTo : "",
		customerId : "",
		salesRepId : "",
		paymentRule : "",
		docStatus: "",
		date1: null,
		date2: null,
		adOrgId : "",
		barcode : ""
	};
	
	$scope.getParameter = function(name){
		
		return $scope.params[name];
		
	};

	$scope.renderReport = function(){
		
		$scope.report = jQuery('#order_table').DataTable({
			
		    "sPaginationType": "full_numbers",
		    "searching": false,
		    "ordering": false,
		    "lengthChange": false,
		    "pageLength": 15,
		    "data": [],
		    
		    "columns": 
		    [
		      	{
		            "data": "dateordered"
		        },
		        {
		            "data": "ad_org_name"
		        },
		        {
		            "data": "documentno"
		        },
		        {
		            "data": "c_bpartner_name"
		        },
		        {
		            "data": "paymentrule"
		        },
		        {
		            "data": "grandtotal"
		        },
		        {
		            "data": "nooflines"
		        }
		    ],
		    
		    "columnDefs": 
		    [
		      	{
		            "render": function(data, type, row) {
		                return moment(data).format("DD-MMM-YYYY, HH:mm");
		            },
		            "targets": 0
		        },

		        {
		            "render": function(data, type, row) {

		                var ad_org_id = row["ad_org_id"];
		                var documentno = row["documentno"];

		                var html = "<a href='javascript:void(0);' onclick='invokeOrder$$(" + ad_org_id + ",\"" + documentno + "\")'>" + data + "</a>";
		                
		                return html;

		            },
		            "targets": 2
		        },
		        
		        {
		            "render": function(data, type, row) {
		            	
		            	return {
							'B': 'Cash',
							'K': 'Card',
							'S': 'Cheque',
							'P': 'On Credit',
							'M': 'Mixed',
							'V': 'Voucher',
							'E': 'Ext Card',
							'G': 'Gift Card',
							'L': 'Loyalty'
						}[data];
		            },
		            "targets": 4
		        },
		        
		        {
		            "render": function(data, type, row) {
		                return new Number(data).toFixed(2);
		            },
		            "targets": 5
		        },
		    ]
		});
		
		$scope.showSearchDialog();
		
		//attach invokeOrder method to window		
		$window.invokeOrder$$ = function( ad_org_id, documentno ){
			
			$scope.showModal();
			
			//search online
			var post = {};
        	post["ad_org_id"] = ad_org_id;
        	post["documentno"] = documentno;
        	
        	post = JSON.stringify(post);
        	
        	OnlineOrderService.invokeOrder(post).done(function(order){
        		
        		order.isOnline = true; // mark as online order
        		
        		$state.go('view-order', {
    				'order' : order
    			});
        		
        		
        	}).fail(function(msg){
        		
        		$scope.alert(msg);
        		
        	}).always(function(){
        		
        		$scope.closeModal();
        		
        	});
		};
		
	};
	

	$scope.reloadReport = function(params){
		
		
		//search online
		var post = {};
    	post["ad_org_id"] = params["adOrgId"] || 0;
    	post["m_product_id"] = params["m_product_id"] || 0;
    	post["c_bpartner_id"] = params["customerId"] || 0;
    	post["dateFrom"] = params["dateFrom"];
    	post["dateTo"] = params["dateTo"];
    	    	
    	post = JSON.stringify(post);
    	
    	$scope.showModal();
    	
    	OnlineOrderService.searchOrder(post).done(function(response){
    		
    		var table = $scope.report;
    		
    		table.clear(); //clear rows
    		
    		var orders = response.orders;
    		for(var i=0; i<orders.length; i++){
    			
    			table.row.add(orders[i]);
    		}
    		
    		table.draw();
    		
    		if(orders.length == 0){
    			$scope.alert("No order was found!");
    		}
    		
    	}).fail(function(msg){
    		
    		$scope.alert(msg);
    		
    	}).always(function(){
    		
    		$scope.closeModal();
    		
    	});	
    		
		
		
		//$scope.report.ajax.reload();
	};
	
	
	$scope.showSearchDialog = function(){
		
		$modal.open(
		{
			templateUrl: '/html/popups/search-exchange-order.html',
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
							documentNo : "",
							customerId : "",
							salesRepId : "",
							paymentRule : "",
							docStatus: "",
							date1: null,
							date2: null,
							adOrgId : "",
							barcode : ""
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
					
					if($scope.params.customer != null){
						$scope.params.customerId = $scope.params.customer.id;
					}
					
					if($scope.params.product != null){
						$scope.params.productId = $scope.params.product.id;
					}
					
					if($scope.params.store != null){
						$scope.params.adOrgId = $scope.params.store.id;
					}
					
					
					//validate dates
			    	if($scope.params.dateFrom.length == 0 && $scope.params.dateTo.length == 0){
			    		$scope.alert("Date is required");
						return;
			    	}
			    	
			    	//validate product
			    	var barcode = $scope.params["barcode"];
					var m_product_id = 0;
					
					if(barcode.length > 0){
						
						var products = ProductService.search(barcode, 1);
						
						if( products.length == 0 || products[0].upc != barcode ){
							
							$scope.alert("Product for barcode[" + barcode + "] does not exists");
							return;
						}
						
						$scope.params["m_product_id"] = products[0].m_product_id;
					}
					
					$scope.reloadReport($scope.params);
					
					$modalInstance.close();
				};
			}
		});
		
	};
		
	$scope.renderReport();

});