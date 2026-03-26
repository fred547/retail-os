package ebs;

public interface TokenRepository {
	
	public String token = null;
	public String tokenExpiryDate = null;
	public String secretKey = null;
	
	public String getToken();
	
	public void setToken(String token);
	
	public String getTokenExpiryDate();
	
	public void setTokenExpiryDate(String tokenExpiryDate);
	
	public String getSecretKey();
	
	public void setSecretKey(String secretKey);
	
	public boolean load();
	
	public boolean save();

}
