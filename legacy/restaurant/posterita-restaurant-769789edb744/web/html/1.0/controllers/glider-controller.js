angular.module('app').controller('GliderController', function($scope, ProductService)
{
	var ctrl = this;
	ctrl.glider = {
		primarygroup: null,
		group1: null,
		group2: null,
		tiles: null,
		level: 0,
		refresh: function()
		{
			var query = {};
			if (this.level == 3)
			{
				var query = {
					"primarygroup": this.primarygroup,
					"group1": this.group1,
					"group2": this.group2
				};
				this.tiles = [this.group2];
			}
			else if (this.level == 2)
			{
				query = {
					"primarygroup": this.primarygroup,
					"group1": this.group1
				};
				this.tiles = ProductService.distinct( query, "group2" );
			}
			else if (this.level == 1)
			{
				query = {
					"primarygroup": this.primarygroup
				};
				this.tiles =  ProductService.distinct( query, "group1" );
			}
			else
			{
				this.tiles =  ProductService.distinct( query, "primarygroup" );
			}						
			
			$scope.filterProduct(query);
		},
		setLevel: function(level, attr)
		{
			if (level == 1)
			{
				this.primarygroup = attr;
			}
			else if (level == 2)
			{
				this.group1 = attr;
			}
			else if (level == 3)
			{
				this.group2 = attr;
			}
			else
			{
				return;
			}
			this.level = level;
			this.refresh();
		},
		getTiles: function()
		{
			return this.tiles;
		},
		back: function()
		{
			if (this.level > 0)
			{
				this.level = this.level - 1;
				this.refresh();
			}
		},
		home: function()
		{
			this.level = 0;
			this.refresh();
		}
	};
	
	ctrl.glider.tiles =  ProductService.distinct( {}, "primarygroup" );
});