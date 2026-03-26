describe('PickingListService', function() {
    var PickingListService, $httpBackend, CONFIG, $q, $rootScope;

    beforeEach(angular.mock.inject(function(_PickingListService_, _$httpBackend_, _CONFIG_, _$q_, _$rootScope_) {
        PickingListService = _PickingListService_;
        $httpBackend = _$httpBackend_;
        CONFIG = _CONFIG_;
        $q = _$q_;
        $rootScope = _$rootScope_;
    }));

    it('should load document', function(done) {
        var documentno = '12345';
        var response = { found: true, pickinglist: { id: 1, name: 'Test Document' } };

        $httpBackend.expectGET(CONFIG.getServerEndpoint() + "/service/PickingList/document?json=" + JSON.stringify({
            'merchantKey': CONFIG.getClientId(),
            'terminalKey': 0,
            'ad_user_id': CONFIG.getUserId(),
            'documentno': documentno
        })).respond(response);

        var result;
        PickingListService.loadDocument(documentno).then(function(data) {
            result = data;
        });

        $httpBackend.flush();
        $rootScope.$apply();

        expect(result).toEqual(response.pickinglist);
        done();
    });

    // Add more tests for other methods...
});

describe('WarehouseService', function() {
    var WarehouseService, $httpBackend, CONFIG, $q, $rootScope;

    beforeEach(angular.mock.inject(function(_WarehouseService_, _$httpBackend_, _CONFIG_, _$q_, _$rootScope_) {
        WarehouseService = _WarehouseService_;
        $httpBackend = _$httpBackend_;
        CONFIG = _CONFIG_;
        $q = _$q_;
        $rootScope = _$rootScope_;
    }));

    it('should move item', function(done) {
        var barcode = '12345';
        var oldLocation = 'A1';
        var newLocation = 'B1';
        var response = { moved: true };

        $httpBackend.expectGET(CONFIG.getServerEndpoint() + "/service/Warehouse/moveItem?json=" + JSON.stringify({
            'merchantKey': CONFIG.getClientId(),
            'terminalKey': 0,
            'ad_user_id': CONFIG.getUserId(),
            'm_warehouse_id': CONFIG.getWarehouse()['m_warehouse_id'],
            'barcode': barcode,
            'oldLocation': oldLocation,
            'newLocation': newLocation
        })).respond(response);

        var result;
        WarehouseService.moveItem(barcode, oldLocation, newLocation).then(function(data) {
            result = data;
        });

        $httpBackend.flush();
        $rootScope.$apply();

        expect(result).toEqual("Item mapping updated");
        done();
    });

    // Add more tests for other methods...
});
