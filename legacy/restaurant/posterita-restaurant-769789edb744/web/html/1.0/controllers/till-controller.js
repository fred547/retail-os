angular.module('app').controller("TillController", function($scope, $modal, $location, $timeout, LoginService)
{
	var LANDING_PAGE = "/menu";
	var TERMINAL = LoginService.terminal;
	var ctrl = this;
	var path = $location.path();
	
	//check printers settings
	var settings = localStorage.getItem('#PRINTER-SETTINGS');
	if(settings == null){
		
		$location.path("/hardware-settings").search({
			"nextPage" : path
		});
		
		return;
	}
	
	if (path == '/open-till')
	{
		ctrl.amount = TERMINAL["floatamount"];		
	}
	else
	{
		$scope.showModal();
		var terminal_id = TERMINAL["u_posterminal_id"];	
		
		var preference = TERMINAL["preference"];
		
		ctrl.countExtCard = true;		
		
		if( preference.hasOwnProperty("countExtCardAmount") )
		{
			ctrl.countExtCard = preference["countExtCardAmount"];
		}
		
		Till.getTenderAmounts(terminal_id).done(function(json)
		{
			ctrl.tenderAmounts = json;
			
		}).fail(function(msg)
		{
			$scope.alert(msg);
			
		}).always(function()
		{
			$scope.closeModal();
		});
	}
	
	//hide menu from header
	ctrl.hideMenu = function(){
		jQuery("#menu-dropdown").hide();
	};
	
	ctrl.openTill = function()
	{
		var USER = LoginService.user;
		var user_id = USER["ad_user_id"];
		var terminal_id = TERMINAL["u_posterminal_id"];
		var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
		var cash_amount = ctrl.amount;
		if (cash_amount == null)
		{
			$scope.alert("Please enter cash amount", function()
			{
				$('#cash-amount').select();
			});
			return;
		}
		Till.open(terminal_id, user_id, date, cash_amount).done(function(json)
		{
			// P4-275 print receipt when opening till
			Till.printOpenReceipt(json);
			
			$scope.$apply(function()
			{
				$location.path(LANDING_PAGE);
			});
		}).fail(function(msg)
		{
			$scope.alert(msg);
		});
	};	
	
	ctrl.closeTill = function( syncDraftAndOpenOrders )
	{		
		$scope.confirm("Do you want to close till?", function(result){
			
			if(result == false) return;
			
			var USER = LoginService.user;
			var user_id = USER["ad_user_id"];
			var terminal_id = TERMINAL["u_posterminal_id"];
			var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
			var cash_amount = ctrl.amount;
			var external_card_amount = ctrl.externalCardAmount;
			
			if (cash_amount == null)
			{
				$scope.alert(I18n.t("please.enter.cash.amount"), function()
				{
					$('#cash-amount').select();
				});
				return;
			}
			
			if (external_card_amount == null)
			{
				external_card_amount = 0;
			}
			
			if( !ctrl.countExtCard )
			{
				external_card_amount = ctrl.tenderAmounts.ext_card;
			}
			
			var _closeTill = function( syncDraftAndOpenOrders ){
				
				Till.close(terminal_id, user_id, date, cash_amount, external_card_amount, syncDraftAndOpenOrders).done(function(json)
				{
					Till.printReceipt(json);
					
					//Improvement P4-338 To print two receipt
					// client wongtooyuen does not want duplicate printing
					if( TERMINAL["ad_client_id"] != 10006177 ){
						
						Till.printReceipt(json);
					}				
					
					$scope.info(I18n.t("you.have.successfully.closed.your.till"), function(){
						
						ClockInOut.clockOutAll(terminal_id, date).done(function(msg) {
							
						    $scope.info(msg);
						    
						}).fail(function(msg) {	
							
							$scope.alert(msg);
							
						}).always(function(){
							
							$scope.$apply(function()
							{
								$location.path('/login');
							});
							
						});
						
					});
					
					
				}).fail(function(msg)
				{
					$scope.alert(msg);
				});
				
			};
			
			var syncDraftAndOpenOrders = false;
			
			var draftOrders = ctrl.tenderAmounts.draftOrders;
			var openOrders = ctrl.tenderAmounts.openOrders;
			
			if( draftOrders.length == 0 && openOrders.length == 0 ){
				
				_closeTill(syncDraftAndOpenOrders);
				
				return;
			}
			
			// ask confirmation from user
			$modal.open({
				templateUrl: '/html/popups/sync-draft-and-open-orders.html',
				//size: 'lg',
				//scope : $scope,
				resolve:
				{
					'draftOrders': function()
					{
						return draftOrders;
					},
					
					'openOrders': function()
					{
						return openOrders;
					}
				},
				controllerAs: '$ctrl',
				controller: function($scope, $modalInstance, draftOrders, openOrders)
				{
					var $ctrl = this;
					
					$ctrl.draftOrders = draftOrders;
					$ctrl.openOrders = openOrders;
					
					$ctrl.yes = function(){
						
						$modalInstance.close();
						_closeTill(true);
					};
					
					$ctrl.no = function(){
						
						$modalInstance.close();
						_closeTill(false);
					};
				}
			});
			
		});		
		
	};
	
		
	
	ctrl.openDrawer = function()
	{
		$modal.open(
		{
			templateUrl: '/html/popups/open-cash-drawer.html',
			// size: 'lg',
			//scope : $scope,
			controllerAs: '$ctrl',
			controller: function($scope, $modalInstance)
			{
				$scope.isValid = function()
				{
					var fields = (($scope.username || '') && ($scope.password || '') && ($scope.reason || ''));
					return fields;
				};
								
				$scope.openCashDrawer = function( username,password,reason )
				{
					//var USER = LoginService.user;
					var time = moment().format("YYYY-MM-DD HH:mm:ss");	
										
					var user = APP.USER.getUser( username, password );
					if (!user)
					{
						$scope.alert(I18n.t("invalid.username.password"));
						return;
					}
					
					// check if user
					// is active
					if (user.isactive == 'N')
					{
						$scope.alert(I18n.t("user.deactivated"));
						return;
					}	
										
					var post = {};
					post['action'] = "openDrawer";
					post['user_id'] = user.id;
					post['terminal_id'] = TERMINAL.id;
					post['reason'] = reason;
					post['date_opened'] = time;
					post = JSON.stringify(post);
					jQuery.get("/system?json=" + post,
					{}, function(json, textStatus, jqXHR)
					{
						if (json == null || jqXHR.status != 200)
						{
							console.error("Failed to log open drawer!");
							return;
						}
						if (json.error)
						{
							console.error("Failed to log open drawer! " + json.error);
							return;
						}
					});
					PrinterManager.print([
						['OPEN_DRAWER']
					]);
					
					$modalInstance.close();
				};
			}
		});		
	};
	
	ctrl.denomination = {
			note_2000 : 0,
			note_1000 : 0,
			note_500 : 0,
			note_200 : 0,
			note_100 : 0,
			note_50 : 0,
			note_25 : 0,
					
			coin_20 : 0,
			coin_10 : 0,
			coin_5 : 0,
			coin_1 : 0,
			coin_050 : 0,
			coin_020 : 0,
			coin_005 : 0,
			
			getTotal : function(){
				var total = 0;						
				
				total += this.note_2000 * 2000;
				total += this.note_1000 * 1000;
				total += this.note_500 * 500;
				total += this.note_200 * 200;
				total += this.note_100 * 100;
				total += this.note_50 * 50;
				total += this.note_25 * 25;
				
				total += this.coin_20 * 20;
				total += this.coin_10 * 10;
				total += this.coin_5 * 5;
				total += this.coin_1 * 1;
				total += this.coin_050 * 0.50;
				total += this.coin_020 * 0.20;
				total += this.coin_005 * 0.05;
				
				return total;
			}
	};
	ctrl.showDenominationPopup = function(){		
		
		$modal.open(
			{
				templateUrl: '/html/popups/till-denomination.html',
				// size: 'lg',
				//scope : $scope,
				controllerAs: '$ctrl',
				resolve:
				{
					denomination: function()
					{
						return ctrl.denomination;
					}
				},
				controller: function($scope, $modalInstance, denomination)
				{
					$scope.denomination = denomination;
					
					$scope.getTotal = function(){
						
						$scope.denomination.getTotal();
					};

					$scope.confirmDenomination = function()
					{
						ctrl.amount = $scope.denomination.getTotal();
						
						$modalInstance.close();
					};
					
					$scope.close = function()
					{
						$modalInstance.close();
					};
				}
		});
	};
	
	ctrl.saveCashierControl = function()
	{
		$scope.confirm("Do you want to save cashier control data?", function(result){
			
			if(result == false) return;
			
			var USER = LoginService.user;
			var user_id = USER["ad_user_id"];
			var terminal_id = TERMINAL["u_posterminal_id"];
			var date = DateUtils.getCurrentDate(); //moment().format("YYYY-MM-DD HH:mm:ss");
			var cash_amount = ctrl.amount;
			var external_amount = ctrl.externalCardAmount;
			
			if (cash_amount == null)
			{
				$scope.alert(I18n.t("please.enter.cash.amount"), function()
				{
					$('#cash-amount').select();
				});
				return;
			}
			
			Till.saveCashierControlSheet(terminal_id, user_id, date, cash_amount, external_amount).done(function(json)
			{
				Till.printCashierControlReceipt(json);
				$scope.info(I18n.t("cashier.control.data.successfully.saved"));
				
				$scope.$apply(function()
				{
					$location.path(LANDING_PAGE);
				});
			}).fail(function(msg)
			{
				$scope.alert(msg);
			});
		});
	};
});