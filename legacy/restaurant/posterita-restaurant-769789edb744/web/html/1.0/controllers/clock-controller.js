angular.module('app').controller('ClockController', function($scope, $interval, dateFilter)
{
	var ctrl = this;
	var refreshClock = function()
	{
		ctrl.date = dateFilter(new Date(), 'd MMM yy');
		ctrl.time = dateFilter(new Date(), 'h:mm:ss a');
	}
	refreshClock();
	var stop = $interval(refreshClock, 1000);
	$scope.$on('$destroy', function()
	{
		$interval.cancel(stop);
	});
});