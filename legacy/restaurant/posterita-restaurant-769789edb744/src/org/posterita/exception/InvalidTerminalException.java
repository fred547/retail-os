package org.posterita.exception;

public class InvalidTerminalException extends Exception {
	
	public InvalidTerminalException() {
		super();
	}
	
	public InvalidTerminalException(String message) {
		super(message);
	}
	
	public InvalidTerminalException(Throwable cause) {
		super(cause);
	}
	
	public InvalidTerminalException(String message, Throwable cause) {
		super(message, cause);
	}

}
