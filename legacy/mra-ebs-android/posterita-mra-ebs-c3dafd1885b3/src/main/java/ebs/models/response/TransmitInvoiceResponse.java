package ebs.models.response;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TransmitInvoiceResponse {

	@JsonProperty("responseId")
	private String responseId;

	@JsonProperty("responseDateTime")
	private String responseDateTime;

	@JsonProperty("requestId")
	private String requestId;

	@JsonProperty("status")
	private String status;

	@JsonProperty("environment")
	private String environment;

	@JsonProperty("infoMessages")
	private String[] infoMessages; // You can change the type as needed

	@JsonProperty("errorMessages")
	private ErrorMessage[] errorMessages; // You can change the type as needed

	@JsonProperty("fiscalisedInvoices")
	private FiscalisedInvoice[] fiscalisedInvoices; // You can change the type as needed

	public TransmitInvoiceResponse() {

	}

	public String getResponseId() {
		return responseId;
	}

	public void setResponseId(String responseId) {
		this.responseId = responseId;
	}

	public String getResponseDateTime() {
		return responseDateTime;
	}

	public void setResponseDateTime(String responseDateTime) {
		this.responseDateTime = responseDateTime;
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

	public String getEnvironment() {
		return environment;
	}

	public void setEnvironment(String environment) {
		this.environment = environment;
	}

	public String[] getInfoMessages() {
		return infoMessages;
	}

	public void setInfoMessages(String[] infoMessages) {
		this.infoMessages = infoMessages;
	}

	public ErrorMessage[] getErrorMessages() {
		return errorMessages;
	}

	public void setErrorMessages(ErrorMessage[] errorMessages) {
		this.errorMessages = errorMessages;
	}

	public FiscalisedInvoice[] getFiscalisedInvoices() {
		return fiscalisedInvoices;
	}

	public void setFiscalisedInvoices(FiscalisedInvoice[] fiscalisedInvoices) {
		this.fiscalisedInvoices = fiscalisedInvoices;
	}

	@Override
	public String toString() {
		return "TransmitInvoiceResponse [responseId=" + responseId + ", responseDateTime=" + responseDateTime
				+ ", requestId=" + requestId + ", status=" + status + ", environment=" + environment + ", infoMessages="
				+ Arrays.toString(infoMessages) + ", errorMessages=" + Arrays.toString(errorMessages)
				+ ", fiscalisedInvoices=" + Arrays.toString(fiscalisedInvoices) + "]";
	}	

}
