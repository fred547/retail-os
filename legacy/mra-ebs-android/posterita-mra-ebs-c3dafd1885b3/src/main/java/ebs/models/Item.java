package ebs.models;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Item {
    @JsonProperty("itemNo")
    private String itemNo;

    @JsonProperty("taxCode")
    private String taxCode;

    @JsonProperty("nature")
    private String nature;

    @JsonProperty("productCodeMra")
    private String productCodeMra;

    @JsonProperty("productCodeOwn")
    private String productCodeOwn;

    @JsonProperty("itemDesc")
    private String itemDesc;

    @JsonProperty("quantity")
    private BigDecimal quantity;

    @JsonProperty("unitPrice")
    private BigDecimal unitPrice;

    @JsonProperty("discount")
    private BigDecimal discount;

    @JsonProperty("discountedValue")
    private BigDecimal discountedValue;

    @JsonProperty("amtWoVatCur")
    private BigDecimal amtWoVatCur;

    @JsonProperty("amtWoVatMur")
    private BigDecimal amtWoVatMur;

    @JsonProperty("vatAmt")
    private BigDecimal vatAmt;

    @JsonProperty("totalPrice")
    private BigDecimal totalPrice;

	public Item() {}

	public String getItemNo() {
		return itemNo;
	}

	public void setItemNo(String itemNo) {
		this.itemNo = itemNo;
	}

	public String getTaxCode() {
		return taxCode;
	}

	public void setTaxCode(String taxCode) {
		this.taxCode = taxCode;
	}

	public String getNature() {
		return nature;
	}

	public void setNature(String nature) {
		this.nature = nature;
	}

	public String getProductCodeMra() {
		return productCodeMra;
	}

	public void setProductCodeMra(String productCodeMra) {
		this.productCodeMra = productCodeMra;
	}

	public String getProductCodeOwn() {
		return productCodeOwn;
	}

	public void setProductCodeOwn(String productCodeOwn) {
		this.productCodeOwn = productCodeOwn;
	}

	public String getItemDesc() {
		return itemDesc;
	}

	public void setItemDesc(String itemDesc) {
		this.itemDesc = itemDesc;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public void setQuantity(BigDecimal quantity) {
		this.quantity = quantity;
	}

	public BigDecimal getUnitPrice() {
		return unitPrice;
	}

	public void setUnitPrice(BigDecimal unitPrice) {
		this.unitPrice = unitPrice;
	}

	public BigDecimal getDiscount() {
		return discount;
	}

	public void setDiscount(BigDecimal discount) {
		this.discount = discount;
	}

	public BigDecimal getDiscountedValue() {
		return discountedValue;
	}

	public void setDiscountedValue(BigDecimal discountedValue) {
		this.discountedValue = discountedValue;
	}

	public BigDecimal getAmtWoVatCur() {
		return amtWoVatCur;
	}

	public void setAmtWoVatCur(BigDecimal amtWoVatCur) {
		this.amtWoVatCur = amtWoVatCur;
	}

	public BigDecimal getAmtWoVatMur() {
		return amtWoVatMur;
	}

	public void setAmtWoVatMur(BigDecimal amtWoVatMur) {
		this.amtWoVatMur = amtWoVatMur;
	}

	public BigDecimal getVatAmt() {
		return vatAmt;
	}

	public void setVatAmt(BigDecimal vatAmt) {
		this.vatAmt = vatAmt;
	}

	public BigDecimal getTotalPrice() {
		return totalPrice;
	}

	public void setTotalPrice(BigDecimal totalPrice) {
		this.totalPrice = totalPrice;
	}

	@Override
	public String toString() {
		return "Item [itemNo=" + itemNo + ", taxCode=" + taxCode + ", nature=" + nature + ", productCodeMra="
				+ productCodeMra + ", productCodeOwn=" + productCodeOwn + ", itemDesc=" + itemDesc + ", quantity="
				+ quantity + ", unitPrice=" + unitPrice + ", discount=" + discount + ", discountedValue="
				+ discountedValue + ", amtWoVatCur=" + amtWoVatCur + ", amtWoVatMur=" + amtWoVatMur + ", vatAmt="
				+ vatAmt + ", totalPrice=" + totalPrice + "]";
	}		
    
}
