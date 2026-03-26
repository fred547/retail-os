package org.posterita.exception;

public class EmbeddedJettyServerException extends Exception {
	
	public EmbeddedJettyServerException(){
		super();
	}
	
	public EmbeddedJettyServerException(String message){
		super(message);
	}
	
	public EmbeddedJettyServerException(String message, Throwable e){
		super(message, e);
	}

}
