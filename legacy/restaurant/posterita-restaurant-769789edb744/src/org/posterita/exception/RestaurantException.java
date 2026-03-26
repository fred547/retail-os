package org.posterita.exception;

public class RestaurantException extends Exception {
	
	public RestaurantException() {
		super();
	}
	
	public RestaurantException(String message) {
		super(message);
	}
	
	public RestaurantException(Throwable cause) {
		super(cause);
	}
	
	public RestaurantException(String message, Throwable cause) {
		super(message, cause);
	}

}
