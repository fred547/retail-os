angular.module('app').controller("CurrentTillController", function( $scope, $modal ){
	
	var postData = {};
	
	postData = JSON.stringify( postData );
	
	$scope.showModal();	
	
	CurrentTillService.getDailySalesReceipt( postData ).done( function( json ){
		
		jQuery('#daily_sales_receipt_table').DataTable({
			
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
					"data": "dateordered"
				},
				{
					"data": "documentno"
				},
				{
					"data": "ordertype"
				},
				{
					"data": "salesrep"
				},
				{
					"data": "customer"
				},
				{
					"data": "paymentrule"
				},
				{
					"data": "docstatus"
				}
			],
			"columnDefs": 
			    [
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
			            "targets": 5
			        },
			    ]
			
		});
		
	}).fail(function( error ){
		//error message
		$scope.alert( error );
		
	}).always(function(){		
		$scope.closeModal();
	});
		
});