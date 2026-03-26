package ebs.models.response;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

/*		
{
    "status": "ERROR",
    "responseId": "TK16947632430257131624213",
    "requestId": "ed365662-fb42-4fd3-9c6e-682ecbdc32f6",
    "errors": [
        "Decryption failed"
    ]
}

{
    "status": "SUCCESS",
    "responseId": "TK16944973008568627017252",
    "requestId": "14092063-6c91-42ef-b289-7c0fc26be04d",
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJQb3N0ZXJpdGEiLCJlYnNNcmFJZCI6IjE2OTQ0MTEyNDE1MzMwMFlCM0JNUjE2MSIsImV4cCI6MTY5NDUwODUwMSwiaWF0IjoxNjk0NDIyMTAxfQ._LCkAJRIwhbpbMJ-de3BvQsfFTrEl_ckc7kG74tkVWdSCyNi-NEcOlj-hSrvIWRF_2F7Rgka9vSGxw7Y1CisIw",
    "key": "VKupUwmtaBeNOBkQrOhsLFoeg5Mi2nbaEmHRrQtDT3D4s/0ixJLLXn/yJoSbiNuj",
    "expiryDate": "20230912 12:48:21"
}
*/

public class AuthenticateResponse {
	
	@JsonProperty("responseId")
    private String responseId;

    @JsonProperty("requestId")
    private String requestId;

    @JsonProperty("status") 
    @JsonAlias("Status")
    private String status;

    @JsonProperty("token")
    private String token;

    @JsonProperty("key")
    private String key;

    @JsonProperty("expiryDate")
    private String expiryDate;
    
    @JsonProperty("errors")
    private String[] errors;    

    @JsonProperty("ErrorMessages")
    private ErrorMessage[] errorMessages;
    
    public AuthenticateResponse() {
    	
    }

	public String getResponseId() {
		return responseId;
	}

	public void setResponseId(String responseId) {
		this.responseId = responseId;
	}

	public String getRequestId() {
		return requestId;
	}

	public void setRequestId(String requestId) {
		this.requestId = requestId;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getToken() {
		return token;
	}

	public void setToken(String token) {
		this.token = token;
	}

	public String getKey() {
		return key;
	}

	public void setKey(String key) {
		this.key = key;
	}

	public String getExpiryDate() {
		return expiryDate;
	}

	public void setExpiryDate(String expiryDate) {
		this.expiryDate = expiryDate;
	}

	public String[] getErrors() {
		return errors;
	}

	public void setErrors(String[] errors) {
		this.errors = errors;
	}	

	public ErrorMessage[] getErrorMessages() {
		return errorMessages;
	}

	public void setErrorMessages(ErrorMessage[] errorMessages) {
		this.errorMessages = errorMessages;
		
		if(errorMessages != null) {
			errors = new String[errorMessages.length];			
			for(int i=0; i<errors.length; i++) {
				errors[i] = errorMessages[i].getDescription();
			}
		}
	}

	@Override
	public String toString() {
		return "GenerateTokenResponse [responseId=" + responseId + ", requestId=" + requestId + ", status=" + status
				+ ", token=" + token + ", key=" + key + ", expiryDate=" + expiryDate + ", errors="
				+ Arrays.toString(errors) + "]";
	}	

}
