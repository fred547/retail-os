function BigNumber(val) {
  
    this.val = val + "";
}

BigNumber.prototype.toString = function toString() {
  
    return "" + this.val;
};

BigNumber.prototype.plus = function(b) {

    var a = this.val + "";
    b = b + "";

    var result = ( ( parseFloat(a) * 1000 ) + ( parseFloat(b) * 1000 )) / 1000 ;
    return new BigNumber(result);
};

BigNumber.prototype.times = function(b) {
  
    var a = this.val + "";
    b = b + "";

    var result = (1000 * parseFloat(a)) * (1000 * parseFloat(b)) / (1000 *1000);

    return new BigNumber(result);
};

BigNumber.prototype.minus = function(b) {
  
    var a = this.val + "";
    b = b + "";

    var result = (((1000 * parseFloat(a)) - (1000 * parseFloat(b)))) / 1000;

    return new BigNumber(result);
};

BigNumber.prototype.dividedBy = function(b) {
  
    var a = this.val + "";
    b = b + "";

    var result = ( 1000 * parseFloat(a) ) / ( 1000 * parseFloat(b) );
    return new BigNumber(result);
};

BigNumber.prototype.toFixed = function(precision) {
  
	/* fixing rounding issue */
	if( this.val.indexOf('.') != -1) {
		
		/* pad val with 00001 */
		
		var padded = this.val + "00001";
		
		return new Number( padded ).toFixed(precision);
		
	}
    return new Number(this.val).toFixed(precision);
};

BigNumber.prototype.negate = function() {
	  
    var a = this.val + "";

    var result = ( 0 - ( 1000 * parseFloat(a) ) ) / 1000;

    return new BigNumber(result);
};

BigNumber.prototype.comparedTo = function(b) {

    var a = this.toString();
    var b = b.toString();
    var c = 0;

    a = parseFloat(a) * 1000;
    b = parseFloat(b) * 1000;

    if (a == b) {
        c = 0;
    } else if (a > b) {
        c = 1;
    } else {
        c = -1;
    }
  
    return c;
}

BigNumber.prototype.int = function(){
	
	return parseInt( this.toFixed(0) );
}

BigNumber.prototype.float = function(scale){
	
	return parseFloat( this.toFixed( scale || 2 ) );
}