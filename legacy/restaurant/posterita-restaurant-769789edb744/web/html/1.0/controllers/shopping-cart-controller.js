angular.module('app').controller('ShoppingCartController', function($scope, $modal, LoginService)
{	
	$scope.setShoppingCartSelectedIndex = function( index ){
		
		$scope.shoppingCart.selectedIndex = index;
		
	};
	
	$scope.editQty = function(line)
	{
		if(line.editable == false)
		{
			return;
		}
		
		$scope.setShoppingCartSelectedIndex(line.lineId);
		
		var product = line.product;
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		$modal.open(
		{
			templateUrl: '/html/popups/item-line.html',
			// size: 'sm',
			// scope : $scope,
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, line)
			{
				
				var $ctrl = this;
				var initialQty = parseFloat(line.qty.val);
				var allowSplit = true;
				
				/* add split validation based on uom scale */
				if(line.product.stdprecision == 0)
				{
					allowSplit = ( initialQty < -1 || initialQty > 1 );
				}
				else
				{
					allowSplit = ( initialQty != 0.0 );
				}
				
				$ctrl.qty = initialQty;
				
				$ctrl.isValid = function()
				{
					return allowSplit;
				};
				
				
				$ctrl.apply = function(qty)
				{
					var qtyEntered = $ctrl.qty;
					
					//set scale based on uom
					if( line.product.stdprecision == 0 )
					{
						qtyEntered = parseInt(qtyEntered);
					}
					else
					{
						qtyEntered = parseFloat(qtyEntered);
					}
					
					qtyEntered = new BigNumber(qtyEntered);
					
					line.shoppingCart.updateQty(line.lineId, qtyEntered);
					$modalInstance.close();
				};
				
				$ctrl.splitLine = function()
				{
					$modalInstance.close();
					
					$modal.open(
						{
							templateUrl: '/html/popups/split-line.html',
							//size: 'lg',
							// scope : $scope,
							controllerAs: '$ctrl',
							resolve:
							{
								line: function()
								{
									return line;
								}
							},
							controller: function($scope, $modalInstance, line)
							{
								$scope.line = line;
								$scope.apply = function()
								{
									
									if(isNaN($scope.qty)){
										$scope.alert(I18n.t('invalid.qty'));						
										return;					
									}
									
									if( ( $scope.line.qty > 0 && $scope.qty >= $scope.line.qty ) /* positive qty */
											|| ( $scope.line.qty < 0 && $scope.qty <= $scope.line.qty ) ) /* negative qty */
									{
										$scope.alert(I18n.t('qty.entered.must.be.less.than') +" "+ $scope.line.qty + '!');						
										return;	
									}
									
									line.shoppingCart.splitLines($scope.line.lineId, $scope.qty);
									$modalInstance.close();
								};
							}
						});
					
				};				
				
			},
			controllerAs: '$ctrl',
		});
	};
	$scope.editPrice = function(line)
	{
		/* check for discount code */
		/*
		if( line.shoppingCart.discountCode != null )
		{
			$scope.info("Business partner has discount code. All other discounts are not applicable.");
			return;
		}
		*/
		
		/*
		if(line.editable == false)
		{
			return;
		}
		*/
		
		$scope.setShoppingCartSelectedIndex(line.lineId);
		
		var product = line.product;
		if ( product.isgift || product.iscoupon || product.ispromotion || product.isdeposit )
		{
			return;
		};
		$modal.open(
		{
			templateUrl: '/html/popups/item-line-discount.html',
			// size: 'sm',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, LoginService, line, $timeout)
			{
				$scope.role = LoginService.role;
				
				var calculateDiscount = function(newPrice, oldPrice)
				{
					var priceEntered = new BigNumber(newPrice);
					var priceList = new BigNumber(oldPrice);
					var discountPercentage = priceList.minus(priceEntered);
					discountPercentage = discountPercentage.times(100);
					discountPercentage = discountPercentage.dividedBy(priceList);
					return discountPercentage;
				}
				
				//boms
				$scope.isBom = false;
				if(line.boms && line.boms.length > 0){
					$scope.isBom = true;
				}
				
				var priceStd = new BigNumber(line.product.pricestd);
				var priceList = new BigNumber(line.product.pricelist);
				var priceLimit = new BigNumber(line.product.pricelimit);
				
				var taxIncluded = line.shoppingCart.priceListIncludeTax;
				
				var priceEntered = line.priceEntered;
				var total = taxIncluded ? line.lineNetAmt : line.lineAmt;
				
				if($scope.isBom){
					
					var bom = null;
					
					for(var i=0; i<line.boms.length; i++){
						
						bom = line.boms[i];
						
						priceStd = priceStd.plus( new BigNumber(bom.product.pricestd).times(bom.qty).dividedBy(line.qty) );
						priceList = priceList.plus( new BigNumber(bom.product.pricelist).times(bom.qty).dividedBy(line.qty) );
						priceLimit = priceLimit.plus( new BigNumber(bom.product.pricelimit).times(bom.qty).dividedBy(line.qty) );
						
						priceEntered = priceEntered.plus( new BigNumber(bom.priceEntered).times(bom.qty).dividedBy(line.qty) );
						total = total.plus( taxIncluded ? bom.lineNetAmt : bom.lineAmt );
					}
					
				}
				
				var initialDiscountPercentage = calculateDiscount(priceStd, priceList);
				var discountPercentage = calculateDiscount(priceEntered, priceList);
				
				
				var data = {
					'price': priceEntered.float(2),
					'total': total.float(2),
					'discount': discountPercentage.float(2),
					'initialDiscount' : initialDiscountPercentage.float(2),
					'qty': line.qty.float(2),
					'pricestd': priceStd.float(2),
					'pricelist': priceList.float(2),
					'pricelimit': priceLimit.float(2),
					'discountCode': line.discountCode
				};
				
				var store = LoginService.store;
				var discountCodeList = store['discountCodes'];
				
				if( discountCodeList != null && discountCodeList.length > 0 ){	
					
					var codes = [
						{'u_pos_discountcode_id':0, 'name':'', 'percentage':-1000}
					];
					
					/* discount code */
					var discountcodes = line.product.discountcodes || "{}";
					discountcodes = discountcodes.substr(1, discountcodes.length - 2);
					
					var array = [];
					
					if(discountcodes.length > 0){
						array = discountcodes.split(",");
					}
					
					var u_pos_discountcode_id, discountCode;
					
					for(var i=0; i<discountCodeList.length; i++){
						
						discountCode = discountCodeList[i];
						u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
						
						if( array.indexOf(u_pos_discountcode_id + '') >= 0 ){
							codes.push(discountCode);
						}						
					}			
					
					
					if( line.shoppingCart.discountCode != null ){
						
						codes.push( line.shoppingCart.discountCode );
					}
					
					$scope.codes = codes;
				}
				
				$scope.applyDiscountCode = function(){
					
					var discountCode = $scope.data['discountCode'];
					
					line.shoppingCart.applyDiscountCode(line.lineId, discountCode);
					
					$modalInstance.close();
					
				};
				
				data.discountAmt = (data.pricelist - data.price) * data.qty;
				
				$timeout(function(){
					$scope.data = angular.copy(data);
				});
				
				
				$scope.reset = function()
				{
					$scope.onPriceChange( $scope.data.pricestd );
				};
				
				$scope.onPriceChange = function(newValue)
				{
					var price = newValue || 0;
					var discountPercentage = calculateDiscount(price, $scope.data.pricelist);
					discountPercentage = discountPercentage.float(2);
					
					if( price != 0){
						$scope.data.price = price;
					}
					
					$scope.data.discount = discountPercentage;
					$scope.data.total = new BigNumber(price * $scope.data.qty).float(2);
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - price) * $scope.data.qty).float(2);
				}
				$scope.onTotalChange = function(newValue)
				{
					var total = newValue || 0;
					$scope.data.price = total / $scope.data.qty;
					var discountPercentage = calculateDiscount($scope.data.price, $scope.data.pricelist);
					discountPercentage = discountPercentage.float(2);
					$scope.data.discount = discountPercentage;
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - $scope.data.price) * $scope.data.qty).float(2);
				}
				$scope.onDiscountChange = function(newValue)
				{
					var discount = newValue || 0;
					discount = 100 - discount;
					discount = discount / 100;
					$scope.data.price = new BigNumber(discount * $scope.data.pricelist).float(2);
					$scope.data.total = new BigNumber($scope.data.price * $scope.data.qty).float(2);
					$scope.data.discountAmt = new BigNumber(($scope.data.pricelist - $scope.data.price) * $scope.data.qty).float(2);
				}
				
				var aggregateDiscount = function(discount1, discount2){
					
					var d1 = new BigNumber(100).minus(discount1);
					var d2 = new BigNumber(100).minus(discount2);
					
					var d3 = d1.times(d2).dividedBy(100);
					var d4 = new BigNumber(100).minus(d3);
					
					return d4.float(2);
				};
				
				$scope.override = function(){
					
					$scope.input("Override discount limit", "Enter PIN", function(pin){
						
						var users = APP.USER.searchUsers({
								'isactive' : 'Y',
								'userpin' : pin
						});
						
						if(users.length == 0){
							$scope.alert("Invalid PIN!");
						}
						else
						{
							var user = users[0];
							
							var ad_role_id = user['ad_role_id'];
							var role = APP.ROLE.getRoleById(ad_role_id);
							
							if(role == null){
								$scope.alert("Role not found!");
							}
							else if( role.iactive == 'N' ){
								$scope.alert("Role has been deactivated!");
							}
							else
							{
								$scope.role = role;
								console.log("Discount limit " + role.userdiscount + "%");
							}
						}
						
					}, false, true);
					
				};
				
				$scope.apply = function()
				{
					var role = $scope.role; /* role can be overriden */
					var data = $scope.data;					
					
					var discountLimit = null;
										
					if( role.discountoncurrentprice == 'Y' ){
						
						//combine user discount and initial product discount
						discountLimit = aggregateDiscount( role.userdiscount , data.initialDiscount );
					}
					else
					{
						//initial product discount can override user discount
						discountLimit = ( data.initialDiscount > role.userdiscount ) ? data.initialDiscount : role.userdiscount;
					}					
					
										
					if( data.discount > discountLimit )
					{
						$scope.alert("Discount is greater than discount limit");
						return;
					}
										
					if( role.allow_upsell == 'Y' )
					{
						//do nothing
					}
					else
					{
						if( role.overwritepricelimit == 'N' )
						{
							if( data.pricelimit > data.price )
							{
								$scope.alert( "The price limit " + data.pricelimit + " has exceeded by the price entered: " + data.price );
								return;
							}
						}
					}										
					
					line.shoppingCart.setDiscountOnLine(line.lineId, $scope.data.discountAmt);
					//line.setDiscountAmt($scope.data.discountAmt);
					
					$modalInstance.close();
				};
				$scope.close = function()
				{
					$modalInstance.close();
				};
			}
		});
	};
	
	$scope.showLineInfo = function(line){
		
		if(line.editable == false)
		{
			return;
		}
		
		var product = line.product;
		
		if ( product.isgift || product.iscoupon || product.ispromotion || product.isdeposit )
		{
			return;
		};
		
		$modal.open(
		{
			templateUrl: '/html/popups/shoppingcart-line-comment.html',
			// size: 'lg',
			// scope : $scope,
			controllerAs: '$ctrl',
			resolve:
			{
				line: function()
				{
					return line;
				}
			},
			controller: function($scope, $modalInstance, line)
			{
				this.product = line.product;
				this.comments = line.comments || '';
								
				this.addComment = function(comments)
				{	
					line.comments = comments;
					
					$modalInstance.close();
				};
				
				this.suite = function()
				{
					line.suite = true;					
					$modalInstance.close();
				};
				
				this.isValid = function()
				{
					var field = this.comments;
					return field;
				};
			}
		}); 
	};
	
	$scope.showProductInfo = function(product)
	{
		if ( product.isgift || product.iscoupon || product.ispromotion )
		{
			return;
		};
		
		$modal.open(
		{
			templateUrl: '/html/popups/product-info.html',
			size: 'lg',
			// scope : $scope,
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
				$scope.mapping_status_message = "Loading ...";
								
				$scope.close = function()
				{
					$modalInstance.close();
				};
				
				//request stock
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
				
				
				//request mappings
				var post = {};
				post['m_product_id'] = product['id'];
				post = JSON.stringify(post);
				
				var url = "/service/Product/mappings?json=" + post;
				
				$http.post(url).then(function(response)
				{
					//check for error
					if( response.data.error ){
						
						$scope.mapping_status_message = response.data.error;
						return;
					}
					
					$scope.mappings = response.data.mappings;
					$scope.mapping_status_message = "";
					
				}, function(error)
				{
					$scope.mapping_status_message = error;
				});
			}
		});
	};
	
	$scope.removeLine = function(line)
	{
		var _removeLine = function(){
			
			//get confirmation
			$scope.confirm("Do you want to void line - "+ line.product.name +" ?", function(result){
				
				if(result == true){
					
					$scope.shoppingCart.addToCart(line.product.m_product_id, 0 - line.qty.float(), "Void - " + line.description, null, null);
					
					line.voided = true;
				}
			});
			
		};
		
		if(line.editable == false)
		{
			var role = LoginService.role;
			
			if("Restaurant Coordinator" == role.name || "Administrator" == role.name || "Manager" == role.name){
				
				_removeLine();			
			}
			else
			{
				$scope.pin(function(pin){
					
					//validate PIN			
					var user = APP.USER.getUserByPin(pin);						
					
					if(user == null){
						alert("Invalid PIN!");
					}
					else
					{
						if(user.isactive == 'N'){
							alert("User is not active!");
							return;
						}
						
						var role = APP.ROLE.getRoleById(user.ad_role_id);
						
						if("Restaurant Coordinator" == role.name || "Administrator" == role.name || "Manager" == role.name){
							_removeLine();
						}
						else
						{
							alert("Only Restaurant Coordinator/Administrator/Manager can remove lines!");
						}
					}
				});
			}
		}
		else
		{
			$scope.shoppingCart.removeFromCart(line.lineId);
		}		
		
	};	
	
});