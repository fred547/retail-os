package ebs.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Buyer {
    @JsonProperty("name")
    private String name;

    @JsonProperty("tan")
    private String tan;

    @JsonProperty("brn")
    private String brn;

    @JsonProperty("businessAddr")
    private String businessAddr;

    @JsonProperty("buyerType")
    private String buyerType;

    @JsonProperty("nic")
    private String nic;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
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

	public String getBuyerType() {
		return buyerType;
	}

	public void setBuyerType(String buyerType) {
		this.buyerType = buyerType;
	}

	public String getNic() {
		return nic;
	}

	public void setNic(String nic) {
		this.nic = nic;
	}

	@Override
	public String toString() {
		return "Buyer [name=" + name + ", tan=" + tan + ", brn=" + brn + ", businessAddr=" + businessAddr
				+ ", buyerType=" + buyerType + ", nic=" + nic + "]";
	}	
    
}
