angular.module('app').controller('ProductInfoController', function($scope, $modal, ProductService)
{
	$scope.displayProductInfoPopup = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/product-info-popup-panel.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance, ProductService)
			{
				var $ctrl = this;
				
				$ctrl.getProductInfo = function(searchTerm)
				{
					if (jQuery("#product-info-textfield").val() == null || jQuery("#product-info-textfield").val() == "") 
					{
						$scope.alert(I18n.t("please.enter.product.name.or.barcode"), function(){
							jQuery("#product-info-textfield").select();
						});
						return;
					}
					else
					{
						var results = ProductService.search(searchTerm, 20);
						// no match
						if (results.length == 0)
						{
							$scope.alert(I18n.t("no.product.found"), function(){
								jQuery("#product-info-textfield").select();
							});
							return;
						}
						else
						{
						}
						
						$ctrl.productInfoSearchTerm = "";
						
						$ctrl.results = results;
					}
				};
				
				
				$ctrl.showProductInfo = function(product)
				{
					//$modalInstance.close();
					
					if ( product.isgift || product.iscoupon || product.ispromotion )
					{
						return;
					};
					
					$modal.open(
					{
						templateUrl: '/html/popups/product-info.html',
						size: 'lg',
						// scope : $scope,
						windowClass: 'topModal',
						controllerAs: '$ctrl',
						resolve:
						{
							product: function()
							{
								return product;
							}
						},
						controller: function($scope, $http, $modalInstance, product, LoginService)
						{
							$scope.product = product;
							$scope.stocks = [];
							
							/*discount code*/
							var discountcodes = product.discountcodes || "{}";
							discountcodes = discountcodes.substr(1, discountcodes.length - 2);
							
							var array = [];
							
							if(discountcodes.length > 0){
								array = discountcodes.split(",");
							}					
							
							var store = LoginService.store;
							var discountCodeList = store['discountCodes'];
							
							var u_pos_discountcode_id, discountCode;
							var codes = [];
							
							for(var i=0; i<discountCodeList.length; i++){
								
								discountCode = discountCodeList[i];
								u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
								
								if( array.indexOf(u_pos_discountcode_id + '') >= 0 ){
									codes.push(discountCode);
								}						
							}
							
							$scope.discountCodes = codes;
							
							$scope.status_message = "Loading ...";
											
							$scope.close = function()
							{
								$modalInstance.close();
							};
							
							var post = {};
							post['m_product_id'] = product['id'];
							post = JSON.stringify(post);
							
							var url = "/service/Product/stock?json=" + post;
							
							$http.post(url).then(function(response)
							{
								//check for error
								if( response.data.error ){
									
									$scope.status_message = response.data.error;
									return;
								}
								
								$scope.stocks = response.data;
								$scope.status_message = "";
								
							}, function(error)
							{
								$scope.status_message = error;
							});
						}
					});
				};	
			},
		});
	};
});