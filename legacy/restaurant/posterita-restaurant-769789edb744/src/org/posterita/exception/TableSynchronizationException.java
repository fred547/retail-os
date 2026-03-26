package org.posterita.exception;

public class TableSynchronizationException extends Exception {
	
	public TableSynchronizationException() {
		super();
	}
	
	public TableSynchronizationException(String message) {
		super(message);
	}
	
	public TableSynchronizationException(Throwable cause) {
		super(cause);
	}
	
	public TableSynchronizationException(String message, Throwable cause) {
		super(message, cause);
	}

}
