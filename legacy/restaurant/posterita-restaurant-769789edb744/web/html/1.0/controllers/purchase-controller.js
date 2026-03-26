angular.module('app').controller("PurchaseController", function( $scope, $modal, $location, $stateParams, $timeout, LoginService, ShoppingCartService, ProductService, PurchaseService ){
	
	var ctrl = this;	
	
	ctrl.purchase_id = 0;
	ctrl.boxNumber = null;
	
	ctrl.showHeader = true;
	
	var input = document.getElementById("search-textfield");
	
	var store = LoginService.store;
	var terminal = LoginService.terminal;
	
	var cart = ShoppingCartService.getShoppingCart( "Purchase Order" );	
	cart.clearCart(false); //clear previous purchase if any
	
	var c_tax_id = terminal['po_tax_id'];
	var tax = APP.TAX.getTaxById(c_tax_id);
	
	cart.tax = tax;	
	
	ctrl.currencySymbol = terminal['c_currency_name'];	
	
	ctrl.shoppingCart = cart;
	
	//load pricelists
	var PRICELIST_DB = TAFFY(store.pricelists);
	var default_pricelist_id = terminal.po_pricelist_id;
	
	var results = PRICELIST_DB({'m_pricelist_id':{"==":default_pricelist_id}}).get();
	ctrl.default_pricelist = results[0];
	ctrl.pricelist = ctrl.default_pricelist;
	
	cart.priceListIncludeTax = (ctrl.pricelist.istaxincluded == 'Y');
	
	//load taxes
	ctrl.taxList = APP.TAX.searchTaxes({'sopotype':['P','B']});
	
	ctrl.supplier = null;
	
	ctrl.setBoxNo = function(){
		
		$scope.input("Box/Bag Number","Enter Box/Bag Number", function( boxNumber ){			
			ctrl.boxNumber = boxNumber;	
			console.log("Box Number => " + boxNumber);
			
			ctrl.shoppingCart.setCurrentBoxNumber( boxNumber );
		}, true );
		
	};
	
	ctrl.updateSupplier = function(){
		
		if(ctrl.supplier == null) return;
		
		var pricelist_id = ctrl.supplier.po_pricelist_id;
		
		if( pricelist_id != null && pricelist_id > 0 ){
			
			var results = PRICELIST_DB({'m_pricelist_id' : { "==" : pricelist_id }}).get();
			if(results.length > 0){
				ctrl.pricelist = results[0];
			}			
		}
		else
		{
			ctrl.pricelist = ctrl.default_pricelist;
		}
		
		//ctrl.shoppingCart.setPriceList( ctrl.pricelist );
		
	}
		
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
	
	ctrl.getAddress = function(model) {
		
		if(model == null) return "";

		var fields = [
			"address1",
			"address2",
			"address3",
			"address4",
			"city",
			"postal",
			"phone1",
			"phone2",
			"taxNo",
		];

		var address = "";

		for (var i = 0; i < fields.length; i++) {

			var value = model[fields[i]] || '';

			if (value == null || value.length == 0) continue;

			if (address.length > 0) {
				address += ",";
			}

			address += value;
		}

		return address;
	};
	
	ctrl.suppliers = APP.BP.searchBPartners({isvendor: "Y"});
	ctrl.warehouseList = APP.WAREHOUSE.cache({}).order('name').get();
	
	ctrl.updateWarehouse = function(){
		console.log( ctrl.warehouse );
	};
	
	ctrl.searchProduct = function(searchTerm){
		
		var products = ProductService.search(searchTerm, 10);
		
		return products;
		
	};
	
	ctrl.addProduct = function( product ){
		if(product == null) return;
		
		console.info("Adding product .. " + product.name);
		
		
		var cart = ctrl.shoppingCart;
		
		var product_id = product['m_product_id'];
		
		var line = cart.getLineByProductId(product_id);
		
		if(line == null){
			
			//set product price
			var price = APP.PRODUCT_PRICE.getProductPrice( product.id, ctrl.pricelist.m_pricelist_id, ctrl.default_pricelist.m_pricelist_id );
			
			product.pricestd = price.pricestd;
			product.pricelist = price.pricelist;
			product.pricelimit = price.pricelimit;
			
			var line = new ShoppingCartLine(cart, product, 1);
			line.setLineId(cart.lineCount++);
			cart.addLine( line );
			
		}
		else
		{
			line.qty = line.qty.plus(1);
			line.calculateAmt();
		}
		
		cart.updateCart();
	};
	
	ctrl.updateQty = function(line, index){	
		var qty = $('#qty-' + index).val();
		
		if(line.qty.float() == qty) return;
		
		console.log('Update qty -> ' + qty);		
		ctrl.shoppingCart.updateQty(line.lineId, qty);		
	};
	
	ctrl.updatePrice = function(line, index){
		var price = $('#price-' + index).val();
		
		if(line.priceEntered.float() == price) return;
		
		console.log('Update price -> ' + price);
		line.priceEntered = new BigNumber(price);
		line.calculateAmt();		
		line.shoppingCart.updateCart();
	};
	
	ctrl.changeTax = function(line, tax){
		
		console.log('Updating tax -> ' + tax.taxName);
		
		line.tax = tax;
		line.calculateAmt();		
		line.shoppingCart.updateCart();
	}
	
	ctrl.setTax = function(line, id){
		
		var tax = APP.TAX.getTaxById(id);
		
		console.log('Updating tax -> ' + tax.taxName);
		
		line.tax = tax;
		line.calculateAmt();		
		line.shoppingCart.updateCart();
	}
	
	ctrl.updateDiscountOnTotal = function(){
		var discount = $('#discount').val();
		var cart = ctrl.shoppingCart;
		
		if(cart.discountOnTotal.float() == discount) return;
		
		console.log('Update discount -> ' + discount);		
		
		cart.discountOnTotal = new BigNumber(discount);
	};
	
	ctrl.clearList = function(){
		
		$scope.confirm("Do you want to clear all lines?", function( choice ){
			if( choice == true ){
				ctrl.shoppingCart.clearCart(false);
				ctrl.boxNumber = null;
				input.focus();
			}			
		});
		
	};
	
	ctrl.createPurchase = function( complete ){	
		
		//validate form
		if(!ctrl.validate()){
			return;
		}
		
		var _createPurchase = function(updatePriceList){
			
			$scope.showModal();			
			//push purchase to live server
			var pricelist_id = ctrl.pricelist.m_pricelist_id
			var warehouse_id = terminal.m_warehouse_id;
			
			var cart = ctrl.shoppingCart;
			
			var discount = cart.discountOnTotal.float();
			
			var docaction = complete ? "CO" : "DR";
			
			var post = {
					"supplier" : ctrl.supplier.id,
					"referenceno" : ctrl.referenceno,
					"paymentrule" : ctrl.paymentrule,
					"agent" : ctrl.agent || '',
					"promisedate" : $("#purchase_promisedate").val() + " 00:00:00",
					"deliverydate" : $("#purchase_arrivaldate").val() + " 00:00:00",
					"dateordered" : DateUtils.getCurrentDate(),
					"pricelist_id" : pricelist_id,
					"warehouse_id" : ctrl.warehouse.id,
					"discount" : discount,
					"updateprice" : updatePriceList,
					"purchase_id" : ctrl.purchase_id,
					"docaction" : docaction,
					"user_id" : LoginService.user.id,
					"lines" : []
			};
			
			var lines = cart.lines.toArray();
			
			var line = null;
			
			for(var i=0; i<lines.length; i++){
				line = lines[i];
				
				post.lines.push({
					"m_product_id" : line.product.m_product_id,
					"c_tax_id" : line.tax.id,
					"pricelist" : line.product.pricelist,
					"pricestd" : line.product.pricestd,
					"priceentered" : line.priceEntered.float(),
					"qty" : line.qty.float(),
					"c_uom_id" : line.product.c_uom_id,
					"description" : line.description,
					"boxNo" : line.boxNo
				});				
			}
			
			
			var post = JSON.stringify(post);			
			
			OnlinePurchaseService.create( post ).done(function( doc ){				
				//foward to view
				
				$timeout(function(){
					
					$scope.showModal();
					
					APP.PURCHASE.savePurchase( doc ).done(function(msg, purchase ) {
						
						PurchaseService.setDocument( purchase );
						
						cart.clearCart(false);
						
						$location.path("/view-purchase").search({});						
						
					}).fail(function(msg){
						//failed to create
						$scope.alert(msg);
						
					}).always(function()
					{
						$scope.closeModal();
					});
							
				}, 500);		
				
				
			}).fail(function( error ){
				//error message
				$scope.alert( error );
				
			}).always(function(){
				
				$scope.closeModal();
			});	
			
			
		};
		
		//check for price difference
		var lines = ctrl.shoppingCart.lines.toArray();
		var line = null;
		var found = false;
		
		for(var i=0; i<lines.length; i++){
			line = lines[i];
			
			if( line.priceEntered.float() != line.product.pricestd ){
				found = true;
				break;
			} 
		}		
		
		if( found == true && complete ){
			$scope.confirm("The unit cost price of the items are different from the purchase price list. Do you want to update the prices on the price list?", 
					_createPurchase );
		}
		else
		{
			_createPurchase( false );
		}		
				
	};
	
	ctrl.validate = function(){
		
		//supplier
		if( StringUtils.isEmpty( ctrl.supplier ) ){
			$scope.alert("Select a supplier", function(){
				$("#purchase_supplier").focus();
			});
			
			return false;
		}
		
		
		//reference
		if( StringUtils.isEmpty( ctrl.referenceno ) ){
			$scope.alert("Enter a reference number", function(){
				$("#purchase_referenceno").focus();
			});
			
			return false;
		}
		
		
		//payment rule
		if( StringUtils.isEmpty( ctrl.paymentrule ) ){
			$scope.alert("Select a payment type", function(){
				$("#purchase_paymentrule").focus();
			});
			
			return false;
		}
		
		//promisedate
		if( StringUtils.isEmpty( ctrl.promisedate ) ){
			$scope.alert("Select a delivery date", function(){
				$("#purchase_promisedate").focus();
			});
			
			return false;
		}
		
		//arrival
		if( StringUtils.isEmpty( ctrl.arrivaldate ) ){
			$scope.alert("Select an arrival date", function(){
				$("#purchase_arrivaldate").focus();
			});
			
			return false;
		}
		
		//lines
		if( ctrl.shoppingCart.isEmpty() ){
			$scope.alert("No line found! Add some products", function(){
				$("#search-textfield").focus();
			});
			
			return false;
		}
		
		return true;
	}
	
	/*
	ctrl.isValid = function(){
		
		if( 
			StringUtils.isEmpty( ctrl.supplier ) ||
			StringUtils.isEmpty( ctrl.referenceno ) ||
			StringUtils.isEmpty( ctrl.paymentrule ) ||
			StringUtils.isEmpty( ctrl.promisedate ) ||
			ctrl.shoppingCart.isEmpty()
		){
			return false
		}
		
		return true;		
	}
	*/
	
	//load editable purchase
	var purchase_id = $stateParams.id;
	
	if( purchase_id != null ){
		
		ctrl.purchase_id = purchase_id;
		
		//load purchase from history
		var purchase = APP.PURCHASE.getPurchaseById( ctrl.purchase_id );
		
		var bpId = purchase.header.c_bpartner_id;
		var warehouseId = purchase.header.m_warehouse_id;
		
		var supplier = APP.BP.getBPartnerById( bpId );
		var warehouse = APP.WAREHOUSE.getWarehouseById(warehouseId);
		
		//populate screen
		ctrl.supplier = supplier;
		ctrl.updateSupplier();
		ctrl.warehouse = warehouse;
		
		ctrl.referenceno = purchase.header.referenceNo;
		ctrl.paymentrule = purchase.header.paymentRule;
		var promisedate = purchase.header.datePromisedShortForm || purchase.header.dateOrderedShortForm;
		
		var d = moment(promisedate, 'MM/DD/YYYY');		
		ctrl.promisedate = d.format('DD-MM-YYYY');
		
		//pouplate shoppingcart
		
		var line, sLine;
		var product;
		
		var lines = purchase.lines;
		
		for( var i=0; i<lines.length; i++ ){
			
			line = lines[i];
			
			product = APP.PRODUCT.getProductById( line.m_product_id );
			
			product.pricestd = line.priceStd;
			product.pricelist = line.priceList;
			product.pricelimit = line.priceLimit;
			
			sLine = new ShoppingCartLine(cart, product, line.qty);
			sLine.boxNo = line.box;
			sLine.priceEntered = new BigNumber(line.priceEntered);
			sLine.calculateAmt();
			sLine.setLineId(cart.lineCount++);
			cart.addLine( sLine );
			cart.updateCart();
			
		}
	}
	
	
});


angular.module('app').controller("ViewPurchaseController", function( $scope, $modal, $location, $timeout, PurchaseService ){
	
	var ctrl = this;
	
	var purchase = PurchaseService.getDocument();
	ctrl.document = purchase;
	
	var promisedate = purchase.header.datePromisedShortForm || purchase.header.dateOrderedShortForm;
	
	var d = moment(promisedate, 'MM/DD/YYYY');		
	ctrl.promiseDate = d.format('ddd, DD MMM YYYY');
	
	ctrl.exportPDF = function(){
		
		var id = ctrl.document.id;
		
		exportPDF( id );
	};
	
	ctrl.editPO = function(){
		
		var id = ctrl.document.id;
		
		$location.path("/purchase").search({ "id" : id });
		
	};
	
});

angular.module('app').controller("PurchaseHistoryController", function( $scope, $modal, $location, $timeout, $window, $http, PurchaseService ){
	
	var ctrl = this;
	
	ctrl.purchases = APP.PURCHASE.searchPurchases({});
	
	ctrl.render = function(){
		
		var reportData = [];
		
		var purchase;
		
		for(var i=0; i<ctrl.purchases.length; i++){
			
			purchase = ctrl.purchases[i];
			
			reportData.push([
				purchase.header.dateOrdered,
				purchase.header.documentNo,
				purchase.header.bpName,
				purchase.header.qtyTotal,
				purchase.header.grandTotal,
				purchase.header.docStatusName,
				i + 0 
				
			]);
		}
		
		ctrl.report = jQuery('#purchase_table').DataTable({
			
			"sPaginationType": "full_numbers",
			"searching": false,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,
			data: reportData,
			
			
			"columnDefs": [
				{
					"render": function(data, type, row) {
						var id = row[6];
						var html = "<a href='javascript:void(0);' onclick='$$viewPurchase(\"" + id + "\")'>" + data + "</a>";
						return html;
					},
					"targets": 1
				},
				
				{
	                "targets": [ 6 ],
	                "visible": false
	            }
			]
				
		});
		
	};
	
	$window.$$viewPurchase = function( id ){
		
		var purchase = ctrl.purchases[ id ];
		
		PurchaseService.setDocument( purchase );
		
		$location.path("/view-purchase").search({});
		
	};
	
	ctrl.render();
	
});