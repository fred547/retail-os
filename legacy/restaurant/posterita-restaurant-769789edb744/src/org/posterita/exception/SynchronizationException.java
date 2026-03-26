package org.posterita.exception;

public class SynchronizationException extends Exception {
	
	public SynchronizationException() {
		super();
	}
	
	public SynchronizationException(String message) {
		super(message);
	}
	
	public SynchronizationException(Throwable cause) {
		super(cause);
	}
	
	public SynchronizationException(String message, Throwable cause) {
		super(message, cause);
	}

}
