var app = angular.module("myApp", ["ui.router", "ngTable"]);

app.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/');
	$stateProvider
	.state('home', {
		url: '/',
		templateUrl: 'home.html',
		controller: 'homeCtrl'
	})
	.state('manual', {
		url: '/manual',
		templateUrl: 'manual.html',
		controller: 'manualCtrl'
	})
	.state('upload', {
		url: '/upload',
		templateUrl: 'upload.html',
		controller: 'uploadCtrl'
	})
	.state('table', {
		url: '/table',
		templateUrl: 'table.html',
		controller: 'tableCtrl',
		params: { data: null }
	})
    
    .state('print', {
		url: '/print',
		templateUrl: 'print.html',
		controller: 'printCtrl',
		params: { data: null }
	});
});

app.service("PrintLabelService", function(){

	let service = this;
	service.data = null;

	service.reset = () => this.data = null;
	service.setData = (data) => this.data = data;
	service.getData = () => this.data;

	service.formatLabel = (language, currency, priceIncludeVat, priceVatFree) => {

		if(PRINTER_LANGUAGE_EPL == language){
			return service._formatLabelForEPL(currency, priceIncludeVat, priceVatFree);
		}
		else if(PRINTER_LANGUAGE_ZPL == language){
			return service._formatLabelForZPL(currency, priceIncludeVat, priceVatFree);
		}
		else
		{
			return "Unknown language";
		}

	};

	service._formatLabelForEPL = (currency, priceIncludeVat, priceVatFree) => {

		const CODE_128 = "1";
		const EAN_13 = "E30";
		const REGEX = /^\d{13}$/g;

		const LEFT_MARGIN = 20;
		const COL_WIDTH = 300; //first column x coor - x2 coor

		const header = `N\n`;
		const footer = `P1\n`;


		function getLabel(Name, Description, Barcode, Price, col){
			
			let offset = (col * COL_WIDTH) + LEFT_MARGIN;

			let barcodeType = /^\d{13}$/.test(Barcode) ? EAN_13 : CODE_128;

			if(currency) Price = currency + ' ' + Price; 

			/*
			A20,20,0,3,1,1,N,"Product A"
			A20,50,0,2,1,1,N,"Description A"
			B20,80,0,1,2,4,40,B,"ABCDEF"
			A20,160,0,3,1,1,N,"Rs 1,000,000.00"
			A260,180,0,3,1,1,N,"VAT Incl."
			*/
			
			let label = "";
			
			if(Description.length <= 20){
				
				label += `A${offset},20,0,3,1,1,N,"${Name}"\n`;
				label += `A${offset},50,0,2,1,1,N,"${Description}"\n`;
			}
			else
			{
				let desc1 = Description.substr(0,25);
				let desc2 = Description.length > 50 ? Description.substr(25,25) : Description.substr(25);
				
				label += `A${offset},15,0,3,1,1,N,"${Name}"\n`;
				label += `A${offset},35,0,1,1,1,N,"${desc1}"\n`;
				label += `A${offset},55,0,1,1,1,N,"${desc2}"\n`;
			}		

			
			label += `B${offset},80,0,${barcodeType},2,4,40,B,"${Barcode}"\n`;
			label += `A${offset},160,0,3,1,1,N,"${Price}"\n`;

			if(priceIncludeVat){
				label += `A${offset + 140},180,0,2,1,1,N,"VAT Incl."\n`;
			}
			
			if(priceVatFree){
				label += `A${offset + 140},180,0,2,1,1,N,"VAT Nil."\n`;
			}

			return label;
		}		

		

		let template;
		let count = 0;
		let column = 2;
		
		let printData = '';
		let mod;
		let closed = false;

		for(let i=0; i<this.data.length; i++){

			let {Name, Description, Barcode, Price, Qty} = this.data[i];

			for(let j=0; j<Qty; j++){

				mod = count % column;

				if(mod == 0){					
					printData += header;
					closed = false;
				}

				printData += getLabel(Name, Description, Barcode, Price, mod);

				if(mod == 1){
					printData += footer;
					closed = true;
				}

				count ++;

			}
		}

		if(!closed){
			printData += footer;
		}

		return {printData, count};

	};

	service._formatLabelForZPL = (currency, priceIncludeVat, priceVatFree) => {
		
		const CODE_128 = "^BCN,,Y,N,N,A";
		const EAN_13 = "^BEN,,Y,N";
		const REGEX = /^\d{13}$/g;

		const LEFT_MARGIN = 30;
		const COL_WIDTH = 443; //first column x coor - x2 coor

		const header = `
			^XA
			^MMT
			^PW856
			^LL0295
			^LS0			
			`;
		const footer = `
			^XZ
			`;


		function getLabel(Name, Description, Barcode, Price, col){
			
			let offset = (col * COL_WIDTH) + LEFT_MARGIN;

			let barcodeType = REGEX.test(Barcode) ? EAN_13 : CODE_128;

			if(currency) Price = currency + ' ' + Price;

			if(priceIncludeVat) Price = Price + ' VAT Incl.'; 

			if(priceVatFree) Price = Price + ' VAT Nil.'; 

			let label = `
			^FT${ offset },51^A0N,33,33^FH\^FD${Name}^FS
			^FT${ offset },97^A0N,33,28^FH\^FD${Description}^FS
			^BY3,2,81
			^FT${ offset },196${barcodeType}
			^FD${Barcode}^FS
			^FT${ offset },272^A0N,42,40^FH\^FD${Price}^FS`;

			return label;
		}		

		

		let template;
		let count = 0;
		let column = 2;
		
		let printData = '';
		let mod;
		let closed = false;

		for(let i=0; i<this.data.length; i++){

			let {Name, Description, Barcode, Price, Qty} = this.data[i];

			for(let j=0; j<Qty; j++){

				mod = count % column;

				if(mod == 0){					
					printData += header;
					closed = false;
				}

				printData += getLabel(Name, Description, Barcode, Price, mod);

				if(mod == 1){
					printData += footer;
					closed = true;
				}

				count ++;

			}
		}

		if(!closed){
			printData += footer;
		}

		return {printData, count};

		
	};

});

app.controller("homeCtrl", function($scope, $state) {
});

app.controller("manualCtrl", function($scope, $state, PrintLabelService) {

	//Name,Description,Barcode,Price,Qty,Stock,Custom

	var data = PrintLabelService.getData() || [];
	$scope.$data = data;

	$scope.deleteRow = function(index){
		data.splice(index, 1);
	};

	$scope.next = function(){

		if(data.length == 0){
			alert('Please add some data!');
			return;
		}

		PrintLabelService.setData(data);

		$state.go('table');
	};

	$scope.addRow = function(){
		data.push({
			"Name" : "",
			"Description" : "",
			"Barcode" : "",
			"Price" : "0",
			"Qty" : "1"
		});
	};

	$scope.edit = function(row, key){
		console.log(`${row} -> ${key}`);
		row[key] = "updated";
	};

});

app.controller("uploadCtrl", function($scope, $state, PrintLabelService) {

	$scope.downloadTemplate = function(){
		window.location.href = "template.csv";
	};

	PrintLabelService.setData(null);

	$scope.submitForm = function() {
		var fileInput = document.getElementById('csv-file');


		if(fileInput.value == '' || !fileInput.value.endsWith('.csv') ){
			//alert('Please select a csv file!');

			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				text: 'Please select a csv file!',
				//footer: '<a href="">Why do I have this issue?</a>'
			  })

			return;
		}


		Papa.parse(fileInput.files[0], {
			header: true,
			dynamicTyping: false,
            skipEmptyLines: true,
			complete: function(results) {

				//validate data
				//check for columns
				//name, description, barcode, price, qty
				let data = results.data;
				let row = data[0];

				if(Object.keys(row).toString() != "Name,Description,Barcode,Price,Qty"){

					Swal.fire({
						icon: 'error',
						title: 'Invalid file',
						text: 'File must have 5 columns! The columns must be in the following order. Name, Description, Barcode, Price, Qty',
						//footer: 'The columns must be in the following order. Name, Description, Barcode, Price, Qty'
					  })

					//alert("Invalid file. File must have 5 columns! The columns must be in the following order. Name, Description, Barcode, Price, Qty");
					return;
				}

				$scope.$apply(function() {
					PrintLabelService.setData(results.data);
					$state.go('table');
				});
			},
			error: function() {
				alert('Error parsing file');
			}
		});
	};
});

app.controller("tableCtrl", function($scope, $state, NgTableParams, PrintLabelService) {
	const data = PrintLabelService.getData();

	if(data == null){
		$state.go('upload');
		return;
	}

	$scope.data = data;
	$scope.tableParams = new NgTableParams({}, { dataset: $scope.data });

    $scope.next = function(){
        $state.go('print');
    };

	$scope.back = function(){
        $state.go('upload');
    };
});

const PRINTER_LANGUAGE_ZPL = "ZPL";
const PRINTER_LANGUAGE_EPL = "EPL";



app.controller("printCtrl", function($scope, $state, PrintLabelService) {

	const data = PrintLabelService.getData();

	if(data == null){
		$state.go('upload');
		return;
	}

	if(!window.PosteritaBridge){
		window.PosteritaBridge = {
			getPrintersAsJSON : () => '["Printer 1", "Printer 2", "Printer 3"]',
			addJob : (printer, job) => {
				console.log(printer, job);
			}
		};
	}

	//$scope.printers = ["Printer 1", "Printer 2", "Printer 3"];

	$scope.printers = JSON.parse(window.PosteritaBridge.getPrintersAsJSON());
	$scope.printerLanguages = [PRINTER_LANGUAGE_EPL, PRINTER_LANGUAGE_ZPL];

	$scope.selectedPrinter = $scope.printers.includes(localStorage["Printer"]) ?  localStorage["Printer"] : $scope.printers[0];
	$scope.selectedPrinterLanguage = localStorage["PrinterLanguage"] || $scope.printerLanguages[0];

	$scope.priceIncludeVat = false;
	$scope.priceVatFree = false;

	$scope.currency = "Rs";
	$scope.printLabel = function() {

		
		//configure printer
		let config = `<xpml><page quantity='0' pitch='25.4 mm'></xpml>
		SIZE 72.2 mm, 25.4 mm
		GAP 3 mm, 0 mm
		SET RIBBON OFF
		DIRECTION 0,0
		REFERENCE 0,0
		OFFSET 0 mm
		SET PEEL OFF
		SET CUTTER OFF
		<xpml></page></xpml>
		<xpml><page quantity='1' pitch='25.4 mm'></xpml>
		SET TEAR ON
		CLS
		<xpml></page></xpml>
		<xpml><end/></xpml>`;		

		window.PosteritaBridge.addJob($scope.selectedPrinter, config);

		let { printData, count } = PrintLabelService.formatLabel($scope.selectedPrinterLanguage, $scope.currency, $scope.priceIncludeVat, $scope.priceVatFree);

		window.PosteritaBridge.addJob($scope.selectedPrinter, printData);
		
		
		Swal.fire({
			icon: 'success',
			title: `Printing ${count} ${ count > 1 ? 'labels' : 'label'}`,
			text: 'Print job sent to printer',
			//footer: 'The columns must be in the following order. Name, Description, Barcode, Price, Qty'
		  })

		  localStorage["PrinterLanguage"] = $scope.selectedPrinterLanguage; // add to history
		  localStorage["Printer"] = $scope.selectedPrinter;
	};

	$scope.calibratePrinter = function(){

		try {

			//print only first label

			let testData = {...data[0]};
			testData.Qty = 1;

			PrintLabelService.setData([testData]);

			$scope.printLabel();
			
		} catch (error) {
			
		}
		finally
		{
			//restore data
			PrintLabelService.setData(data);
		}

		

		

	};

	$scope.uploadCSV = function(){
        $state.go('upload');
    };
});
