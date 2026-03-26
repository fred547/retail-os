package org.posterita.exception;

public class InvalidAccountException extends Exception {
	
	public InvalidAccountException() {
		super();
	}
	
	public InvalidAccountException(String message) {
		super(message);
	}
	
	public InvalidAccountException(Throwable cause) {
		super(cause);
	}
	
	public InvalidAccountException(String message, Throwable cause) {
		super(message, cause);
	}

}
