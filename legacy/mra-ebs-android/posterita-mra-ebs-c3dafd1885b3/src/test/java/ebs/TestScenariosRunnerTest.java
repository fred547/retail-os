package ebs;

import org.junit.jupiter.api.Test;

import ebs.models.Seller;

public class TestScenariosRunnerTest {
	
	static String username = "Posterita";
	static String password = "P05t3r1t@";
	static String ebsMraId = "17466897910696WSXTRCC17B";
	static String areaCode = "100";
	
	@Test
	public void test() throws Exception {
		
		System.setProperty("MRA_PUBLIC_KEY_CERTIFICATE_PATH", "src/main/resources/PublicKey.crt");
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);	
		client.authenticate(true);
		
		Seller seller = new Seller();
		seller.setName("Posterita POS");
		seller.setTan("20351590");
		seller.setBrn("C07062336");
		seller.setBusinessAddr("Coromandel");
		seller.setEbsCounterNo("" + 10000);	
		
		TestScenariosRunner.run(client, seller);
	}

}
