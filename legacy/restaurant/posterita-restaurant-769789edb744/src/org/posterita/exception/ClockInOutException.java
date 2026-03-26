package org.posterita.exception;

public class ClockInOutException extends Exception {
	
	public ClockInOutException() {
		super();
	}
	
	public ClockInOutException(String message) {
		super(message);
	}
	
	public ClockInOutException(Throwable cause) {
		super(cause);
	}
	
	public ClockInOutException(String message, Throwable cause) {
		super(message, cause);
	}

}
