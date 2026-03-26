angular.module('app').controller("OrderHistoryController", function($scope, $modal, $state, $window, $http, OrderService, CustomerService) {
	var ctrl = this;
	//ctrl.customers = APP.BP.getCustomers({});
	ctrl.salesReps = APP.USER.searchUsers({});

	ctrl.searchCustomers = function(searchTerm) {
		var customers = CustomerService.searchCustomer(searchTerm);
		return customers;
	}

	$scope.params = {
		dateFrom: "",
		dateTo: "",
		documentNo: "",
		customerId: "",
		salesRepId: "",
		paymentRule: "",
		docStatus: "",
		date1: null,
		date2: null
	};

	$scope.getParameter = function(name) {

		return $scope.params[name];

	};

	$scope.renderReport = function() {

		$scope.report = jQuery('#order_table').DataTable({

			"bServerSide": true,
			"sPaginationType": "full_numbers",
			"searching": false,
			"ordering": false,
			"lengthChange": false,
			"pageLength": 12,

			"fnServerParams": function(aoData) {
				aoData.push({
					"name": "dateFrom",
					"value": $scope.getParameter("dateFrom")
				}); //date from
				aoData.push({
					"name": "dateTo",
					"value": $scope.getParameter("dateTo")
				}); //date to
				aoData.push({
					"name": "documentNo",
					"value": $scope.getParameter("documentNo")
				}); //document no
				aoData.push({
					"name": "customerId",
					"value": $scope.getParameter("customerId")
				}); //customer
				aoData.push({
					"name": "salesRepId",
					"value": $scope.getParameter("salesRepId")
				}); //salesrep
				aoData.push({
					"name": "paymentRule",
					"value": $scope.getParameter("paymentRule")
				}); //payment rule
				aoData.push({
					"name": "docStatus",
					"value": $scope.getParameter("docStatus")
				}); //doc status
			},

			"sAjaxSource": "/orderHistory",

			"fnPreDrawCallback": function() {},
			"columns": [{
					"data": "dateOrdered"
				},
				{
					"data": "orderType"
				},
				{
					"data": "documentNo"
				},
				{
					"data": "docAction"
				},
				{
					"data": "bpName"
				},
				{
					"data": "tenderType"
				},
				{
					"data": "grandTotal"
				}
			],
			"columnDefs": [{
					"render": function(data, type, row) {
						return moment(data).format("DD-MMM-YYYY, HH:mm");
					},
					"targets": 0
				},

				{
					"render": function(data, type, row) {
						/* restaurant */
						var order = row;
						var info = order['commandInfo'];

						if (info) {

							if (info['type'] == 'D') {
								return "Table #" + info['tableId'];
							} else {
								return "Take-Away #" + info['takeAwayId'];
							}

						} else {
							if (data == "POS Order") {
								return "Sales";
							} else {
								return "Return";
							}
						}

					},
					"targets": 1
				},

				{
					"render": function(data, type, row) {

						var status = row["status"];
						var uuid = row["uuid"];

						var html = "<a href='javascript:void(0);' onclick='$$viewOrder(\"" + uuid + "\")'>" + data + "</a>";

						if (status == 'DR' || status == 'IP') {
							html += '<img src="images/icon_inqueue.gif" title="Queued">';
						}

						if (status == 'CO') {
							html += '<img src="images/icon_success.gif" title="Synchronized">';
						}

						if (status == 'ER') {
							html += '<img src="images/icon_error.gif" title="' + row.errormsg + '">';
						}

						return html;

					},
					"targets": 2
				},

				{
					"render": function(data, type, row) {
						return {
							'CO': 'Completed',
							'DR': 'Drafted',
							'VO': 'Voided'
						} [data];
					},
					"targets": 3
				},
				
				{
					"render": function(data, type, row) {
						return data == 'Emtel Money' ? 'Blink' : data;
					},
					"targets": 5
				}
			]
		});

	};

	$window.$$viewOrder = function(uuid) {

		$scope.showModal();

		$http.get('/json/orders/' + uuid).then(function(response) {

			$scope.closeModal();

			var order = response.data;

			//check assigned to an open table
			if (order.docAction == 'DR' && order.commandInfo && order.commandInfo.type == 'D') {

				var tableId = order.commandInfo.tableId;

				//request for lock
				$scope.lockTable(tableId).then(function(response) {

					var data = response.data;
					var lock = data.lock;

					if (!lock) {
						$scope.alert("Table " + tableId + " is currently locked!");
					} else {
						$state.go('view-order', {
							'order': order
						});
					}

				}, function(err) {
					$scope.alert(err);
				});
			} else {
				$state.go('view-order', {
					'order': order
				});

			}


		}, function() {

			$scope.closeModal();

			$scope.alert("Failed to load order!");

		});

	};

	$scope.renderReport();
	$scope.reloadReport = function(params) {
		$scope.params = params;
		$scope.report.ajax.reload();
	};


	$scope.showSearchDialog = function() {

		$modal.open({
			templateUrl: '/html/popups/search-order.html',
			//size: 'lg',
			scope: $scope,
			controllerAs: '$ctrl',
			resolve: {},
			controller: function($scope, $timeout, $modalInstance) {
				var ctrl = this;

				ctrl.opened1 = false;
				ctrl.open1 = function(e) {
					e.stopPropagation();
					this.opened1 = true;
				}

				ctrl.opened2 = false;
				ctrl.open2 = function(e) {
					e.stopPropagation();
					this.opened2 = true;
				}

				ctrl.reset = function() {

					$scope.params = {
						dateFrom: "",
						dateTo: "",
						documentNo: "",
						customerId: "",
						salesRepId: "",
						paymentRule: "",
						docStatus: "",
						date1: null,
						date2: null
					};
				};

				ctrl.search = function() {

					if ($scope.params.date1 != null) {

						$scope.params.dateFrom = moment($scope.params.date1).format("YYYY-MM-DD");
						$scope.params.date1 = $scope.params.dateFrom;

					} else {
						$scope.params.dateFrom = "";
					}

					if ($scope.params.date2 != null) {

						$scope.params.dateTo = moment($scope.params.date2).format("YYYY-MM-DD");
						$scope.params.date2 = $scope.params.dateTo;
					} else {
						$scope.params.dateTo = "";
					}

					if ($scope.params.customer != null) {
						$scope.params.customerId = $scope.params.customer.id;
					}

					if ($scope.params.salesRep != null) {
						$scope.params.salesRepId = $scope.params.salesRep.id;
					}

					$scope.reloadReport($scope.params);

					$modalInstance.close();
				};
			}
		});

	};

});