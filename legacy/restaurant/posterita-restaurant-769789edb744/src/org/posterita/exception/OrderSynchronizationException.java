package org.posterita.exception;

public class OrderSynchronizationException extends Exception {
	
	public OrderSynchronizationException() {
		super();
	}
	
	public OrderSynchronizationException(String message) {
		super(message);
	}
	
	public OrderSynchronizationException(Throwable cause) {
		super(cause);
	}
	
	public OrderSynchronizationException(String message, Throwable cause) {
		super(message, cause);
	}

}
