angular.module('app').config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

	$stateProvider.state('splash', {
		controller: 'SplashController',
		templateUrl: 'pages/splash.html',
		url:'/splash'
	});

	$stateProvider.state('menu', {
		templateUrl: 'pages/menu.html',
		controller: 'MenuController',
		controllerAs: 'ctrl',
		url:'/menu'
	});

	$stateProvider.state('login', {
		templateUrl: 'pages/login.html',
		controller: 'LoginController',
		controllerAs: 'ctrl',
		url:'/login'
	});

	$stateProvider.state('order-screen', {
		templateUrl: 'pages/order-screen.html',
		controller: 'OrderScreenController',
		controllerAs: 'ctrl',
		params: {
			action : null,
			order : null,
			commandInfo : null,
			uuid : null
		},
		url:'/order-screen'
	});

	$stateProvider.state('view-order', {
		templateUrl: 'pages/view-order.html',
		controller: 'ViewOrderController',
		controllerAs: 'ctrl',
		params: {
			order : null
		},
		url:'/view-order'
	});

	$stateProvider.state('order-history', {
		templateUrl: 'pages/order-history.html',
		controller: 'OrderHistoryController',
		controllerAs: 'ctrl',
		url:'/order-history'
	});

	$stateProvider.state('close-till', {
		templateUrl: 'pages/close-till.html',
		controller: 'TillController',
		controllerAs: 'ctrl',
		url:'/close-till'
	});

	$stateProvider.state('open-till', {
		templateUrl: 'pages/open-till.html',
		controller: 'TillController',
		controllerAs: 'ctrl',
		url:'/open-till'
	});

	$stateProvider.state('clock-in-out-report', {
		templateUrl: 'pages/clock-in-out-report.html',
		controller: 'ClockInClockOutReportController',
		controllerAs: 'ctrl',
		url:'/clock-in-out-report'
	});

	$stateProvider.state('close-till-report', {
		templateUrl: 'pages/close-till-report.html',
		controller: 'CloseTillReportController',
		controllerAs: 'ctrl',
		url:'/close-till-report'
	});

	$stateProvider.state('price-change-report', {
		templateUrl: 'pages/price-change-report.html',
		controller: 'PriceChangeReportController',
		controllerAs: 'ctrl',
		url:'/price-change-report'
	});

	$stateProvider.state('daily-item-sales-report', {
		templateUrl: 'pages/daily-item-sales-report.html',
		controller: 'DailyItemSalesReportController',
		controllerAs: 'ctrl',
		url:'/daily-item-sales-report'
	});

	$stateProvider.state('hardware-settings', {
		templateUrl: 'pages/hardware-settings.html',
		controller: 'HardwareSettingsController',
		controllerAs: 'ctrl',
		url:'/hardware-settings'
	});

	$stateProvider.state('contact', {
		templateUrl: 'pages/contact.html',
		controller: 'contactController',
		controllerAs: 'ctrl',
		url:'/contact'
	});

	$stateProvider.state('stock-transfer', {
		templateUrl: 'pages/stock-transfer.html',
		controller: 'StockTransferController',
		controllerAs: 'ctrl',
		params: {
			'transferType' : null
		},
		url:'/stock-transfer'
	});

	$stateProvider.state('import-customer', {
		templateUrl: 'pages/import-customer.html',
		controller: 'ImportCustomerController',
		controllerAs: 'ctrl',
		url:'/import-customer'
	});

	$stateProvider.state('backoffice-item', {
		templateUrl: 'pages/backoffice-product.html',
		controller: 'ProductBackofficeController',
		controllerAs: 'ctrl',
		url:'/backoffice-item'
	});

	$stateProvider.state('receive-item', {
		templateUrl: 'pages/receive-item.html',
		controller: 'ReceiveStockController',
		controllerAs: 'ctrl',
		url:'/receive-item'
	});

	$stateProvider.state('view-receive-item', {
		templateUrl: 'pages/view-receive-item.html',
		controller: 'ViewReceiveStockController',
		controllerAs: 'ctrl',
		params: {
			'movementId' : null
		},
		url:'/view-receive-item'
	});

	$stateProvider.state('exchange-order', {
		templateUrl: 'pages/exchange-order.html',
		controller: 'ExchangeOrderController',
		controllerAs: 'ctrl',
		url:'/exchange-order'
	});

	$stateProvider.state('daily-sales-receipt', {
		templateUrl: 'pages/daily-sales-receipt.html',
		controller: 'DailySalesReceiptController',
		controllerAs: 'ctrl',
		url:'/daily-sales-receipt'
	});

	$stateProvider.state('purchase', {
		templateUrl: 'pages/purchase.html',
		controller: 'PurchaseController',
		controllerAs: 'ctrl',
		url:'/purchase'
	});

	$stateProvider.state('view-purchase', {
		templateUrl: 'pages/view-purchase.html',
		controller: 'ViewPurchaseController',
		controllerAs: 'ctrl',
		url:'/view-purchase'
	});

	$stateProvider.state('purchase-history', {
		templateUrl: 'pages/purchase-history.html',
		controller: 'PurchaseHistoryController',
		controllerAs: 'ctrl',
		url:'/purchase-history'
	});

	$stateProvider.state('cashier-control', {
		templateUrl: 'pages/cashier-control.html',
		controller: 'TillController',
		controllerAs: 'ctrl',
		url:'/cashier-control'
	});

	$stateProvider.state('quotation', {
		templateUrl: 'pages/quotation-screen.html',
		controller: 'QuotationController',
		controllerAs: 'ctrl',
		url:'/quotation'
	});

	$stateProvider.state('view-quotation', {
		templateUrl: 'pages/view-quotation.html',
		controller: 'ViewQuotationController',
		controllerAs: 'ctrl',
		url:'/view-quotation'
	});

	$urlRouterProvider.otherwise('/splash');
	
	/* additional routes */
	/* customisation for multiple terminals */
	$stateProvider.state('second-splash', {
		controller: 'SecondSplashController',
		templateUrl: 'pages/splash.html',
		url:'/second-splash'
	});
	
	$stateProvider.state('terminal', {
		controller: 'TerminalController',
		templateUrl: 'pages/terminal.html',
		url:'/terminal',
		controllerAs: 'ctrl'
	});
	
	/* restaurant controllers */
	$stateProvider.state('choose-order-type', {
		controller: 'ChooseOrderTypeController',
		templateUrl: 'pages/choose-order-type.html',
		url:'/choose-order-type',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('printer-logs', {
		controller: 'PrinterLogsController',
		templateUrl: 'pages/printer-logs.html',
		url:'/printer-logs',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('restaurant-logs', {
		controller: 'RestaurantLogsController',
		templateUrl: 'pages/restaurant-logs.html',
		url:'/restaurant-logs',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('items-ordered-logs', {
		controller: 'ItemsOrderedLogsController',
		templateUrl: 'pages/items-ordered-logs.html',
		url:'/items-ordered-logs',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('kitchen-order-logs', {
		controller: 'KitchenOrderLogsController',
		templateUrl: 'pages/kitchen-order-logs.html',
		url:'/kitchen-order-logs',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('take-aways', {
		controller: 'TakeAwayHistoryController',
		templateUrl: 'pages/take-aways.html',
		url:'/take-aways',
		controllerAs: 'ctrl'
	});	
				
	
	$stateProvider.state('tables', {
		controller: 'TableController',
		templateUrl: 'pages/tables.html',
		url:'/tables',
		controllerAs: 'ctrl'
	});	

}]);