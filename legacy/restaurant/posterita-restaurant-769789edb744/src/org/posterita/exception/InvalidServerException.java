package org.posterita.exception;

public class InvalidServerException extends Exception {
	
	public InvalidServerException() {
		super();
	}
	
	public InvalidServerException(String message) {
		super(message);
	}
	
	public InvalidServerException(Throwable cause) {
		super(cause);
	}
	
	public InvalidServerException(String message, Throwable cause) {
		super(message, cause);
	}

}
