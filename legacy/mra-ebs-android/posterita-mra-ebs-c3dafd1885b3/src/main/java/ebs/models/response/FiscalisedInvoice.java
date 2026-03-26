package ebs.models.response;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonProperty;

public class FiscalisedInvoice {
	
    @JsonProperty("invoiceIdentifier")
    private String invoiceIdentifier;

    @JsonProperty("irn")
    private String irn;

    @JsonProperty("qrCode")
    private String qrCode;

    @JsonProperty("status")
    private String status;

    @JsonProperty("warningMessages")
    private String[] warningMessages;

    @JsonProperty("errorMessages")
    private ErrorMessage[] errorMessages;

    public FiscalisedInvoice() {
    	
    }

	public String getInvoiceIdentifier() {
		return invoiceIdentifier;
	}

	public void setInvoiceIdentifier(String invoiceIdentifier) {
		this.invoiceIdentifier = invoiceIdentifier;
	}

	public String getIrn() {
		return irn;
	}

	public void setIrn(String irn) {
		this.irn = irn;
	}

	public String getQrCode() {
		return qrCode;
	}

	public void setQrCode(String qrCode) {
		this.qrCode = qrCode;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String[] getWarningMessages() {
		return warningMessages;
	}

	public void setWarningMessages(String[] warningMessages) {
		this.warningMessages = warningMessages;
	}

	public ErrorMessage[] getErrorMessages() {
		return errorMessages;
	}

	public void setErrorMessages(ErrorMessage[] errorMessages) {
		this.errorMessages = errorMessages;
	}

	@Override
	public String toString() {
		return "FiscalisedInvoice [invoiceIdentifier=" + invoiceIdentifier + ", irn=" + irn + ", qrCode=" + qrCode
				+ ", status=" + status + ", warningMessages=" + Arrays.toString(warningMessages) + ", errorMessages="
				+ Arrays.toString(errorMessages) + "]";
	}
	
    
}
