angular.module('app').directive('shoppingCart', function() {
    return {
        restrict: 'E',
        templateUrl: 'directive/shopping-cart.html',
        replace: true
    };
});

angular.module('app').directive('selectOnFocus', function() {
    return {
        restrict: 'A',
        link: function(scope, element) {
            element.on("focus", function() {
                element.select();
            });
        }
    };
});

angular.module('app').directive('focusMe', function($timeout) {
    return {
        link: function(scope, element, attr) {
            attr.$observe('focusMe', function(value) {
                if (value === "true") {
                    $timeout(function() {
                        element[0].focus();
                    });
                }
            });
        }
    };
});

angular.module('app').directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});

angular.module('app').directive('scrollIf', function() {
    return function(scope, element, attrs) {
        scope.$watch(attrs.scrollIf, function(value) {
            if (value) {
                element[0].scrollIntoView({
                    block: "end",
                    behavior: "smooth"
                });
            }
        });
    }
});

angular.module('app').directive('remove', function() {
    return {
        restrict: "E",
        replace: true,
        link: function(scope, element, attrs, controller) {
            element.replaceWith('<!--removed element-->');
        }
    };
});

angular.module('app').directive('ngDebouncedClick', ['$timeout', function($timeout) {
    return {
      restrict: 'A',
      scope: true, // Use a shared scope
      link: function(scope, element, attrs) {
        var debounceOptions = angular.extend({ leading: true, trailing: false }, scope.$eval(attrs.debounceOptions));
        var debounceTimeout = scope.$eval(attrs.debounceTimeout) || 250;
  
        var debouncedClick = _.debounce(function() {
          scope.$apply(attrs.ngDebouncedClick);
        }, debounceTimeout, debounceOptions);
  
        element.on('click', debouncedClick);
  
        scope.$on('$destroy', function() {
          element.off('click', debouncedClick);
        });
      }
    };
}]);