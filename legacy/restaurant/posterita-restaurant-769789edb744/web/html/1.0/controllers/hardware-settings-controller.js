angular.module('app').controller("HardwareSettingsController", function($scope, $http, $location, $timeout, $window )
{
	var ctrl = this;
	var settings = localStorage.getItem('#PRINTER-SETTINGS');
	if (settings == null || settings == '')
	{
		ctrl.settings = {
			enable: false,
			implementation: 'Posteria Print',
			printer: "",
			ip: "",
			width: 54,
			
			enable_pole : false,
			pole: "",
			/* restaurant */
			kitchen_printers : [
				
			] /* { 'ip': 'x.x.x.x', name:'Bar' }*/
		};
	}
	else
	{
		ctrl.settings = JSON.parse(settings);
	}
	
	var serverPrint  = localStorage.getItem('print-via-server') || 'N';
	
	if( $window.PosteritaBridge && serverPrint == 'N')
	{
		var list = $window.PosteritaBridge.getPrintersAsJSON();		
		ctrl.printers = JSON.parse(list);
	}
	else
	{	
		$http.get("/printing?action=getPrinters").then(function(response)
		{
			ctrl.printers = response.data;
		});
	}
	
	ctrl.isPrinterValid = function()
	{
		if(!ctrl.settings['enable']){
			return true;
		}
		
		if (ctrl.settings.implementation == 'Posteria Print')
		{
			if (ctrl.settings.printer == null || ctrl.settings.printer.length == 0)
			{
				$scope.alert(I18n.t("please.select.a.printer"), function()
				{
					$('#printer-name').select();
				});
				return false;
			}
		}
		else
		{
			if (ctrl.settings.ip == null || ctrl.settings.ip.length == 0)
			{
				$scope.alert(I18n.t("printer.ip.address.is.required"), function()
				{
					$('#printer-ip').select();
				});
				return false;
			}
		}
		if (ctrl.settings.width == null || ctrl.settings.ip.width < 0)
		{
			$scope.alert(I18n.t("please.enter.a.valid.printer.width"), function()
			{
				$('#printer-line-width').select();
			});
			return false;
		}
		return true;
	};
	ctrl.testPrinter = function()
	{
		if (ctrl.isPrinterValid())
		{
			var configuration = {};
			configuration.PRINTER_IMPLEMENTATION = ctrl.settings['implementation'];
			configuration.IP_ADDRESS = ctrl.settings['ip'];
			configuration.LINE_WIDTH = ctrl.settings['width'];
			configuration.PRINTER_NAME = ctrl.settings['printer'];
			configuration.ENABLE = ctrl.settings['enable'];
			
			// TODO launch test print
			PrinterManager.printTestPage(configuration);
			
			/*restaurant*/
			if( ctrl.settings.kitchen_printers )
			{
				var printers = ctrl.settings.kitchen_printers;
				var printer_ip, printer_name;
				
				for(var i=0; i<printers.length; i++)
				{
					printer_ip = printers[i]['ip'];
					printer_name = printers[i]['name'];
					
					var printFormat = [];
					printFormat.push(['FEED']);
					printFormat.push(['CENTER']);
					printFormat.push(['H1','* Test Kitchen Printer *']);
					printFormat.push(['H1','========================']);
					printFormat.push(['H1','Printer: ' + printer_name]);
					printFormat.push(['H1','IP : ' + printer_ip]);
					printFormat.push(['H1','========================']);
					printFormat.push(['FEED']);
					printFormat.push(['FEED']);
					printFormat.push(['PAPER_CUT']);
										
					HTTP_Printer.print( printer_ip, POSTERITA_Printer.format(printFormat) ).done(function(msg){
						
					}).fail(function(error){
						
						$scope.alert(error);
						
					}).always(function(){
						
					});
				}
			}
			/*restaurant*/
		}
	};
	
	ctrl.isPoleDisplayValid = function(){
		
		if(!ctrl.settings['enable_pole']){
			return true;
		}
		
		if (ctrl.settings.pole == null || ctrl.settings.pole.length == 0)
		{
			$scope.alert(I18n.t("please.select.a.pole.display"), function()
			{
				$('#pole-name').select();
			});
			return false;
		}
		
		return true;
	};
	
	ctrl.testPoleDisplay = function(){
		
		if(ctrl.isPoleDisplayValid())
		{
			POLE_DISPLAY.printTestData();
		}
	};
	
	ctrl.save = function()
	{
		if (ctrl.isPrinterValid() && ctrl.isPoleDisplayValid())
		{
			localStorage.setItem('#PRINTER-SETTINGS', JSON.stringify(ctrl.settings));
			
			$scope.info(I18n.t("settings.saved"), function(){
				
				var search = $location.search();
				
				if( search.nextPage ){
					$location.path(search.nextPage).search({});
				}
			});	
		}
	};
	
	if( $location.search().nextPage ){
		$timeout(function(){
			jQuery('#menu-dropdown').hide()
		}, 500);
	}
	
	/*restaurant*/
	ctrl.addKitchenPrinter = function(){
		
		if( !ctrl.settings.kitchen_printers )
		{
			ctrl.settings.kitchen_printers = [];
		}
		
		ctrl.settings.kitchen_printers.push({'name':'', 'ip':''});
		
	};
	/*restaurant*/
	
});
