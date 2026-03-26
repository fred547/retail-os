function HashMap()
{
	var _keys = [];
	var _data = {};
	
	this.size = function() {
		return _keys.length;
	}
	this.get = function(key) {
		return _data[key] || null;
	}
	this.remove = function(key) {
		var index = _keys.indexOf(key);
		if (index != -1) {
			_keys.splice(index, 1);
			_data[key] = null;
		}
	}
	this.toArray = function() {
		var r = [];
		for(var k in _data)
			if (_data[k]) r.push(_data[k]);
		return r;
	}
	this.put = function(key, value) {
		if (_keys.indexOf(key) == -1)
			_keys.push(key);
		_data[key] = value;
	}
	this.clear = function() {
		_keys = [];
		_data = {};
	}
	this.hasItem = function (key) {
		return (_keys.indexOf(key) != -1);
	}
	this.limit = function(start, num) {
		var sub = _keys.slice(start, num),
			result = [];
		for(var i=0,len=sub.length; i<len; i++) {
			result.push(_data[sub[i]]);
		}
		return result;
	}
	this.each = function(fn) {
		if (typeof fn != 'function') {
			return false;
		} else {
			var len = this.size();
			for(var i=0; i<len; i++) {
				var k = _keys[i];
				fn(k, _data[k], i);
			}
		}
	}
	/* backward compatibility*/
	
	this.set = this.put;
	this.unset = this.remove;
	this.values = this.toArray;
	
	this.keys = function(){
		return _keys;
	}
}

/* flag to toggle discount validation */
var DISCOUNT_VALIDATION = true;

var ShoppingCart = function(orderType) {
	this.orderType = orderType;
	this.tax = null;
	this.isSoTrx = true;
	this.bpId = null;
	this.pricelistId = null;
	this.lastUpdatedProductId = 0;
	this.orderId = 0;
	this.lines = new HashMap();
	this.lineCount = 0;
	this.container = null;
	this.selectedIndex = -1;
	this.active = false;
	this.currencySymbol = '$';
	this.subTotal = new BigNumber(0);
	this.grandTotal = new BigNumber(0);
	this.taxTotal = new BigNumber(0);
	this.qtyTotal = new BigNumber(0);
	this.discountOnTotal = new BigNumber(0);
	this.upsellTotal = new BigNumber(0);
	this.seperateLines = false;
	
	this.salesRepId = null;
		
	this.currentBoxNumber = null;	
	this.discountCode = null;
	
	this.setCurrentBoxNumber = function(box) {
		this.currentBoxNumber = box;
	}
	
	//this.initializeShortcuts();
	this.setContainer = function(container) {
		this.container = container;
	};
	
	this.updateCart = function() {
		/*update total*/
		this.updateCartTotal();		
	};
	
	this.resetDiscountOnTotal = function() {
		this.discountOnTotal = new BigNumber(0);
	};
	
	this.resetDiscountOnLines = function() {
		var lines = this.getLines();
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			line.resetLine();
		}
	};
	this.updateCartTotal = function() {
		/*reset totals*/
		this.subTotal = new BigNumber(0);
		this.grandTotal = new BigNumber(0);
		this.taxTotal = new BigNumber(0);
		this.qtyTotal = new BigNumber(0);
		this.discountOnTotal = new BigNumber(0);
		this.upsellTotal = new BigNumber(0);
		this.loyaltyPoints = new BigNumber(0);
		var taxAmtMap = new HashMap(); /*ShoppingCart.java line 350*/
		var couponLines = [];
		var giftLines = [];
		
		var promotionLines = [];
		this.promotionPoints = new BigNumber(0);
		
		var depositLines = [];
		
		var lines = this.getLines();
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var qty = line.qty;
			var lineAmt = line.lineAmt;
			var lineNetAmt = line.lineNetAmt;
			var taxAmt = line.taxAmt;
			//look for coupons
			if (line.product.iscoupon && line.product.iscoupon == true) {
				couponLines.push(line);
				continue;
			}
			
			//look for gifts
			if ( line.product.isgift && line.product.isgift == true && line.product.name != 'Refund Gift Card' ) {				
				giftLines.push(line);
				continue;
			}
			
			//look for promotions
			if ( line.product.ispromotion && line.product.ispromotion == true ) {
				promotionLines.push(line);
				continue;
			}
			
			//look for deposits
			if ( line.product.isdeposit && line.product.isdeposit == true && line.product.name != 'Refund Deposit' ) {				
				depositLines.push(line);
				continue;
			}
			
			this.qtyTotal = this.qtyTotal.plus(qty);
			this.taxTotal = this.taxTotal.plus(taxAmt);
			this.subTotal = this.subTotal.plus(lineAmt.toFixed(2));
			this.grandTotal = this.grandTotal.plus(lineNetAmt.toFixed(2));
			this.upsellTotal = this.upsellTotal.plus(line.priceEntered.times(line.qty));
			this.upsellTotal = this.upsellTotal.minus(line.qty.times(line.product.pricelimit));
			this.loyaltyPoints = this.loyaltyPoints.plus(new BigNumber(line.product.loyaltypoints).times(line.qty));
			var amt = taxAmtMap.get(line.tax.taxId);
			if (amt == null) {
				amt = [];
			}
			amt.push(lineAmt);
			taxAmtMap.set(line.tax.taxId, amt);
			for (var j = 0; j < line.boms.length; j++) {
				var bom = line.boms[j];
				var bomQty = bom.qty;
				var bomLineAmt = bom.lineAmt;
				var bomLineNetAmt = bom.lineNetAmt;
				var bomTaxAmt = bom.taxAmt;
				this.qtyTotal = this.qtyTotal.plus(bomQty);
				this.taxTotal = this.taxTotal.plus(bomTaxAmt);
				this.subTotal = this.subTotal.plus(bomLineAmt);
				this.grandTotal = this.grandTotal.plus(bomLineNetAmt);
				this.upsellTotal = this.upsellTotal.plus(bom.priceEntered.times(bom.qty));
				this.upsellTotal = this.upsellTotal.minus(bom.qty.times(bom.product.pricelimit));
				this.loyaltyPoints = this.loyaltyPoints.plus( new BigNumber( bom.product.loyaltypoints ).times(bom.qty));
				var amt = taxAmtMap.get(bom.tax.taxId);
				if (amt == null) {
					amt = [];
				}
				amt.push(bomLineAmt);
				taxAmtMap.set(bom.tax.taxId, amt);
			}
			for (var j = 0; j < line.modifiers.length; j++) {
				var modifier = line.modifiers[j];
				var modifierQty = modifier.qty;
				var modifierLineAmt = modifier.lineAmt;
				var modifierLineNetAmt = modifier.lineNetAmt;
				var modifierTaxAmt = modifier.taxAmt;
				/* don't count modifier */
				/*this.qtyTotal = this.qtyTotal.plus(modifierQty);*/
				this.taxTotal = this.taxTotal.plus(modifierTaxAmt);
				this.subTotal = this.subTotal.plus(modifierLineAmt);
				this.grandTotal = this.grandTotal.plus(modifierLineNetAmt);
				this.upsellTotal = this.upsellTotal.plus(modifier.priceEntered.times(modifier.qty));
				this.upsellTotal = this.upsellTotal.minus(modifier.qty.times(modifier.product.pricelimit));
				this.loyaltyPoints = this.loyaltyPoints.plus(new BigNumber( modifier.product.loyaltypoints ).times(modifier.qty));
				var amt = taxAmtMap.get(modifier.tax.taxId);
				if (amt == null) {
					amt = [];
				}
				amt.push(modifierLineAmt);
				taxAmtMap.set(modifier.tax.taxId, amt);
			}
			
			this.discountOnTotal = this.discountOnTotal.plus(line.getDiscountOnTotal());
		}
		this.orderTaxes = [];
		this.taxTotal = new BigNumber(0)
		var keys = taxAmtMap.keys();
		for (var k = 0; k < keys.length; k++) {
			var key = keys[k];
			var baseAmts = taxAmtMap.get(key);
			var taxId = parseInt(key);
			var tax = APP.TAX.getTaxById(taxId);
			var taxBaseAmt = new BigNumber(0);
			for (var i = 0; i < baseAmts.length; i++) {
				var baseAmt = baseAmts[i];
				taxBaseAmt = taxBaseAmt.plus(baseAmt);
			}
			var taxAmt = taxBaseAmt.times(tax.taxRate).dividedBy(100);
			this.taxTotal = this.taxTotal.plus(taxAmt.toFixed(4));
			var orderTax = {};
			orderTax.taxId = taxId;
			orderTax.taxAmt = taxAmt.toFixed(3);
			this.orderTaxes.push(orderTax);
		}
		//depending on whether price includes tax
		var taxIncluded = this.priceListIncludeTax;
		this.taxTotal = new BigNumber(this.taxTotal.toFixed(2));
		this.subTotal = new BigNumber(this.subTotal.toFixed(2));
		if (!taxIncluded) {
			this.grandTotal = this.subTotal.plus(this.taxTotal);
		}
		this.grandTotal = new BigNumber(this.grandTotal.toFixed(2));
		
		/* coupons */
		for(var i=0; i<couponLines.length; i++){
			
			var couponLine = couponLines[i];
			
			var amt = couponLine.product.pricelist;
			
			if (this.grandTotal.comparedTo(amt.negate()) < 1) {
				amt = this.grandTotal.negate();				
			} 
			
			couponLine.priceEntered = amt;
			couponLine.lineAmt = amt;
			couponLine.lineNetAmt = amt;
			
			this.subTotal = this.subTotal.plus(amt);
			this.grandTotal = this.grandTotal.plus(amt);
		}
		
		/* promotions */
		for(var i=0; i<promotionLines.length; i++){
			
			var promotionLine = promotionLines[i];
			
			var amt = promotionLine.product.pricelist;
			
			if (this.grandTotal.comparedTo(amt.negate()) < 1) {
				amt = this.grandTotal.negate();
			} 	
			
			promotionLine.priceEntered = amt;
			promotionLine.lineAmt = amt;
			promotionLine.lineNetAmt = amt;
			
			this.subTotal = this.subTotal.plus(amt);
			this.grandTotal = this.grandTotal.plus(amt);
			
			this.promotionPoints = this.promotionPoints.plus(promotionLine.product.points);
		}
		
		
		/*gifts*/
		for ( var i=0; i<giftLines.length; i++ ) {
			
			var giftLine = giftLines[i];
			
			var giftAmt = giftLine.product.pricelist.negate();
			
			var redeemAmt = 0;
			
			if ( this.grandTotal.comparedTo(giftAmt) >= 0 ) {
				redeemAmt = giftAmt;
			}
			else 
			{
				redeemAmt = this.grandTotal;
			}			
			
			/**/
			giftLine.priceEntered = redeemAmt.negate();
			giftLine.lineAmt = redeemAmt.negate();
			giftLine.lineNetAmt = redeemAmt.negate();
			this.subTotal = this.subTotal.minus( redeemAmt );
			this.grandTotal = this.grandTotal.minus( redeemAmt );
			/**/
		}
		
		/*deposits*/
		for ( var i=0; i<depositLines.length; i++ ) {
			
			var depositLine = depositLines[i];
			
			var depositAmt = depositLine.product.pricelist.negate();
			
			var redeemAmt = 0;
			
			if ( this.grandTotal.comparedTo(depositAmt) >= 0 ) {
				redeemAmt = depositAmt;
			}
			else 
			{
				redeemAmt = this.grandTotal;
			}			
			
			/**/
			depositLine.priceEntered = redeemAmt.negate();
			depositLine.lineAmt = redeemAmt.negate();
			depositLine.lineNetAmt = redeemAmt.negate();
			this.subTotal = this.subTotal.minus( redeemAmt );
			this.grandTotal = this.grandTotal.minus( redeemAmt );
			/**/
		}
		
		/*this.grandTotal = this.subTotal.plus(this.taxTotal);*/
		
		jQuery(this).trigger('cart.updateTotal', this);
	};
	this.successNotifier = function(response) {
		/**/
		console.info('Operation on cart succeded');
	};
	this.completeNotifier = function(response) {
		/**/
		console.info('Operation on cart completed');
		this.requestCounter--;
	};
	this.failureNotifier = function(response) {
		/**/
		console.warn('Operation on cart FAILED!');
	};
	this.exceptionNotifier = function(response) {
		/**/
		console.error('Operation on cart FAILED TO REQUEST!');
		this.requestCounter--;
	};
	this.getCart = function() {
		this.updateCart();
	};
	this.getLineByProductId = function(productId) {
		var id = productId;
		var lines = this.lines.values();
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			/* skip exchange lines */
			if (line.exchangeLine == true) {
				continue;
			}
			if (line.product.m_product_id == id && line.boxNo == this.currentBoxNumber) {
				return line;
			}
		}
		return null;
	};
	this.getLine = function(lineId) {
		var line = this.lines.get(lineId);
		return line;
	};
	this.getLines = function() {
		return this.lines.values();
	};
	this.addLine = function(shoppingCartLine) {
		
		/* reset discount on total if any */
		this.clearDiscountOnTotal();
		
		shoppingCartLine.calculateAmt();
		this.lines.set(shoppingCartLine.lineId, shoppingCartLine);
		this.lastUpdatedLineId = shoppingCartLine.lineId;
		this.selectedIndex = shoppingCartLine.lineId;		
	};
	this.clearCart = function(userTriggered) {
		
		if( userTriggered && this.orderType == "POS Order"){
			
			var qty = this.qtyTotal;
			var amount = this.grandTotal;
			var description = this.getLineDetails();
			
			jQuery(this).trigger('cart.log', { "action" : "Clear Cart", "qty" : qty, "amount" : amount, "description" : description } );
		}		
		
		this.currentBoxNumber = null;
		this.lastUpdatedProductId = 0;
		this.lastUpdatedLineId = 0;
		this.selectedIndex = -1;
		this.lineCount = 0;
		this.subTotal = new BigNumber(0);
		this.grandTotal = new BigNumber(0);
		this.taxTotal = new BigNumber(0);
		this.qtyTotal = new BigNumber(0);
		this.discountOnTotal = new BigNumber(0);
		this.upsellTotal = new BigNumber(0);
		this.lines = new HashMap();
		this.updateCart();
		
		jQuery(this).trigger('cart.clear', this);
	};
	
	this.clearDiscountOnTotal = function() {		
		if(this.discountOnTotal.float() > 0.0){			
			this.setDiscountOnTotal(0);	
			
			jQuery(this).trigger('cart.clearDiscountOnTotal', this);
		}
	};
	
	this.addToCart = function(productId, qty, description, price, modifiers) {
		
		var line = null;
		
		if(this.seperateLines == true){
			
		}		
		else
		{
			line = this.getLineByProductId(productId);
		}
		
		/*Add modifiers on different lines*/
		if (modifiers != null) {
			line = null; /*add new line*/
		}
		/*Bug Fix for edit on fly*/
		if ((description != null) || (price != null)) {
			line = null; /*add new line*/
		}
		if (line == null) {
			var product = APP.PRODUCT.getProductById(productId);
			if (product == null) {
				/*alert('Failed to load product from cache!' + productId);*/
				return;
			} else {
				line = new ShoppingCartLine(this, product, qty);
				if (description) {
					line.description = description;
				}
				if (price) {
					line.priceEntered = new BigNumber(price);
					line.product.pricestd = price;
					line.calculateAmt();
				}
				var newLineId = this.lineCount++;
				line.setLineId(newLineId);
				this.addLine(line);
			}
		} else {
			line.qty = line.qty.plus(qty);
			/* update bom */
			line.loadBoms();
			if (line.qty.comparedTo(0) < 1) {
				this.lines.unset(line.lineId);
			} else {
				this.addLine(line);
			}
		}
		if (modifiers != null) {
			/*var line = this.getLineByProductId(productId);*/
			line.setModifiers(modifiers);
		}
		this.updateCart();
		
		jQuery(this).trigger('cart.addToCart', line);
	};
	this.removeFromCart = function(lineId) {
		
		/* reset discount on total if any */
		this.clearDiscountOnTotal();
		
		var line = this.getLine(lineId);
		this.lines.unset(lineId);
		this.updateCart();
		
		jQuery(this).trigger('cart.removeFromCart', line);
		
		if(this.orderType == "POS Order"){
			
			var qty  = line.qty;
			var amount = line.lineNetAmt;
			var description = line.getLineInfo();
			
			jQuery(this).trigger('cart.log', { "action" : "Remove Item Line", "qty" : qty, "amount" : amount, "description" : description });
		}
	};
	this.incrementQty = function(lineId) {
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		var qty = line.qty.plus(1);
		this.updateQty(lineId, qty);
	};
	this.decrementQty = function(lineId) {
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		
		if(this.orderType == "POS Order"){
			
			var amount = line.lineNetAmt.dividedBy(line.qty);
			var description = line.getLineInfo();
			
			jQuery(this).trigger('cart.log', { "action" : "Decrement", "qty" : 1, "amount" : amount, "description" : description });
		}

		var qty = line.qty.minus(1);
		this.updateQty(lineId, qty);		
	};
	this.updateQty = function(lineId, qty) {
		
		/* reset discount on total if any */
		this.clearDiscountOnTotal();
		
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		var previousQty = line.qty;
		
		if(previousQty > qty){
			if(this.orderType == "POS Order"){
				
				var diff = previousQty.minus(qty);				
				var amount = line.lineNetAmt.dividedBy(previousQty);
				amount = amount.times(diff);
				var description = line.getLineInfo();
				
				jQuery(this).trigger('cart.log', {"action" : "Decrement", "qty": (previousQty - qty), "amount" : amount, "description" : description });
			}
		}
		
		line.qty = new BigNumber(qty);
		/* update bom */
		line.loadBoms();
		/* -ve qty is not allowed for returns */
		if ((this.orderType != 'POS Order') && (line.qty.comparedTo(0) < 0)) {
			this.lines.unset(line.lineId);
			this.updateCart();
			
			jQuery(this).trigger('cart.updateQty', line);
			
			return;
		}
		if (line.qty.comparedTo(0) == 0) {
			this.lines.unset(line.lineId);
		} else {
			this.addLine(line);
		}
		
		line.updateModifiers();
		
		//reset discount on total
		if( this.isEmpty() ){
			
			this.resetDiscountOnTotal();
		}
		
		this.updateCart();		
		
		jQuery(this).trigger('cart.updateQty', line);
	};
	this.splitLines = function(lineId, qty) {
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		line.qty = line.qty.minus(qty);
		this.addLine(line);
		var splittedLine = new ShoppingCartLine(this, line.product, qty);
		splittedLine.setLineId(this.lineCount++);
		this.addLine(splittedLine);
		this.updateCart();
	};
	this.setDiscountOnLine = function(lineId, amt) {
		
		/* reset discount on total if any */
		this.clearDiscountOnTotal();
		
		/*see ShoppingCartManager.setDiscountOnLine*/
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		var previousDiscountAmt = line.discountAmt;
		
		/* clear discount code */
		line.discountCode = null;
		
		line.setDiscountAmt(amt);
		
		/*
		var allowUpSell = DISCOUNT_RIGHTS.allowUpSell;
		if (allowUpSell && this.isSoTrx && DISCOUNT_VALIDATION) {
			if (this.upsellTotal.comparedTo(0.0) < 0) {
				line.setDiscountAmt(previousDiscountAmt);
				alert('The upsell buffer cannot be negative!');
			}
		}
		*/
		
			
		
		jQuery(this).trigger('cart.update', this);
	};
	
	this.applyDiscountCode = function(lineId, discountCode) {
		
		/* reset discount on total if any */
		this.clearDiscountOnTotal();
		
		/*see ShoppingCartManager.setDiscountOnLine*/
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		line.applyDiscountCode(discountCode);
		
		
		jQuery(this).trigger('cart.update', this);
	};
	
	this.applyBPDiscountCode = function(discountCode){
		
		this.discountCode = discountCode;
		
		var lines = this.getLines();
		var line = null;
		
		for( var i = 0; i < lines.length; i ++ ){
			
			line = lines[i];
			
			if( discountCode == null ){
				line.resetLine();
			}
			else
			{	
				
				//check for gift cards, coupon
				var product = line.product;
				if ( product.isgift || product.iscoupon || product.ispromotion )
				{
					continue;
				}
				
				// check for discounted items 
				if( line.discountSrc == null || 
						line.discountSrc == "PRODUCT" || 
						line.discountSrc == "SALESREP" ) {
					
					// check current discount percentage 
					var discountPercentage = new BigNumber(line.product.pricelist).minus(line.product.pricestd).dividedBy(line.product.pricelist).times(100);
					
					if( discountPercentage.float() > discountCode.percentage){
						
						continue;
					}
					
				}				
				
				
				var percentage = new BigNumber(100).minus(discountCode.percentage);				
				var discountedPrice = new BigNumber(line.product.pricelist).times(percentage).dividedBy(100);
				
				line.priceEntered = new BigNumber(discountedPrice.toFixed(2));
				line.discountSrc = "CUSTOMER";
				
				line.calculateAmt();
				
			}
			
		}/*for*/
		
		this.updateCart();		
		
	};
	
	this.setDiscountOnTotal = function(amt) {
		/*
		if (amt == 0) {
			return;
		}
		*/		
		
		var grandTotal = this.grandTotal.plus(this.discountOnTotal);
		if (grandTotal.comparedTo(0) == 0) {			
			
			this.discountOnTotal = amt;
			
			return;
		}
		/*this.resetDiscountOnTotal();*/
		/*this.resetDiscountOnLines();*/
		
		this.updateCartTotal();
		var amt = new BigNumber(amt);
		var discountOnTotal = new BigNumber(0);
		
		var discountPercentage = amt.dividedBy(grandTotal).toFixed(4);		
		var previousDiscountPercentage = this.discountOnTotal.dividedBy(grandTotal).toFixed(4);
		
		var lastLine = null;
		var taxIncluded = this.priceListIncludeTax;
		var lines = this.lines.values();
		
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			
			//console.log(line);
			
			var lineAmt = line.lineAmt;
			var lineNetAmt = line.lineNetAmt;
			
			if (taxIncluded) {
				lineAmt = line.lineNetAmt;
			}
			
			//boms
			if( line.boms != null && line.boms.length > 0 ) {
				
				var bom = null;
				
				for(var i=0; i<line.boms.length; i++){
					
					bom = line.boms[i];
					
					lineAmt = lineAmt.plus( taxIncluded ? bom.lineNetAmt : bom.lineAmt );
					lineNetAmt = lineNetAmt.plus( bom.lineNetAmt );
				}
				
			}
			
			//console.log('lineAmt: ' + lineAmt);
			//console.log('lineNetAmt: ' + lineNetAmt);
			
			//reset previous discount
			lineAmt = lineAmt.dividedBy(new BigNumber(1).minus(previousDiscountPercentage));			
			
			var discountAmt = lineAmt.times(discountPercentage);
			var discountAmtWithTax = lineNetAmt.times(discountPercentage).dividedBy(new BigNumber(1).minus(previousDiscountPercentage));
			
			console.log('lineAmt.times(discountPercentage) => ' + lineAmt + ' * ' + discountPercentage + " = " + discountAmt );
			
			discountOnTotal = discountOnTotal.plus(discountAmtWithTax);
			//discountAmt = discountAmt.plus(line.discountAmt);
			line.setDiscountAmt(discountAmt, true, discountAmtWithTax);
		}
		this.discountOnTotal = discountOnTotal;
		this.updateCart();
		
		jQuery(this).trigger('cart.update', this);
	};
	this.setTax = function(lineId, taxId) {
		this.lastUpdatedLineId = lineId;
		var line = this.getLine(lineId);
		var tax = APP.TAX.getTaxById(taxId);
		if (tax == null) {
			alert('Failed to load Tax[' + taxId + ']');
			return;
		}
		line.tax = tax;
		line.calculateAmt();
		this.updateCart();
		
		jQuery(this).trigger('cart.update', this);
	};
	this.setBp = function(bp) {
		/*
		var pricelistId = bp.priceListId;
		if ((pricelistId == '') || (pricelistId == this.pricelistId)) {
			this.bp = bp;
		} else {
			this.setPriceList(pricelistId);
		}*/
		
		if (bp && bp.u_pos_discountcode_id > 0)
		{
			var u_pos_discountcode_id = bp.u_pos_discountcode_id;
			
			var store = APP.STORE.cache({}).get()[0];
			var discountCodeList = store['discountCodes'];
			
			console.info("checking discount code expiry");
						
			for(var i=0; i<discountCodeList.length; i++){
				
				
				if(u_pos_discountcode_id == discountCodeList[i]['u_pos_discountcode_id']){					
					
					if(bp.discountcode_expiry && bp.discountcode_expiry.length > 0){
					
						var expiry = moment(bp.discountcode_expiry, "YYYY-MM-DD HH:mm:ss");
						var now = moment();
						
						expiry = expiry.startOf('day');
						now = now.startOf('day');
						
						var expired = now.isAfter(expiry);
						
						/*if expired*/
						if(expired){
							/*alert("Discount code has expired!");*/
							this.discountCode = null;
						}
						else
						{							
							this.discountCode = discountCodeList[i];
						}
					}
					else
					{
						this.discountCode = discountCodeList[i];
					}
					
					break;
				}				
			
			}			
			
		}
		else
		{
			this.discountCode = null;
		}
		
		this.applyBPDiscountCode(this.discountCode);
		
		jQuery(this).trigger('cart.update', this);
	};
	this.setPriceList = function(pricelistId) {
		alert('To be implemented');
		this.updateCart();
	};
	
	this.setSalesRep = function(salesRepId) {
		this.salesRepId = salesRepId;
	};
	
	this.addBehaviourToLines = function() {
		console.info('Adding behaviour to cart lines');
		if (this.isEmpty()) {
			$('order-actions-button-container').style.display = 'none';
			$('shopping-cart-column').style.display = 'none';
			$('more-button').style.display = 'none';
			$('empty-cart-button-container').style.display = 'block';
			jQuery('.disabled-when-cart-empty').attr("disabled", "disabled");
		} else {
			$('empty-cart-button-container').style.display = 'none';
			$('shopping-cart-column').style.display = 'block';
			$('order-actions-button-container').style.display = 'block';
			$('more-button').style.display = 'block';
			jQuery('.disabled-when-cart-empty').removeAttr("disabled");
		}
		if (this.isEmpty()) {
			if (ShoppingCartManager.quantityTextfield) {
				ShoppingCartManager.quantityTextfield.value = '';
			}
			this.onChange();
			return;
		}
		var lines = this.getLines();
		if (this.selectedIndex < 0 || this.selectedIndex == lines.length || lines[this.selectedIndex].lineId != this.lastUpdatedLineId) {
			this.selectedIndex = (lines.length - 1);
		}
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var row = $('row' + (i + 1));
			if (line.lineId == this.lastUpdatedLineId) {
				this.selectedIndex = i;
			}
			if (row) {
				line.element = row;
				row.onclick = this.setSelectedIndex.bind(this, i);
			}
		}
		this.renderLines();
	};
	this.setSelectedIndex = function() {
		var index = arguments[0];
		this.selectedIndex = index;
		/*update qty textfield*/
		var lines = this.getLines();
		var qty = '';
		if (lines.length > 0) {
			var currentLine = lines[this.selectedIndex];
			qty = currentLine.qty;
		}
		jQuery("#line-quantity-texfield").val(qty);
		this.renderLines();
	};
	this.renderLines = function() {
		/*highlight active row*/
		var lines = this.getLines();
		for (var i = 0; i < lines.length; i++) {
			var currentLine = lines[i];
			var className = ((i % 2 == 0) ? 'even' : 'odd');
			if (this.selectedIndex == i) {
				var highlightColor = 'shopping-cart-highlight';
				className = (highlightColor + ' ' + className);
			}
			var element = $('row' + (i + 1));
			if (!element) continue;
			element.className = className;
		} /*for*/
		var activeRow = $('row' + (this.selectedIndex + 1));
		activeRow.scrollIntoView(false);
		/*update qty textfield*/
		var currentLine = lines[this.selectedIndex];
		var qty = currentLine.qty;
		if (ShoppingCartManager.quantityTextfield) {
			ShoppingCartManager.quantityTextfield.value = qty + '';
			//shoppingCartChangeNotifier();		
			this.onChange();
		}
		/*update tax dropdown*/
		var taxDropDown = $('tax-dropdown');
		if (taxDropDown) {
			taxDropDown.value = currentLine.tax.taxId;
		}
	};
	this.isEmpty = function() {
		return (this.lines == null || this.lines.size() == 0);
	};
	this.initializeShortcuts = function() {
		/*Add shortcut keys to shopping cart*/
		/*
		 * CTRL+UP move up
		 * CTRL+DOWN move down
		 */
		shortcut.add("Ctrl+Up", this.moveUp.bind(this));
		shortcut.add("Ctrl+Down", this.moveDown.bind(this));
	};
	this.moveDown = function() {
		if (this.selectedIndex < (this.lines.values().length - 1)) {
			this.selectedIndex++;
			this.renderLines();
		}
	};
	this.moveUp = function() {
		if (this.selectedIndex > 0) {
			this.selectedIndex--;
			this.renderLines();
		}
	};
	this.onChange = function() {
		alert('onChange not initialized');
	};
	this.getTax = function() {
		return this.tax;
	};
	this.getCurrentLine = function() {
		var line = this.lines.get(this.selectedIndex);
		return line;
	}
	
	this.getLineDetails = function(){
		
		var details = "";
		
		var lines = this.getLines();
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			
			if(i > 0){
				details = details + ", ";
			}
			
			details = details + line.getLineInfo();
		}
		
		return details;
	};
}

var ShoppingCartLine = function(shoppingCart, product, qty) {
	this.shoppingCart = shoppingCart;
	this.product = product;
	this.description = this.product.description;
	this.qty = new BigNumber(qty);
	this.priceEntered = new BigNumber(this.product.pricestd);
	this.priceList = new BigNumber(this.product.pricelist);
	this.tax = this.shoppingCart.getTax();	
	this.modifiers = [];
	/* flag for exchange */
	this.exchangeLine = false;
	/* box number */
	this.boxNo = null;
	/* set editable */
	this.editable = true;
	
	this.discountSrc = null; /* SALESREP, PRODUCT, CUSTOMER */
	
	this.discountOnTotal = new BigNumber(0);
	
	/* assign sales rep*/
	this.salesrep_id = shoppingCart.salesRepId;
	this.timestamp = new Date().getTime();
	
	this.loadBoms = function() {
		var boms = APP.BOM.getBoms(this.product.m_product_id);
		this.boms = [];
		for (var i = 0; i < boms.length; i++) {
			var bom = boms[i];
			var product = APP.PRODUCT.getProductById(bom.bomId);
			
			if(product == null) continue;
			
			var qty = new BigNumber(bom.qty);
			qty = qty.times(this.qty);
			var line = new ShoppingCartLine(this.shoppingCart, product, qty);
			line.bomQty = bom.bomqty;
			this.boms.push(line);
		}
	};
	this.setModifiers = function(modifiers) {
		this.modifiers = [];
		for (var i = 0; i < modifiers.length; i++) {
			var modifier = modifiers[i];
			var product = APP.PRODUCT.getProductById(modifier.productId);
			
			if(product == null) continue;
			
			var qty = new BigNumber(1);
			qty = qty.times(this.qty);
			var line = new ShoppingCartLine(this.shoppingCart, product, qty);
			line.modifier = modifier;
			this.modifiers.push(line);
		}
	};
	
	this.updateModifiers = function(){
		
		var i, modifier;
		
		for (i = 0; i < this.modifiers.length; i++) {
			
			modifier = this.modifiers[i];			
			modifier.qty = new BigNumber(this.qty);	
			modifier.calculateAmt();
		}
		
	};
	
	this.getModifiers = function() {
		return this.modifiers;
	};
	this.setLineId = function(lineId) {
		if(this.shoppingCart.currentBoxNumber != null){
			
			lineId = "" + lineId + ":" + this.shoppingCart.currentBoxNumber;  
			this.boxNo = this.shoppingCart.currentBoxNumber;
		}
		
		this.lineId = lineId;
	};
	this.calculateAmt = function() {
		var taxIncluded = this.shoppingCart.priceListIncludeTax;
		var scale = this.shoppingCart.scale;
		if (!this.tax) {
			/*take tax from product*/
			var taxCategoryId = this.product.c_taxcategory_id;
			var tax = APP.TAX.getTaxByTaxCategoryId(taxCategoryId, this.shoppingCart.isSoTrx);
			this.tax = tax;
		}
		var taxRate = new BigNumber(this.tax.taxRate);
		var priceEntered = new BigNumber(this.priceEntered);
		var priceList = new BigNumber(this.product.pricelist);
		var qtyEntered = new BigNumber(this.qty);
		var baseAmt = priceEntered.times(qtyEntered);
		/* test multiplication error */
		var p = baseAmt.dividedBy(qtyEntered);
		if (p.toFixed(4) != priceEntered.toFixed(4)) {
			console.log("Correcting multiplication error => " + p.toFixed(4) + " != " + priceEntered.toFixed(4));
			baseAmt = priceEntered.times(qtyEntered);
		}
		var taxAmt = null;
		var lineAmt = new BigNumber(0);
		var lineNetAmt = new BigNumber(0);
		if (taxIncluded) {
			lineNetAmt = baseAmt;
			lineAmt = baseAmt.times(100).dividedBy(taxRate.plus(100));
			taxAmt = lineNetAmt.minus(lineAmt);
		} else {
			taxAmt = taxRate.times(baseAmt).dividedBy(100);
			lineAmt = baseAmt;
			lineNetAmt = lineAmt.plus(taxAmt);
		}
		this.discountAmt = new BigNumber(0);
		if (priceList.comparedTo(0) > 0) {
			this.discountAmt = priceList.minus(priceEntered).times(qtyEntered);
		}
		this.lineAmt = lineAmt;
		this.lineNetAmt = lineNetAmt;
		this.taxAmt = taxAmt;
		this.baseAmt = baseAmt;
		/* discount info */
		this.discountMessage = null;
		if (priceList.comparedTo(0) > 0) {
			if (this.discountAmt.comparedTo(0) > 0) {
				var discountPercentage = priceList.minus(priceEntered);
				discountPercentage = discountPercentage.times(100);
				discountPercentage = discountPercentage.dividedBy(priceList);
				this.discountMessage = discountPercentage.toFixed(2) + "% off, Saved(" + this.discountAmt.toFixed(2) + ")";
			}
			if (this.discountAmt.comparedTo(0) < 0) {
				/* check for exchange */
				if (qtyEntered.comparedTo(0) < 0) {
					var discountPercentage = priceList.minus(priceEntered);
					discountPercentage = discountPercentage.times(100);
					discountPercentage = discountPercentage.dividedBy(priceList);
					this.discountMessage = discountPercentage.toFixed(2) + "% off, Saved(" + this.discountAmt.toFixed(2) + ")";
				}
			}
		}
		
		
		var discountCode = null;
		
		/*
		if( this.shoppingCart.discountCode != null && this.discountCode != null ){
			
			if( this.shoppingCart.discountCode.percentage > this.discountCode.percentage ){
				
				discountCode = this.shoppingCart.discountCode;
			}
			else
			{
				discountCode = this.discountCode;
			}
		}
		else
		{
			discountCode = this.shoppingCart.discountCode || this.discountCode;
		}
		*/
		
		
		/* check for discounted price */
		if( this.discountSrc == null &&
			priceEntered.comparedTo( this.product.pricestd ) == 0 &&  
			this.product.pricestd < this.product.pricelist				
				
		){
			this.discountSrc == 'PRODUCT';			
		}
		
		if( this.discountSrc == 'CUSTOMER' ){
			
			discountCode = this.shoppingCart.discountCode;
			
		}
		else if( this.discountSrc == 'PRODUCT' ){
			
			discountCode = this.discountCode;			
		}
		else
		{
			
		}	
		
		
		if( discountCode != null ){
			
			this.discountMessage = discountCode.name + " " + this.discountMessage;
		}
		
		if( discountCode != null ){
			this.u_pos_discountcode_id = discountCode['u_pos_discountcode_id'];
		}
		else
		{
			this.u_pos_discountcode_id = 0;
		}
	};
	this.setDiscountAmt = function(amt, isDiscountOnTotal, amtWithTax) {
		
		this.discountSrc = 'SALESREP';
		
		/*console.log("amt:" + amt + " isDiscountOnTotal:" + isDiscountOnTotal + " amtWithTax:" + amtWithTax);*/
		
		var discountAmt = new BigNumber(amt);		
		
		/* is discount due to discount on grandtotal */
		if( isDiscountOnTotal && isDiscountOnTotal == true) {
			
			var taxIncluded = this.shoppingCart.priceListIncludeTax;
			
			/* previous discount on total given */
			var previousDiscountOnTotal = null;
			
			if(taxIncluded) {
				
				previousDiscountOnTotal = this.discountOnTotal;
				
			}
			else 
			{
				previousDiscountOnTotal = this.discountOnTotalNoTax || new BigNumber(0);
			}
			
			this.discountOnTotal = new BigNumber(amtWithTax);
			this.discountOnTotalNoTax = new BigNumber(amt);
			
			//sum previous discount
			//discountAmt = discountAmt.plus( this.discountAmt ).minus( previousDiscountOnTotal );
		}
		else
		{
			//reset discount on grandtotal
			this.discountOnTotal = new BigNumber(0);
			this.discountOnTotalNoTax = new BigNumber(0);
		}
		
		discountAmt = discountAmt.dividedBy(this.qty).toFixed(2);
		var baseAmt = new BigNumber(this.product.pricelist);
		
		//check if is discount on total
		if( isDiscountOnTotal ){			
			baseAmt = new BigNumber(this.priceEntered);			
		}
		
		baseAmt = baseAmt.minus(discountAmt);
		this.priceEntered = baseAmt;
		this.calculateAmt();
		/*reset discount on total*/
		/*
		this.shoppingCart.resetDiscountOnTotal();
		*/
				
		this.shoppingCart.updateCart();
	};
		
	/* is discount due to discount on grandtotal */
	this.getDiscountOnTotal = function() {		
		//var amt = this.discountOnTotal.times(this.qty);
		//return amt;
		
		return this.discountOnTotal;
		
	};
	
	this.resetLine = function() {
		/* is discount due to discount on grandtotal */
		this.discountOnTotal = new BigNumber(0);
		this.discountOnTotalNoTax = new BigNumber(0);
		
		/* clear discount code */
		this.discountCode = null;
		
		this.discountSrc = null;
		
		this.priceEntered = new BigNumber(this.product.pricestd);
		
		this.calculateAmt();
	};
	
	this.applyDiscountCode = function(discountCode){
		
		if( discountCode == null ){
			this.resetLine();
			return;
		}
		
		/* discount source */
		if( this.shoppingCart.discountCode != null && this.shoppingCart.discountCode['u_pos_discountcode_id'] == discountCode['u_pos_discountcode_id'] ){
			
			this.discountSrc = 'CUSTOMER';
		}
		else
		{
			this.discountSrc = 'PRODUCT';
		}
		
		
		this.discountOnTotal = new BigNumber(0);
		this.discountOnTotalNoTax = new BigNumber(0);
		
		var percentage = new BigNumber(100).minus(discountCode.percentage);
		
		//apply discount code on pricestd and not pricelist
		var discountedPrice = new BigNumber(this.product.pricestd).times(percentage).dividedBy(100);
		
		this.priceEntered = new BigNumber(discountedPrice.toFixed(2));
		this.discountCode = discountCode;
		
		this.calculateAmt();
		
		this.shoppingCart.updateCart();
		
	};
	
	this.getLineInfo = function(){
		return "" + this.qty + "x " + this.product.name + "@" + this.lineNetAmt.toFixed(2);		
	};
	
	this.loadBoms();
	
	/* check for customer discount code */
	if( this.shoppingCart.discountCode != null ){
		
		this.discountCode = this.shoppingCart.discountCode;
		
		var percentage = new BigNumber(100).minus(this.discountCode.percentage);
		
		var discountedPrice = new BigNumber(this.product.pricestd).times(percentage).dividedBy(100);		
		this.priceEntered = new BigNumber(discountedPrice.toFixed(2));
		
	}
	
	this.calculateAmt();
};


/* ================================================================================= */
var ShoppingCartManager = {
	getCart: function() {
		return shoppingCart;
	},
	refreshCart: function() {
		this.getCart().getCart();
	},
	clearCart: function() {
		this.getCart().clearCart();
	},
	getOrderId: function() {
		return this.getCart().orderId;
	},
	getOrderType: function() {
		return this.getCart().orderType;
	},
	getLineId: function() {
		var lineId = null;
		var cart = this.getCart();
		if (!this.isShoppingCartEmpty()) {
			var lines = cart.getLines();
			lineId = lines[cart.selectedIndex].lineId;
		}
		return lineId;
	},
	scrollUp: function() {
		this.getCart().moveUp();
	},
	scrollDown: function() {
		this.getCart().moveDown();
	},
	addToCart: function(productId) {
		if (productId == null) return;
		this.getCart().addToCart(productId, 1);
	},
	incrementQty: function() {
		var lineId = this.getLineId();
		if (lineId == null) return;
		this.getCart().incrementQty(lineId);
	},
	decrementQty: function() {
		var lineId = this.getLineId();
		if (lineId == null) return;
		this.getCart().decrementQty(lineId);
	},
	updateQty: function(qty) {
		var lineId = this.getLineId();
		if (lineId == null) return;
		var cart = this.getCart();
		var lines = cart.getLines();
		var currentLine = lines[cart.selectedIndex];
		var lineId = currentLine.lineId;
		cart.updateQty(lineId, qty);
	},
	splitLines: function(qty) {
		var lineId = this.getLineId();
		if (lineId == null) return;
		var cart = this.getCart();
		var lines = cart.getLines();
		var currentLine = lines[cart.selectedIndex];
		var lineId = currentLine.lineId;
		cart.splitLines(lineId, qty);
	},
	removeFromCart: function() {
		var lineId = this.getLineId();
		if (lineId == null) return;
		this.getCart().removeFromCart(lineId);
	},
	lineQty: function(lineId) {
		if (lineId == null) return;
		this.getCart().selectedIndex = lineId;
		new LineItemPanel().show();
	},
	deleteLine: function(lineId) {
		if (lineId == null) return;
		this.getCart().removeFromCart(lineId);
	},
	setLineTax: function(taxId) {
		var lineId = this.getLineId();
		if (lineId != null && taxId != null) this.getCart().setTax(lineId, taxId);
	},
	setBp: function(bpId) {
		this.getCart().setBp(bpId);
	},
	getGrandTotal: function() {
		return this.getCart().grandTotal;
	},
	getSubTotal: function() {
		return this.getCart().subTotal;
	},
	getDiscountOnTotal: function() {
		return this.getCart().discountOnTotal;
	},
	getTaxTotal: function() {
		return this.getCart().taxTotal;
	},
	getUpsellTotal: function() {
		return this.getCart().upsellTotal;
	},
	getLineNetTotal: function() {
		var lineNetTotal = ShoppingCartManager.getSubTotal() + ShoppingCartManager.getTaxTotal();
		return lineNetTotal;
	},
	getQtyTotal: function() {
		return this.getCart().qtyTotal;
	},
	getCurrencySymbol: function() {
		return this.getCart().currencySymbol;
	},
	isShoppingCartEmpty: function() {
		return this.getCart().isEmpty();
	},
	isShoppingCartReady: function() {
		return true;
	},
	setDiscountOnTotal: function(discountAmt) {
		this.getCart().setDiscountOnTotal(discountAmt);
	},
	setDiscountOnLine: function(discountAmt) {
		var cart = this.getCart();
		var lines = cart.getLines();
		if (lines && lines.length > 0) {
			var lineId = lines[cart.selectedIndex].lineId;
			cart.setDiscountOnLine(lineId, discountAmt);
		}
	},
	/* loop lines for products that needs age verification */
	needAgeVerification: function() {
		var cart = this.getCart();
		var lines = cart.getLines();
		if (lines && lines.length > 0) {
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i];
				if (line.product.isageverified == 'Y') {
					return true;
				}
			}
		}
		return false;
	},
	initializeComponents: function() {
		/*this.scrollUpButton = $('scroll-up-button');
		this.scrollDownButton = $('scroll-down-button');*/
		this.clearButton = $('clear-button');
		this.addButton = $('add-button');
		/*this.decreaseButton = $('decrease-button');
		this.removeButton = $('remove-button');*/
		this.productInfoButton = $('product-info-button');
		this.splitLineButton = $('split-line-button');
		this.quantityTextfield = $('quantity-texfield');
		/* add behaviour */
		/*this.scrollUpButton.onclick = function(e){
			ShoppingCartManager.scrollUp();
		};
			
		this.scrollDownButton.onclick = function(e){
			ShoppingCartManager.scrollDown();
		};*/
		this.clearButton.onclick = function(e) {
			ShoppingCartManager.clearCart();
		};
		/*this.addButton.onclick = function(e){
			ShoppingCartManager.incrementQty();
		};
			
		this.decreaseButton.onclick = function(e){
			ShoppingCartManager.decrementQty();
		};*/
		if (this.removeButton) {
			this.removeButton.onclick = function(e) {
				ShoppingCartManager.removeFromCart();
			};
		}
		if (this.productInfoButton) {
			this.productInfoButton.onclick = function(e) {
				if (ShoppingCartManager.isShoppingCartEmpty()) {
					alert('Cart is empty!');
					return;
				}
				var lines = shoppingCart.getLines();
				var currentLine = lines[shoppingCart.selectedIndex];
				var productId = currentLine.productId;
				new ProductInfoPanel().getInfo(productId);
			};
		}
		if (this.splitLineButton) {
			this.splitLineButton.onclick = function(e) {
				if (ShoppingCartManager.isShoppingCartEmpty()) {
					alert('Cart is empty!');
					return;
				}
				var lines = shoppingCart.getLines();
				var currentLine = lines[shoppingCart.selectedIndex];
				var currentLineQty = currentLine.qty;
				if (currentLineQty == 1) return;
				var qty = window.prompt('Enter qty', '1');
				qty = parseFloat(qty);
				if (isNaN(qty)) {
					alert('Invalid Qty!');
					return;
				}
				if (qty >= currentLineQty) {
					alert('Qty entered must be less than ' + currentLineQty + '!');
					return;
				}
				ShoppingCartManager.splitLines(qty);
			};
		}
		/* add keypad to qty textfield */
		/*Event.observe(this.quantityTextfield,'click',Keypad.clickHandler.bindAsEventListener(Keypad),false);*/
		/* bug fix for updateQtyTextField */
		/*
		this.quantityTextfield.onkeyup = function(e){
			if(e.keyCode == Event.KEY_RETURN){
				if(!ShoppingCartManager.isShoppingCartEmpty()){
					var qty = parseFloat(this.value);						
					if(isNaN(qty)){
						alert('Invalid Qty!');
						this.selectAll();								
						return;					
					}
					ShoppingCartManager.updateQty(qty);							
				}
			}
		}
		*/
	}
};
