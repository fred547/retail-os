package org.posterita.exception;

public class EmailException extends Exception {
	
	public EmailException() {
		super();
	}
	
	public EmailException(String message) {
		super(message);
	}
	
	public EmailException(Throwable cause) {
		super(cause);
	}
	
	public EmailException(String message, Throwable cause) {
		super(message, cause);
	}

}
