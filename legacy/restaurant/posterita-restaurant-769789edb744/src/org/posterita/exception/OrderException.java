package org.posterita.exception;

public class OrderException extends Exception {
	
	public OrderException() {
		super();
	}
	
	public OrderException(String message) {
		super(message);
	}
	
	public OrderException(Throwable cause) {
		super(cause);
	}
	
	public OrderException(String message, Throwable cause) {
		super(message, cause);
	}

}
