package ebs.exceptions;

public class HttpException extends Exception {
	
	public HttpException() {
		super();
	}
	
	public HttpException(String message) {
		super(message);
	}
	
	public HttpException(Throwable t) {
		super(t);
	}
}
