package org.posterita.exception;

public class InvalidMerchantException extends Exception {
	
	public InvalidMerchantException() {
		super();
	}
	
	public InvalidMerchantException(String message) {
		super(message);
	}
	
	public InvalidMerchantException(Throwable cause) {
		super(cause);
	}
	
	public InvalidMerchantException(String message, Throwable cause) {
		super(message, cause);
	}

}
