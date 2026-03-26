angular.module('app').controller("StockTransferController", function( $scope, $routeParams, $modal, ProductService, LoginService, ShoppingCartService ){
	
	var ctrl = this;
	
	var transferType = $routeParams.transferType;
	
	$scope.currentBoxNumber = null;
	
	if( transferType == 'stock-transfer-request'){
			
		$scope.transferType = 'stock-transfer-request'; 
		$scope.title = "Request Stock";
	}
	else
	{
		$scope.transferType = 'stock-transfer-send'; 
		$scope.title = "Send Stock";
	}
	
	$scope.boxNo = function(){
		
		$scope.input("Box/Bag Number", "Enter box/bag number", function(box){
			
			$scope.shoppingCart.setCurrentBoxNumber(box);
			$scope.currentBoxNumber = box;
			
		}, true);
		
		/*
		var box = window.prompt("Enter box/bag number");
		if(box){
			$scope.shoppingCart.setCurrentBoxNumber(box);
			$scope.currentBoxNumber = box;
		}
		*/
		
	};
		
	$scope.productSearchTerm = "";
	$scope.productSearchSelectedId = -1; /*cue for active product clicked by user*/
	
	$scope.comments = "";
	// Comment
	$scope.comment = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/comment.html',
			// size: 'lg',
			scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				this.comments = ctrl.comments || '';
				this.addComment = function(comments)
				{
					ctrl.comments = comments || '';
					$modalInstance.close();
				};
			}
		});
	}; // comment
		
	$scope.isCommentPresent = function()
	{
		return (ctrl.comments != null && ctrl.comments.length > 0);
	};
	
	$scope.filterProduct = function(query)
	{
		var results = APP.PRODUCT.searchProducts(query, 20);
		// no match
		if (results.length == 0)
		{
			$scope.alert("No Product found!!!");
			return;
		}
		$scope.productSearchList = results;
		$scope.productSearchTerm = "";
		$scope.productSearchSelectedId = -1;
	};
	
	$scope.searchProduct = function(searchTerm)
	{
		var results = ProductService.search(searchTerm, 20);
		// no match
		if (results.length == 0)
		{
			$scope.alert("No Product found!!!");
			return;
		}
		if (results.length == 1)
		{
			// check barcode
			if (results[0].upc == searchTerm)
			{
				this.addToCart(results[0]);
			}
		}
		$scope.productSearchList = results;
		$scope.productSearchTerm = "";
	};
	
		
	$scope.productSearchList = [];
	
	$scope.shoppingCart = ShoppingCartService.getShoppingCart( $scope.transferType );
	$scope.currentBoxNumber = $scope.shoppingCart.currentBoxNumber;
	
	$scope.addToCart = function(product)
	{
		$scope.productSearchSelectedId = product['m_product_id']; /* update cue */
		
		var product_id = product['m_product_id'];
		$scope.shoppingCart.addToCart(product_id, 1);
	}
	
	$scope.reset = function(){
		$scope.shoppingCart.clearCart();
		$scope.currentBoxNumber = null;
	};
	
	$scope.transfer = function(){
		
		var warehouse_id = $scope.warehouse_id;
		
		if( warehouse_id == 0 ){
			
			$scope.alert("Please select a warehouse!");
			return;
		}
		
		var params = {};
		params['ad_user_id'] = LoginService.user.ad_user_id;
		params['transfer_type'] = $scope.transferType;
		params['m_warehouse_id'] = warehouse_id;
		params['date'] = moment().format("YYYY-MM-DD HH:mm:ss");
		
		var lines = [];
		var shoppingCart = $scope.shoppingCart;
		
		shoppingCart.lines.each(function(key, value){ 
			
			var line = value;
			var qty = line.qty;
			var product_id = line.product.id;
			var name = line.product.name;
			var description = line.description;
			var boxNo = line.boxNo;
			
			lines.push({
				'qty' : qty.toFixed(2),
				'm_product_id' : product_id,
				'name' : name,
				'description' : description,
				'boxNo' : boxNo
			});
		});
		
		params['lines'] = lines;
		
		/*add comments*/
		params['comments'] = ctrl.comments;
		
		var postData = JSON.stringify( params );
		
		$scope.showModal();
		
		StockService.transfer( postData ).done(function( json ){
			
			shoppingCart.clearCart();
			
			var document_no = json['document_no'];
			var m_movement_id = json['m_movement_id'];
			
			$scope.info( I18n.t('Document #{0} was successfully created.', document_no) );			
			
			printTransferReceipt( params, json );
			
			//P4-275 double print receipt
			printTransferReceipt( params, json );
			
			printTransferReceipt( params, json );
			
		}).fail(function( error ){
			//error message
			$scope.alert( error );
			
		}).always(function(){
			
			$scope.closeModal();
		});
		
	};
	
	var store = LoginService.store;	
	$scope.warehouseList = APP.WAREHOUSE.cache({'ad_org_id':{"!=": store['id'] }}).order('name').get();
	
	$scope.warehouse_id = 0;	
});

function printTransferReceipt( request, response ){
	 
	 var title = null;
	 
	 var warehouse = APP.WAREHOUSE.getWarehouseById( request.m_warehouse_id );
	 var store = APP.STORE.getStoreById( warehouse.ad_org_id );
	 var user = APP.USER.getUserById( request.ad_user_id );
	 
	 if( request.transfer_type == 'stock-transfer-send' )
	 {
		 
		 title = I18n.t("Send Stock");
	 } 
	 else
	 {
		 
		 title = I18n.t("Request Stock");
	 }
	 
	 var from_warehouse_name = response['from_warehouse_name'];
	 var to_warehouse_name = response['to_warehouse_name']; 

	 var LINE_WIDTH = PrinterManager.getLineWidth();
	 var LINE_SEPARATOR = JSReceiptUtils.replicate('-',LINE_WIDTH);

	 var headers = [
				/* client & org info */
				['CENTER'],
				['N',LINE_SEPARATOR],
				['H1', title],
				['N',LINE_SEPARATOR],
				['B', from_warehouse_name, I18n.t('From') + ': '],
				['B', to_warehouse_name, I18n.t('To') + ': '],
				['N',LINE_SEPARATOR]
	   ]; 

  		var document_no = response['document_no'];
  		var transfer_date = request.date;
  		var sales_rep_name = user.name;
  		var doc_status = response['document_status'];
  		
  		var statusNames = {'CO':'Completed', 'DR':'Drafted', 'VO' : 'Voided', 'IP' : 'In Progress'};
  		
  		var doc_status_name = I18n.t(statusNames[ doc_status ]);
  		
  		var line = JSReceiptUtils.format(I18n.t('Doc No') + ': ',  LINE_WIDTH - 20 ) + JSReceiptUtils.format( document_no, 20 );
	  	headers.push(['N',line]);
	  	
	  	var line = JSReceiptUtils.format(I18n.t('Date') + ': ',  LINE_WIDTH - 20 ) + JSReceiptUtils.format( transfer_date, 20 );
	  	headers.push(['N',line]);
	  	
	  	var line = JSReceiptUtils.format(I18n.t('Sales Rep') + ': ',  LINE_WIDTH - 20 ) + JSReceiptUtils.format( sales_rep_name, 20 );
	  	headers.push(['N',line]);
	  	
	  	var line = JSReceiptUtils.format(I18n.t('Status') + ': ',  LINE_WIDTH - 20 ) + JSReceiptUtils.format( doc_status_name, 20 );
	  	headers.push(['N',line]);
  		

  		
  		headers.push(['N',LINE_SEPARATOR]);
  		
  		var headerLine = JSReceiptUtils.format( I18n.t("Product"), LINE_WIDTH-10 ) + JSReceiptUtils.format( I18n.t("Qty"), 10, true );

  		headers.push(['B', headerLine]);
  		headers.push(['N',LINE_SEPARATOR]);
  		
  		var lines = request['lines'];
  		var total_qty = 0;
  		
  		var currentBox = "";
  		var box;
  		var showTotalNoOfBox = false;
  			
  		for(var j=0; j<lines.length; j++){
	   		var line = lines[j];
	   		
	   		box = line['boxNo'];
	   		
	   		if( box != null && box != currentBox ){
	   			
	   			currentBox = box;
	   			showTotalNoOfBox = true;
	   			
	   			headers.push(['FEED']);
	   			headers.push(['B', JSReceiptUtils.format("Box/Bag: " + box ,LINE_WIDTH)]);
	   		}
	   		
	   		var name = line['name'];
	   		var qty = line['qty'];
	   		
	   		qty = parseFloat(qty);
	   		
	   		total_qty = total_qty + qty;
	   		
	   		var line = JSReceiptUtils.format( name, LINE_WIDTH-10 );
	   		line = line + JSReceiptUtils.format( qty, 10, true ); 
	   		
	   		headers.push(['N', line]);
  		}

  		var totalLabel = jQuery.trim( I18n.t("Total Qty") );
  		
  		line = JSReceiptUtils.format( totalLabel, LINE_WIDTH-10 )	+ JSReceiptUtils.format( total_qty, 10, true );

  		headers.push(['N',LINE_SEPARATOR]);
  		headers.push(['B', line]);

  		/*flush print data to printer*/	   		

  		headers.push(['N',LINE_SEPARATOR]);
  		
  		
  		if( request.transfer_type == 'stock-transfer-send' )
  		{  			
  			if( showTotalNoOfBox ){
	   			
	   			headers.push(['FEED']);
	   			headers.push(['N', JSReceiptUtils.format("Total No. of Boxes/Bags:.................................................",LINE_WIDTH)]);
	   		}

  			headers.push(['FEED']);
  			headers.push(['N',JSReceiptUtils.format( "Delivered By:................................................................", LINE_WIDTH )]);
  			headers.push(['FEED']);
  			headers.push(['N',JSReceiptUtils.format( "Received By:.................................................................", LINE_WIDTH )]);
  			headers.push(['FEED']);
  			headers.push(['N',JSReceiptUtils.format( "Date:........................................................................", LINE_WIDTH )]);
  			headers.push(['FEED']);
  			headers.push(['FEED']);
  		} 
  		
  		headers.push(['PAPER_CUT']);

 		PrinterManager.print(headers);
	 
};

angular.module('app').controller("ReceiveStockController", function( $scope, $modal, $location, LoginService ){
	
	var ad_user_id = LoginService.user.ad_user_id;
	
	var postData = {};
	
	postData = JSON.stringify( postData );
	
	$scope.showModal();	
	
	StockService.receiveStockList( postData ).done(function( json ){
		
		jQuery('#receive_item_history_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": true,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			data : json,
			
			"language": {
			      "emptyTable": "There are no requests."
			    },
			
			"columns": [
				{
					"data": "movementdate"
				},
				{
					"data": "documentno"
				},
				{
					"data": "docstatus"
				},
				{
					"data": "qty"
				},
				{
					"data": "warehouse_from"
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
						return '<a href="javascript:void(0)" onclick="requestConfirmation(' +  row['m_movement_id'] + ',' + ad_user_id + ')">' + data + '</a>' ;
					},
					"targets": 1
					
			    }
			 ]
		});
		
	}).fail(function( error ){
		//error message
		$scope.alert( error );
		
	}).always(function(){	
		
		$scope.closeModal();
		
	});
	
	window.requestConfirmation = function( movementId, ad_user_id ){
		
		/*
		$scope.confirm("Do you want to complete transfer request?", function( result ){
			
			if(result == true){
				completeStock( movementId, ad_user_id );
			}
			
		});
		*/
		
		
		location.href="#/view-receive-item?movementId=" + movementId;
		
	};
	
	
	window.completeStock = function(movementId, ad_user_id){		

		
		$scope.showModal();	
		
		var post = {};
		
		post['movementId'] = movementId;
		post['ad_user_id'] = ad_user_id;
		
		post = JSON.stringify(post);
		
		StockService.completeStock( post ).done(function( json ){
			
			var document_no = json['document_no'];
			
			//$scope.info("Document No: "+ document_no +" successfully completed.");
			
			$modal.open(
					{
						templateUrl: '/html/popups/stock-synchronizing.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						resolve:
						{
							
						},
						controller: function($scope, $modalInstance)
						{
							$scope.msgText = "Document No: "+ document_no +" successfully completed.";
							
							$scope.sync = function(){
								
								$modalInstance.close();
								
								$scope.showModal("Synchronizing ...");
								
								DataSynchronizer.synchronizePOS().done(function(json){ 
									
									$scope.closeModal();						
									
									APP.initCache().done(function(){
										
										$scope.info("POS was successfully synchronized");
										
									}).fail(function(){
										
									}).always(function(){							
										
									});
			                   	 
			                    }).fail(function(msg){
			                    	
			                    	//failed
			                    	$scope.closeModal();
			                    	
			                    	$scope.alert(msg);
			                    	
			                    }).always(function(){                    	
			                    	
			                    	location.href="#/menu";
			                    	location.href="#/receive-item"; /* hack to reload page */
			                    	//$location.path("/menu");
			                    	//$location.path("/receive-item");
			                    	
			                    });
								
							};
						}
					});			
			
		}).fail(function( error ){
			//error message
			$scope.alert( error );
			
		}).always(function(){
			
			$scope.closeModal();
		});				
	
		
	};
	
		
});

angular.module('app').controller("ViewReceiveStockController", function( $scope, $modal, $timeout, $location, $routeParams, LoginService ){
	
	var ctrl = this;
	
	var movementId = $routeParams.movementId;
	var ad_user_id = LoginService.user.ad_user_id;
	
	ctrl.complete = function(){
		
		$scope.confirm("Do you want to complete transfer request?", function( result ){
			
			if(result == true){
				_complete();
			}
			
		});
		
	};
	
	var _complete = function(){
		
		$scope.showModal();	
		
		var post = {};
		
		post['movementId'] = movementId;
		post['ad_user_id'] = ad_user_id;
		
		post = JSON.stringify(post);
		
		StockService.completeStock( post ).done(function( json ){
			
			var document_no = json['document_no'];
			
			//$scope.info("Document No: "+ document_no +" successfully completed.");
			
			$modal.open(
					{
						templateUrl: '/html/popups/stock-synchronizing.html',
						// size: 'lg',
						// scope : $scope,
						controllerAs: '$ctrl',
						resolve:
						{
							
						},
						controller: function($scope, $modalInstance)
						{
							$scope.msgText = "Document No: "+ document_no +" successfully completed.";
							
							$scope.sync = function(){
								
								$modalInstance.close();
								
								$scope.showModal("Synchronizing ...");
								
								DataSynchronizer.synchronizePOS().done(function(json){ 
									
									$scope.closeModal();						
									
									APP.initCache().done(function(){
										
										$scope.info("POS was successfully synchronized");
										
									}).fail(function(){
										
									}).always(function(){							
										
									});
			                   	 
			                    }).fail(function(msg){
			                    	
			                    	//failed
			                    	$scope.closeModal();
			                    	
			                    	$scope.alert(msg);
			                    	
			                    }).always(function(){                    	
			                    	
			                    	location.href="#/menu";
			                    	location.href="#/receive-item";
			                    	//$location.path("/menu");
			                    	//$location.path("/receive-item");
			                    	
			                    });
								
							};
						}
					});			
			
		}).fail(function( error ){
			//error message
			$scope.alert( error );
			
		}).always(function(){
			
			$scope.closeModal();
		});		
		
	};
	
	$scope.showModal();	
	
	var post = {};
	
	post['movementId'] = movementId;
	
	post = JSON.stringify(post);
	
	StockService.receiveStockDocument( post ).done(function( json ){
		
		$timeout(function(){
			
			ctrl.transfer = json;
			
		});
		
		
	}).fail(function( error ){
		//error message
		$scope.alert( error );
		
	}).always(function(){
		
		$scope.closeModal();
	});
		
	
	
});
