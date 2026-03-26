var OnlineService = {
		call : function(url, post, errorMessage){
			
			//jQuery.blockUI({ message: '<h1>' + I18n.t('Please wait ...') + '</h1>' });
			
			var timeout = setTimeout(function() {
				
				onTimeout();
				
		    }, 1000 * 60 * 2 ); // 
			
			var onTimeout = function(){
								
				ajax.abort();
				
				console.log('Connection timeout');
			};
			
			var dfd = new jQuery.Deferred();
			
			var ajax = jQuery.post(url,
	    		{ json : post},
	    		function(json, textStatus, jqXHR){	
	    			
	    			//jQuery.unblockUI();
	    			
	    			clearTimeout( timeout );
	    			
	    			if(json == null || jqXHR.status != 200){
	    				dfd.reject(errorMessage); 
	    				return;
	    			}  
	    			
	    			if(json.error){
	    				dfd.reject(json.error);
	    				return;
	    			}
	    			
	    			dfd.resolve(json); 	    			
	    			
	    		},
			"json").fail(function( jqXHR, textStatus, errorThrown ){
				
				//jQuery.unblockUI();
				
				clearTimeout( timeout );
				
				if( 'abort' == textStatus )
				{
					dfd.reject(errorMessage + " Connection timeout.");
				} 
				else
				{
					dfd.reject(errorMessage);
				}
			});
			
			return dfd;
		}
};

var BPService = jQuery.extend({	
	create : function(post){		
		var url = "/service/BP/create";
		var errorMessage = "Failed to save customer!";		
		return this.call(url, post, errorMessage);
	},
	get : function(post){		
		var url = "/service/BP/get";
		var errorMessage = "Failed to get customer!";		
		return this.call(url, post, errorMessage);
	},
	searchCMS : function(post){		
		var url = "/service/BP/searchCMS";
		var errorMessage = "Failed to search cms!";		
		return this.call(url, post, errorMessage);
	}
}, OnlineService);


var CreditService = jQuery.extend({	
	validatePaymentAmount : function(post){		
		var url = "/service/Credit/validatePaymentAmount";
		var errorMessage = "Failed to query credit status!";			
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var GiftCardService = jQuery.extend({
	validatePaymentAmount : function(post){		
		var url = "/service/GiftCard/validatePaymentAmount";
		var errorMessage = "Failed to query gift card status!";	
		return this.call(url, post, errorMessage);
	},
	
	issue : function(post){		
		var url = "/service/GiftCard/issue";
		var errorMessage = "Failed to issue gift card!";
		return this.call(url, post, errorMessage);
		
	},
	
	balance : function(post){		
		var url = "/service/GiftCard/balance";
		var errorMessage = "Failed to query gift card balance!";
		return this.call(url, post, errorMessage);
		
	},
	
	reload : function(post){		
		var url = "/service/GiftCard/reload";
		var errorMessage = "Failed to reload gift card balance!";
		return this.call(url, post, errorMessage);
	},
	
	redeem : function(post){		
		var url = "/service/GiftCard/redeem";
		var errorMessage = "Failed to redeem gift card!";
		return this.call(url, post, errorMessage);
	},
	
	refundBalance : function(post){		
		var url = "/service/GiftCard/refundBalance";
		var errorMessage = "Failed to refund gift card balance!";
		return this.call(url, post, errorMessage);
	}
	
	
}, OnlineService);


var MercuryHFService = jQuery.extend({
	OTK : function(post){
		var url = "/service/MercuryHF/OTK";
		var errorMessage = "Failed to load Payment form!";
		return this.call(url, post, errorMessage);
	}
}, OnlineService);


var OnlineOrderService = jQuery.extend({
	checkout : function(post){
		var url = "/service/v2/Order/checkout";
		var errorMessage = "Failed to checkout order!";
		return this.call(url, post, errorMessage);
	},
	voidOrder : function(post){
		var url = "/service/v2/Order/voidOrder";
		var errorMessage = "Failed to void order!";
		return this.call(url, post, errorMessage);
	},
	synchronizeDraftOrder : function(post){
		var url = "/service/v2/Order/synchronizeDraftOrder";
		var errorMessage = "Failed to synchronize draft order!";
		return this.call(url, post, errorMessage);
	},
	invokeOrder : function(post){
		var url = "/service/v2/Order/invokeOrder";
		var errorMessage = "Failed to invoke order!";
		return this.call(url, post, errorMessage);
	},
	splitOrder : function(post){
		var url = "/service/v2/Order/splitOrder";
		var errorMessage = "Failed to split order!";
		return this.call(url, post, errorMessage);
	},
	searchOrder : function(post){
		var url = "/service/v2/Order/searchOrder";
		var errorMessage = "Failed to search order!";
		return this.call(url, post, errorMessage);
	},
	invokeQuotation : function(post){
		var url = "/service/v2/Order/invokeQuotation";
		var errorMessage = "Failed to invoke quotation!";
		return this.call(url, post, errorMessage);
	},
	addComment : function(post){
		var url = "/service/v2/Order/addComment";
		var errorMessage = "Failed to add comment!";
		return this.call(url, post, errorMessage);
	},
}, OnlineService);


var PaymentService = jQuery.extend({
	create : function(post){
		var url = "/service/v2/Payment/create";
		var errorMessage = "Failed to create payment!";
		return this.call(url, post, errorMessage);
	}
}, OnlineService);


var ProductService = jQuery.extend({
	stock : function(post){
		var url = "/service/Product/stock";
		var errorMessage = "Failed to query stock!";
		return this.call(url, post, errorMessage);
	}
}, OnlineService);


var SupportService = jQuery.extend({
	request : function(post){
		var url = "/service/Support/request";
		var errorMessage = "Failed to send support request!";
		return this.call(url, post, errorMessage);
	}
}, OnlineService);


var VoucherService = jQuery.extend({	
	validatePaymentAmount : function(post){		
		var url = "/service/Voucher/validatePaymentAmount";
		var errorMessage = "Failed to validate voucher!";			
		return this.call(url, post, errorMessage);
	},
	
	validateVoucher : function(post){		
		var url = "/service/Voucher/validateVoucher";
		var errorMessage = "Failed to validate voucher!";			
		return this.call(url, post, errorMessage);
	}
}, OnlineService);

var LoyaltyService = jQuery.extend({	
	validatePaymentAmount : function(post){		
		var url = "/service/Loyalty/validatePaymentAmount";
		var errorMessage = "Failed to validate loyalty!";			
		return this.call(url, post, errorMessage);
	},
	
	getLoyaltyInfo : function(post){		
		var url = "/service/Loyalty/getLoyaltyInfo";
		var errorMessage = "Failed to get loyalty!";			
		return this.call(url, post, errorMessage);
	}
}, OnlineService);

var StockService = jQuery.extend({
	transfer : function(post){
		var url = "/service/Stock/transfer";
		var errorMessage = "Failed to process stock transfer request!!";
		return this.call(url, post, errorMessage);
	},
	
	inventoryAvailable : function(post){
		var url = "/service/Stock/inventoryAvailable";
		var errorMessage = "Failed to process inventory available request!!";
		return this.call(url, post, errorMessage);
	},
	receiveStockList : function(post){
		var url = "/service/Stock/receiveStockList";
		var errorMessage = "Failed to get stock list!!";
		return this.call(url, post, errorMessage);
	},
	
	receiveStockDocument : function(post){
		var url = "/service/Stock/receiveStockDocument";
		var errorMessage = "Failed to get receive stock document!!";
		return this.call(url, post, errorMessage);
	},
	
	completeStock : function(post){
		var url = "/service/Stock/completeStock";
		var errorMessage = "Failed to complete stock!!";
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var CouponService = jQuery.extend({
	redeem : function(post){		
		var url = "/service/Coupon/redeem";
		var errorMessage = "Failed to validate coupon!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var PromotionService = jQuery.extend({
	getPromotionInfo : function(post){		
		var url = "/service/Promotion/getPromotionInfo";
		var errorMessage = "Failed to load promotions!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var CurrentTillService = jQuery.extend({
	getDailySalesReceipt : function(post){		
		var url = "/service/CurrentTill/getDailySalesReceipt";
		var errorMessage = "Failed to load daily sales receipt!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var OnlinePurchaseService = jQuery.extend({
	create : function(post){		
		var url = "/service/Purchase/create";
		var errorMessage = "Failed to create purchase!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var DepositService = jQuery.extend({
	issue : function(post){		
		var url = "/service/Deposit/issue";
		var errorMessage = "Failed to issue deposit!";	
		return this.call(url, post, errorMessage);
	},
	
	redeem : function(post){		
		var url = "/service/Deposit/redeem";
		var errorMessage = "Failed to redeem deposit!";	
		return this.call(url, post, errorMessage);
	},
	
	refund : function(post){		
		var url = "/service/Deposit/refund";
		var errorMessage = "Failed to refund deposit!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);

var QuotationService = jQuery.extend({
	voidQuotation : function(post){		
		var url = "/service/Quotation/voidQuotation";
		var errorMessage = "Failed to void quotation!";	
		return this.call(url, post, errorMessage);
	}
	
}, OnlineService);


/*
var XXXService = jQuery.extend({
	
}, OnlineService);
*/