package org.posterita.exception;

public class EmbeddedJettyServerException extends Exception {
	
	public EmbeddedJettyServerException() {
		super();
	}
	
	public EmbeddedJettyServerException(String message) {
		super(message);
	}
	
	public EmbeddedJettyServerException(Throwable cause) {
		super(cause);
	}
	
	public EmbeddedJettyServerException(String message, Throwable cause) {
		super(message, cause);
	}

}
