function HashMap()
{
	var keys = [];
	var data = {};
	
	this.size = function() {
		return keys.length;
	}
	this.get = function(key) {
		return data[key] || null;
	}
	this.remove = function(key) {
		var index = keys.indexOf(key);
		if (index != -1) {
			keys.splice(index, 1);
			data[key] = null;
		}
	}
	this.toArray = function() {
		var r = [];
		for(var k in data)
			if (data[k]) r.push(data[k]);
		return r;
	}
	this.put = function(key, value) {
		if (keys.indexOf(key) == -1)
			keys.push(key);
		data[key] = value;
	}
	this.clear = function() {
		keys = [];
		data = {};
	}
	this.hasItem = function (key) {
		return (keys.indexOf(key) != -1);
	}
	this.limit = function(start, num) {
		var sub = keys.slice(start, num),
			result = [];
		for(var i=0,len=sub.length; i<len; i++) {
			result.push(data[sub[i]]);
		}
		return result;
	}
	this.each = function(fn) {
		if (typeof fn != 'function') {
			return false;
		} else {
			var len = this.size();
			for(var i=0; i<len; i++) {
				var k = keys[i];
				fn(k, data[k], i);
			}
		}
	}
}

var Cart = {
		
		lines : new HashMap(),
		
		total : 0,
		totalQty :0,
		
		addToCart : function( product ){
			
			var id = product['m_product_id'];
			
			var line = this.lines.get(id);
			
			if(line == null){
				
				line = new CartLine(product, 1);
				
			}
			else
			{
				line.qty ++;
			}
			

			this.lines.put(id, line);
			
			this.total += line.product.pricestd;
			this.totalQty ++;
			
			
		},
		
		remove : function( id ){
			
			var line = this.lines.get(id);
			this.lines.remove(id);
			
			this.total = this.total - line.product.pricestd * line.qty;
			this.totalQty = this.totalQty - line.qty;
		}
		
};

function CartLine( product, qty ){
	this.product = product;
	this.qty = qty;
}