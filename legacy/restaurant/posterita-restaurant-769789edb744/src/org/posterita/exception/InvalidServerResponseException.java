package org.posterita.exception;

public class InvalidServerResponseException extends Exception {
	
	public InvalidServerResponseException() {
		super();
	}
	
	public InvalidServerResponseException(String message) {
		super(message);
	}
	
	public InvalidServerResponseException(Throwable cause) {
		super(cause);
	}
	
	public InvalidServerResponseException(String message, Throwable cause) {
		super(message, cause);
	}

}
