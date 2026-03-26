package ebs;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

@Disabled
public class InvoiceTest {
	
	@BeforeAll
	public static void setup() {
		//Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider()); 
	}
	
	@Test
	public void test() throws Exception {		
		
		/*
		
		String encryptKey = "YMm7fUo4+OJMViQKuD/3rvUPsp1SmVJlg0DjRgK+fc4="
		
		{
		  "status": "SUCCESS",
		  "responseId": "TK16946886553643514276461",
		  "requestId": "b0c55d35-7644-4715-b3c1-f93aa529f1b5",
		  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJQb3N0ZXJpdGEiLCJlYnNNcmFJZCI6IjE2OTQ0MTEyNDE1MzMwMFlCM0JNUjE2MSIsImV4cCI6MTY5NDc3NTA1NSwiaWF0IjoxNjk0Njg4NjU1fQ.rmlUXDNBcHFuEx54Rks3aQjD796xIZezryx7QFReLAleQlzrns-x1joUUWuisPnLddI7933JfoDKtd3N6yY9nA",
		  "key": "zsWDv7MXK1JPoQEQxnbQgr9ZFYPPz+YWU9zKBRFGyMdSFwmly+8kmWUiWjVfW+4x",
		  "expiryDate": "20230915 14:50:55"
		}
		 */
		
		SecretKeySpec localKey = new SecretKeySpec(Base64.getDecoder().decode("YMm7fUo4+OJMViQKuD/3rvUPsp1SmVJlg0DjRgK+fc4="), "AES");		
		Cipher cipher = Cipher.getInstance("AES/ECB/PKCS7Padding", "BC"); //Cipher.getInstance(" AES/ECB/PKCS5Padding");
		cipher.init(Cipher.DECRYPT_MODE, localKey);	    
		
		byte[] mraKey = cipher.doFinal(Base64.getDecoder().decode("zsWDv7MXK1JPoQEQxnbQgr9ZFYPPz+YWU9zKBRFGyMdSFwmly+8kmWUiWjVfW+4x"));
	    
	    //assertEquals(256, mraKey.length * 8);
		
		SecretKey sk = new SecretKeySpec(mraKey, "AES/ECB/PKCS7Padding");
		cipher.init(Cipher.ENCRYPT_MODE, sk);	
		cipher.doFinal("test".getBytes());
	}
	
	@Test
	public void test2() throws Exception {
		KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
        keyGenerator.init(256);
        SecretKey secretKey = keyGenerator.generateKey();

        // Convert the AES key to a byte array
        byte[] keyBytes = secretKey.getEncoded();
        
        System.out.println(Base64.getEncoder().encodeToString(keyBytes));
	}
	
	@Test
	public void test3() throws Exception {
		// Replace these strings with the Base64-encoded AES key and encrypted key received from the web service
        String base64EncodedAESKey = "YMm7fUo4+OJMViQKuD/3rvUPsp1SmVJlg0DjRgK+fc4=";
        String base64EncryptedKey = "zsWDv7MXK1JPoQEQxnbQgr9ZFYPPz+YWU9zKBRFGyMdSFwmly+8kmWUiWjVfW+4x";

        // Decode the Base64-encoded AES key
        byte[] aesKeyBytes = Base64.getDecoder().decode(base64EncodedAESKey);

        // Create a SecretKey from the AES key bytes
        SecretKey aesKey = new SecretKeySpec(aesKeyBytes, "AES");

        // Initialize the Cipher for decryption
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, aesKey);

        // Decode the Base64-encoded encrypted key
        byte[] encryptedKeyBytes = Base64.getDecoder().decode(base64EncryptedKey);

        // Decrypt the encrypted key using the AES key
        byte[] decryptedKeyBytes = cipher.doFinal(encryptedKeyBytes);

        // Convert the decrypted key bytes to a string
        String decryptedKey = new String(decryptedKeyBytes, StandardCharsets.UTF_8);

        // Print the decrypted key
        System.out.println("Decrypted Key: " + decryptedKey);
        
        //assertEquals(256, decryptedKeyBytes.length * 8);
	}
	
	@Test
	public void test4() throws Exception {
		
		 String base64EncodedAESKey = "CLtw2rWIVzmcnNFM3yZS1emPwpY0Vt77xsB0NZhX1cg=";
		
		// Decode the Base64-encoded AES key
        byte[] aesKeyBytes = Base64.getDecoder().decode(base64EncodedAESKey);
		SecretKey aesKey = new SecretKeySpec(aesKeyBytes, "AES");
		
		Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        
        String invoice = "[\n" + 
        		"  {\n" + 
        		"    \"transactionType\": \"B2C\",\n" + 
        		"    \"personType\": \"VATR\",\n" + 
        		"    \"invoiceTypeDesc\": \"STD\",\n" + 
        		"    \"invoiceIdentifier\": \"test1\",\n" + 
        		"    \"invoiceRefIdentifier\": \"\",\n" + 
        		"    \"previousNoteHash\": \"prevNote\",\n" + 
        		"    \"reasonStated\": \"return of product\",\n" + 
        		"    \"totalVatAmount\": \"3400\",\n" + 
        		"    \"totalAmtWoVat\": \"3000\",\n" + 
        		"    \"totalAmtPaid\": \"6400\",\n" + 
        		"    \"dateTimeInvoiceIssued\": \"20221012 10:40:30\",\n" + 
        		"    \"seller\": {\n" + 
        		"      \"name\": \"Posterita POS\",\n" + 
        		"      \"tan\": \"20351590\",\n" + 
        		"      \"brn\": \"C07062336\",\n" + 
        		"      \"businessAdd\": \"Triolet\",\n" + 
        		"      \"businessPhoneNum\": \"2076000\",\n" + 
        		"      \"counterNum\": \"1\"\n" + 
        		"    },\n" + 
        		"    \"buyer\": {\n" + 
        		"      \"name\": \"James\",\n" + 
        		"      \"tan\": \"12345678\",\n" + 
        		"      \"brn\": \"\",\n" + 
        		"      \"businessAdd\": \"\",\n" + 
        		"      \"buyerType\": \"01\",\n" + 
        		"      \"nic\": \"\"\n" + 
        		"    },\n" + 
        		"    \"itemList\": [\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"10\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      },\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"10\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      },\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"10\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      },\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"0\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      },\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"0\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      },\n" + 
        		"      {\n" + 
        		"        \"taxCode\": \"01\",\n" + 
        		"        \"nature\": \"GOODS\",\n" + 
        		"        \"currency\": \"MUR\",\n" + 
        		"        \"itemCode\": \"1\",\n" + 
        		"        \"itemDesc\": \"2\",\n" + 
        		"        \"quantity\": \"3\",\n" + 
        		"        \"unitPrice\": \"20\",\n" + 
        		"        \"discount\": \"0\",\n" + 
        		"        \"amtWoVat\": \"50\",\n" + 
        		"        \"tds\": \"5\",\n" + 
        		"        \"vatAmt\": \"0\",\n" + 
        		"        \"totalPrice\": \"60\"\n" + 
        		"      }\n" + 
        		"    ],\n" + 
        		"    \"salesTransactions\": \"CASH\",\n" + 
        		"    \"paymentMethods\": \"CASH\"\n" + 
        		"  }\n" + 
        		"]";
        
        byte[] b = cipher.doFinal(invoice.getBytes());
        System.out.println(Base64.getEncoder().encodeToString(b));
        
        //Arrays.asList(a)
		
	}

}
