package ebs.models;

import java.math.BigDecimal;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat;

public class Invoice {
    @JsonProperty("invoiceCounter")
    private String invoiceCounter;

    @JsonProperty("transactionType")
    private String transactionType;

    @JsonProperty("personType")
    private String personType;

    @JsonProperty("invoiceTypeDesc")
    private String invoiceTypeDesc;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("invoiceIdentifier")
    private String invoiceIdentifier;

    @JsonProperty("invoiceRefIdentifier")
    private String invoiceRefIdentifier;

    @JsonProperty("previousNoteHash")
    private String previousNoteHash;

    @JsonProperty("reasonStated")
    private String reasonStated;

    @JsonProperty("totalVatAmount")
    private BigDecimal totalVatAmount;

    @JsonProperty("totalAmtWoVatCur")
    private BigDecimal totalAmtWoVatCur;

    @JsonProperty("totalAmtWoVatMur")
    private BigDecimal totalAmtWoVatMur;

    @JsonProperty("totalAmtPaid")
    private BigDecimal totalAmtPaid;
    
    @JsonProperty("invoiceTotal")
    private BigDecimal invoiceTotal;
    
    @JsonProperty("discountTotalAmount")
    private BigDecimal discountTotalAmount;    

    @JsonProperty("dateTimeInvoiceIssued")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyyMMdd HH:mm:ss")
    private String dateTimeInvoiceIssued;

    @JsonProperty("seller")
    private Seller seller;

    @JsonProperty("buyer")
    private Buyer buyer;

    @JsonProperty("itemList")
    private List<Item> itemList;

    @JsonProperty("salesTransactions")
    private String salesTransactions;
    
    public Invoice() {
    	
    }

	public String getInvoiceCounter() {
		return invoiceCounter;
	}

	public void setInvoiceCounter(String invoiceCounter) {
		this.invoiceCounter = invoiceCounter;
	}

	public String getTransactionType() {
		return transactionType;
	}

	public void setTransactionType(String transactionType) {
		this.transactionType = transactionType;
	}

	public String getPersonType() {
		return personType;
	}

	public void setPersonType(String personType) {
		this.personType = personType;
	}

	public String getInvoiceTypeDesc() {
		return invoiceTypeDesc;
	}

	public void setInvoiceTypeDesc(String invoiceTypeDesc) {
		this.invoiceTypeDesc = invoiceTypeDesc;
	}

	public String getCurrency() {
		return currency;
	}

	public void setCurrency(String currency) {
		this.currency = currency;
	}

	public String getInvoiceIdentifier() {
		return invoiceIdentifier;
	}

	public void setInvoiceIdentifier(String invoiceIdentifier) {
		this.invoiceIdentifier = invoiceIdentifier;
	}

	public String getInvoiceRefIdentifier() {
		return invoiceRefIdentifier;
	}

	public void setInvoiceRefIdentifier(String invoiceRefIdentifier) {
		this.invoiceRefIdentifier = invoiceRefIdentifier;
	}

	public String getPreviousNoteHash() {
		return previousNoteHash;
	}

	public void setPreviousNoteHash(String previousNoteHash) {
		this.previousNoteHash = previousNoteHash;
	}

	public String getReasonStated() {
		return reasonStated;
	}

	public void setReasonStated(String reasonStated) {
		this.reasonStated = reasonStated;
	}

	public BigDecimal getTotalVatAmount() {
		return totalVatAmount;
	}

	public void setTotalVatAmount(BigDecimal totalVatAmount) {
		this.totalVatAmount = totalVatAmount;
	}

	public BigDecimal getTotalAmtWoVatCur() {
		return totalAmtWoVatCur;
	}

	public void setTotalAmtWoVatCur(BigDecimal totalAmtWoVatCur) {
		this.totalAmtWoVatCur = totalAmtWoVatCur;
	}

	public BigDecimal getTotalAmtWoVatMur() {
		return totalAmtWoVatMur;
	}

	public void setTotalAmtWoVatMur(BigDecimal totalAmtWoVatMur) {
		this.totalAmtWoVatMur = totalAmtWoVatMur;
	}

	public BigDecimal getTotalAmtPaid() {
		return totalAmtPaid;
	}

	public void setTotalAmtPaid(BigDecimal totalAmtPaid) {
		this.totalAmtPaid = totalAmtPaid;
	}

	public String getDateTimeInvoiceIssued() {
		return dateTimeInvoiceIssued;
	}

	public void setDateTimeInvoiceIssued(String dateTimeInvoiceIssued) {
		this.dateTimeInvoiceIssued = dateTimeInvoiceIssued;
	}

	public Seller getSeller() {
		return seller;
	}

	public void setSeller(Seller seller) {
		this.seller = seller;
	}

	public Buyer getBuyer() {
		return buyer;
	}

	public void setBuyer(Buyer buyer) {
		this.buyer = buyer;
	}

	public List<Item> getItemList() {
		return itemList;
	}

	public void setItemList(List<Item> itemList) {
		this.itemList = itemList;
	}

	public String getSalesTransactions() {
		return salesTransactions;
	}

	public void setSalesTransactions(String salesTransactions) {
		this.salesTransactions = salesTransactions;
	}

	public BigDecimal getInvoiceTotal() {
		return invoiceTotal;
	}

	public void setInvoiceTotal(BigDecimal invoiceTotal) {
		this.invoiceTotal = invoiceTotal;
	}

	public BigDecimal getDiscountTotalAmount() {
		return discountTotalAmount;
	}

	public void setDiscountTotalAmount(BigDecimal discountTotalAmount) {
		this.discountTotalAmount = discountTotalAmount;
	}

	@Override
	public String toString() {
		return "Invoice [invoiceCounter=" + invoiceCounter + ", transactionType=" + transactionType + ", personType="
				+ personType + ", invoiceTypeDesc=" + invoiceTypeDesc + ", currency=" + currency
				+ ", invoiceIdentifier=" + invoiceIdentifier + ", invoiceRefIdentifier=" + invoiceRefIdentifier
				+ ", previousNoteHash=" + previousNoteHash + ", reasonStated=" + reasonStated + ", totalVatAmount="
				+ totalVatAmount + ", totalAmtWoVatCur=" + totalAmtWoVatCur + ", totalAmtWoVatMur=" + totalAmtWoVatMur
				+ ", totalAmtPaid=" + totalAmtPaid + ", invoiceTotal=" + invoiceTotal + ", discountTotalAmount="
				+ discountTotalAmount + ", dateTimeInvoiceIssued=" + dateTimeInvoiceIssued + ", seller=" + seller
				+ ", buyer=" + buyer + ", itemList=" + itemList + ", salesTransactions=" + salesTransactions + "]";
	}	 	
    
}
