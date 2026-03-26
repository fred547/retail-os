package ebs.models.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ErrorMessage {
	
	@JsonProperty("code")
	@JsonAlias("Code")
	private String code;

	@JsonProperty("description")
	@JsonAlias("Description")
	private String description;

	public ErrorMessage() {

	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	@Override
	public String toString() {
		return "ErrorMessage [code=" + code + ", description=" + description + "]";
	}	

}
