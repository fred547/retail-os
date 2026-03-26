angular.module('app').filter('customDateFormatter', function() {
    return function(date, format) {
        if (date == null || date == '' || format == null || format == '') {
            return date;
        }
        return moment(date, 'YYYY-MM-DD HH:mm:ss').format(format);
    }
});

angular.module('app').filter("groupBy", ["$parse", "$filter", function($parse, $filter) {
    return function(array, groupByField) {
        var result = [];
        var prev_item = null;
        var groupKey = false;
        var filteredData = array;
        for (var i = 0; i < filteredData.length; i++) {
            groupKey = false;
            if (prev_item !== null) {
                if (prev_item[groupByField] !== filteredData[i][groupByField]) {
                    groupKey = true;
                }
            } else {
                groupKey = true;
            }
            if (groupKey) {
                filteredData[i]['group_by_key'] = true;
            } else {
                filteredData[i]['group_by_key'] = false;
            }
            result.push(filteredData[i]);
            prev_item = filteredData[i];
        }
        return result;
    }
}]);

angular.module('app').filter('safeHtml', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
});
