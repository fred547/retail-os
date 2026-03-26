package ebs;

import static org.junit.Assert.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.Base64;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

import ebs.exceptions.CertificateException;
import ebs.models.Invoice;
import ebs.models.response.AuthenticateResponse;
import ebs.models.response.TransmitInvoiceResponse;

public class EbsMraClientTest {
		
	private String username = "Posterita";
	private String password = "P05t3r1t@"; 
	private String ebsMraId = "169441124153300YB3BMR161";
	private String areaCode = "100"; 
	private boolean refreshToken = false;
	
	@BeforeEach
	public void beforeEach() {
		System.setProperty("MRA_PUBLIC_KEY_CERTIFICATE_PATH", "src/main/resources/PublicKey.crt");
	}
	
	@Test
	public void thrownErrorIfCertificateNotConfigured() {
		
		System.setProperty("MRA_PUBLIC_KEY_CERTIFICATE_PATH", "");
		
		CertificateException ex = assertThrows(CertificateException.class, () -> {
			
			EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);			
			client.encryptUsingMraRSACertificate("");
			
		});
		assertEquals("Environment variable: MRA_PUBLIC_KEY_CERTIFICATE_PATH not found!", ex.getMessage());
		
	}
	
	@Test
	public void thrownErrorIfCertificateNotFound() {
		
		System.setProperty("MRA_PUBLIC_KEY_CERTIFICATE_PATH", "/tmp/xxxx.crt");
		
		CertificateException ex = assertThrows(CertificateException.class, () -> {
			
			EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);			
			client.encryptUsingMraRSACertificate("");
			
		});
		assertEquals("Certificate /tmp/xxxx.crt not found!", ex.getMessage());
		
	}	
	
	@Test
	public void encryptUsingMRAPublicKey() {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);	
		
		assertDoesNotThrow(()-> {
			String message = "Hello world!";
			
			String base64 = Base64.getEncoder().encodeToString(client.encryptUsingMraRSACertificate(message));
			assertNotNull(base64);
		});
		
	}
	
	@Test
	public void generateRandomAESkey() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);
		
		String key = client.generateRandomAESkey();
		
		assertNotNull(key);
		assertEquals(44, key.length());
	}
	
	@Test
	public void getTokenErrorWrongAccountAndEbsId() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, "wrong id", areaCode);
		
		AuthenticateResponse response = client.authenticate(refreshToken);
		
		assertEquals("ERROR", response.getStatus());
		//assertEquals("Invalid Header Request", response.getErrors()[0]);
	}
	
	@Test
	public void getTokenError() throws Exception {
		
		EbsMraClient client = new EbsMraClient("wrong user", "wrong password", ebsMraId, areaCode);
		
		AuthenticateResponse response = client.authenticate(refreshToken);
		
		assertEquals("ERROR", response.getStatus());
		//assertEquals("Invalid Header Request", response.getErrors()[0]);
	}
	
	@Test
	public void getTokenErrorWrongEbsId() throws Exception {
		
		EbsMraClient client = new EbsMraClient("wrong user", "wrong password", "wrong id", areaCode);
		
		AuthenticateResponse response = client.authenticate(refreshToken);
		
		assertEquals("ERROR", response.getStatus());
		//assertEquals("Invalid Header Request", response.getErrors()[0]);
	}
	
	
	@Test
	public void getTokenSuccess() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);
		
		AuthenticateResponse response = client.authenticate(refreshToken);	
		System.out.println(response);
		assertEquals("SUCCESS", response.getStatus());
	}
	
	@Test
	public void refreshToken() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);
		
		AuthenticateResponse response = client.authenticate(true);					
		assertEquals("SUCCESS", response.getStatus());
	}
	
	@Test
	public void decryptTokenKey() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);
		
		String base64EncodedAESKey = "YMm7fUo4+OJMViQKuD/3rvUPsp1SmVJlg0DjRgK+fc4=";
        String base64EncryptedKey = "zsWDv7MXK1JPoQEQxnbQgr9ZFYPPz+YWU9zKBRFGyMdSFwmly+8kmWUiWjVfW+4x";
		
		String decryptedKey = client.decryptTokenKey(base64EncodedAESKey, base64EncryptedKey);
		
		assertNotNull(decryptedKey);
		//assertEquals(44, decryptedKey.length());
		assertEquals("CLtw2rWIVzmcnNFM3yZS1emPwpY0Vt77xsB0NZhX1cg=", decryptedKey);
	}
	
	@Test
	public void decryptNewTokenKey() throws Exception {
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);
		
		AuthenticateResponse response = client.authenticate(true);
		
		String tokenKey = response.getKey();
		
		assertNotNull(tokenKey);
		assertEquals(44, tokenKey.length());
	}
	
	@Test
	public void testData() throws Exception {
		
		Invoice invoice = TEST_DATA.getSampleInvoice(2);
		System.out.println(invoice.getInvoiceIdentifier());
	}
	
	@Test
	public void transmitInvoice() throws Exception {		
		
		EbsMraClient client = new EbsMraClient(username, password, ebsMraId, areaCode);		
		client.authenticate(false);		
		
		Invoice[] invoices = new Invoice[]{ TEST_DATA.getSampleInvoice(3) };
		
		TransmitInvoiceResponse result = client.transmitInvoice(invoices);		
		
		System.out.println(Arrays.toString(invoices));
		System.out.println(result);
		
		assertEquals("SUCCESS", result.getStatus());
	}
	
	@Test
	public void simple() {
		
		try {
            String urlString = "https://vfisc.mra.mu/einvoice-token-service/token-api/generate-token";
            String username = "your_username";
            String ebsMraId = "your_ebsMraId";
            String areaCode = "your_areaCode";
            String requestBody = "{}";

            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("username", username);
            connection.setRequestProperty("ebsMraId", ebsMraId);
            connection.setRequestProperty("areaCode", areaCode);
            connection.setRequestProperty("Content-Type", "application/json");

            // Enable input/output streams for sending/receiving data
            connection.setDoOutput(true);

            // Write the request body
            OutputStream os = connection.getOutputStream();
            byte[] input = requestBody.getBytes("utf-8");
            os.write(input, 0, input.length);
            os.flush();
            os.close();

            // Get the response code
            int responseCode = connection.getResponseCode();

            BufferedReader in;
            if (responseCode >= 400) {
                // For 4xx and 5xx status codes, read error stream
                in = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            } else {
                // For 2xx status codes, read input stream
                in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            }

            String inputLine;
            StringBuilder response = new StringBuilder();

            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();

            if (responseCode == HttpURLConnection.HTTP_OK) {
                // Handle a successful response (status code 200)
                System.out.println("Response: " + response.toString());
            } else {
                // Handle other responses, including 400 Bad Request
                System.err.println("HTTP Error: " + responseCode);
                System.err.println("Response: " + response.toString());
            }

            connection.disconnect();
        } catch (IOException e) {
            // Handle the IOException, which represents a 4xx or 5xx response
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
		
	}
	
	@Test
	public void repository() {
		
		
	}
	
	static TokenRepository repository = new TokenRepository() {
		
		@Override
		public void setTokenExpiryDate(String tokenExpiryDate) {
			// TODO Auto-generated method stub
			
		}
		
		@Override
		public void setToken(String token) {
			// TODO Auto-generated method stub
			
		}
		
		@Override
		public void setSecretKey(String secretKey) {
			// TODO Auto-generated method stub
			
		}
		
		@Override
		public boolean save() {
			// TODO Auto-generated method stub
			return false;
		}
		
		@Override
		public boolean load() {
			// TODO Auto-generated method stub
			return false;
		}
		
		@Override
		public String getTokenExpiryDate() {
			// TODO Auto-generated method stub
			return null;
		}
		
		@Override
		public String getToken() {
			// TODO Auto-generated method stub
			return null;
		}
		
		@Override
		public String getSecretKey() {
			// TODO Auto-generated method stub
			return null;
		}
	};

}
