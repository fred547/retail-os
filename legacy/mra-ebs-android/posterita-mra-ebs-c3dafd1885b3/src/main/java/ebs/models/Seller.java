package ebs.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Seller {
    @JsonProperty("name")
    private String name;

    @JsonProperty("tradeName")
    private String tradeName;

    @JsonProperty("tan")
    private String tan;

    @JsonProperty("brn")
    private String brn;

    @JsonProperty("businessAddr")
    private String businessAddr;

    @JsonProperty("businessPhoneNo")
    private String businessPhoneNo;

    @JsonProperty("ebsCounterNo")
    private String ebsCounterNo;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getTradeName() {
		return tradeName;
	}

	public void setTradeName(String tradeName) {
		this.tradeName = tradeName;
	}

	public String getTan() {
		return tan;
	}

	public void setTan(String tan) {
		this.tan = tan;
	}

	public String getBrn() {
		return brn;
	}

	public void setBrn(String brn) {
		this.brn = brn;
	}

	public String getBusinessAddr() {
		return businessAddr;
	}

	public void setBusinessAddr(String businessAddr) {
		this.businessAddr = businessAddr;
	}

	public String getBusinessPhoneNo() {
		return businessPhoneNo;
	}

	public void setBusinessPhoneNo(String businessPhoneNo) {
		this.businessPhoneNo = businessPhoneNo;
	}

	public String getEbsCounterNo() {
		return ebsCounterNo;
	}

	public void setEbsCounterNo(String ebsCounterNo) {
		this.ebsCounterNo = ebsCounterNo;
	}

	@Override
	public String toString() {
		return "Seller [name=" + name + ", tradeName=" + tradeName + ", tan=" + tan + ", brn=" + brn + ", businessAddr="
				+ businessAddr + ", businessPhoneNo=" + businessPhoneNo + ", ebsCounterNo=" + ebsCounterNo + "]";
	}	
    
}
