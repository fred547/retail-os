package org.posterita.exception;

public class ServerUnavailableException extends Exception {
	
	public ServerUnavailableException() {
		super();
	}
	
	public ServerUnavailableException(String message) {
		super(message);
	}
	
	public ServerUnavailableException(Throwable cause) {
		super(cause);
	}
	
	public ServerUnavailableException(String message, Throwable cause) {
		super(message, cause);
	}

}
