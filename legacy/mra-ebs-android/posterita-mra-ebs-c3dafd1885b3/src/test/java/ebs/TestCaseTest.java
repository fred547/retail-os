package ebs;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import ebs.models.Invoice;
import ebs.models.Item;
import ebs.models.response.ErrorMessage;
import ebs.models.response.FiscalisedInvoice;
import ebs.models.response.TransmitInvoiceResponse;

public class TestCaseTest {

	static String username = "Posterita";
	static String password = "P05t3r1t@";
	static String ebsMraId = "17046958415903J3TJKY213B";
	static String areaCode = "100";
	
	static EbsMraClient EBS_MRA_CLIENT;

	@BeforeAll
	public static void autenticate() throws Exception {
		
		System.setProperty("MRA_PUBLIC_KEY_CERTIFICATE_PATH", "src/main/resources/PublicKey.crt");
		
		EBS_MRA_CLIENT = new EbsMraClient(username, password, ebsMraId, areaCode);	
		EBS_MRA_CLIENT.authenticate(true);
	}

	@Test
	/**
	 * Test case 1 Submit 1 invoice (Standard) with 6 items 3 out of 6 items in an
	 * invoice should be VATable 3 out of 6 items in an invoice should not be
	 * VATable The JSON attribute invoiceTypeDesc should contain value STD The test
	 * should be repeated 3 times with 3 different Invoice Identifier
	 */
	public void testcase1() throws Exception {

		for (int i = 1; i <= 3; i++) {

			Invoice[] invoices = new Invoice[] { TEST_DATA.getSampleInvoice(i) };

			TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

			System.out.println(response);

			assertEquals("SUCCESS", response.getStatus());

			for (FiscalisedInvoice finv : response.getFiscalisedInvoices()) {
				assertEquals("SUCCESS", finv.getStatus());
			}
		}

	}

	@Test
	/**
	 * Submit 1 invoice (Debit Note) with 1 item The JSON attribute invoiceTypeDesc
	 * should contain value DRN The JSON attribute invoiceRefIdentifier should
	 * reference the invoiceIdentifier of an existing invoice having Invoice Status
	 * FISCALISED and test result PASS.
	 */
	public void testcase2() throws Exception {

		Invoice refInvoice = TEST_DATA.getSampleInvoice(4);

		Invoice[] invoices = new Invoice[] { refInvoice };

		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		FiscalisedInvoice finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

		// create debit note
		Invoice debitNote = TEST_DATA.getSampleInvoice(5);
		debitNote.setInvoiceTypeDesc("DRN");
		debitNote.setInvoiceRefIdentifier(refInvoice.getInvoiceIdentifier());

		invoices = new Invoice[] { debitNote };

		response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

	}

	@Test
	/**
	 * Submit 1 invoice (Credit Note) with 1 item The JSON attribute invoiceTypeDesc
	 * should contain value CRN The JSON attribute invoiceRefIdentifier should
	 * reference the invoiceIdentifier of an existing invoice having Invoice Status
	 * FISCALISED and test result PASS.
	 * 
	 * @throws Exception
	 */
	public void testcase3() throws Exception {

		Invoice refInvoice = TEST_DATA.getSampleInvoice(6);

		Invoice[] invoices = new Invoice[] { refInvoice };

		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		FiscalisedInvoice finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

		// create debit note
		Invoice debitNote = TEST_DATA.getSampleInvoice(7);
		debitNote.setInvoiceTypeDesc("CRN");
		debitNote.setInvoiceRefIdentifier(refInvoice.getInvoiceIdentifier());

		invoices = new Invoice[] { debitNote };

		response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

	}

	@Test
	/**
	 * Submit 10 invoices in 1 request with a minimum of 1 item in each invoice
	 * Please ensure to test both VATable and non-VATable items in each invoice
	 */
	public void testcase4() throws Exception {

		Invoice[] invoices = new Invoice[10];

		for (int i = 0; i < 10; i++) {

			invoices[i] = TEST_DATA.getSampleInvoice(8 + i);

		}

		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		for (FiscalisedInvoice finv : response.getFiscalisedInvoices()) {
			assertEquals("SUCCESS", finv.getStatus());
		}

	}

	@Test
	/**
	 * Submit 1 invoice (Standard) with 1 item The JSON attribute invoiceTypeDesc
	 * should contain value STD The JSON attribute seller.tan should have a value
	 * other than the TAN of the user. The test should be carried out using the
	 * Invoice Transmission API The test case is for a failed scenario
	 */
	public void testcase5() throws Exception {

		Invoice invoice = TEST_DATA.getSampleInvoice(18);

		Item item = invoice.getItemList().get(0);

		invoice.setTotalAmtPaid(item.getTotalPrice());
		invoice.setTotalVatAmount(item.getVatAmt());
		invoice.setTotalAmtWoVatCur(item.getAmtWoVatCur());
		invoice.setTotalAmtWoVatMur(item.getAmtWoVatMur());

		invoice.getSeller().setTan("12345678");

		Invoice[] invoices = new Invoice[] { invoice };

		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("ERROR", response.getStatus());
		
		FiscalisedInvoice finv = response.getFiscalisedInvoices()[0];

		assertEquals("ERROR", finv.getStatus());
		
		ErrorMessage[] errors = finv.getErrorMessages();
		assertEquals(1, errors.length);		
		
		
		assertEquals("ERR0500", errors[0].getCode());
		assertEquals("TAN of registered user does not match with TAN of seller in invoice details", errors[0].getDescription());
		

	}

	@Test
	/**
		Submit 1 invoice (Proforma) with at least 2 items
		The JSON attribute invoiceTypeDesc should contain value PRF
	 */
	public void testcase6() throws Exception {
		
		// create proforma
		Invoice proforma = TEST_DATA.getSampleInvoice(19);
		proforma.setInvoiceTypeDesc("PRF");

		Invoice[] invoices = new Invoice[] { proforma };
		
		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		FiscalisedInvoice finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

	}

	@Test
	/**
		Submit 1 invoice (TRAINING) with at least 2 items
		The JSON attribute invoiceTypeDesc should contain value TRN
	 */
	public void testcase7() throws Exception {
		
		// create proforma
		Invoice proforma = TEST_DATA.getSampleInvoice(20);
		proforma.setInvoiceTypeDesc("TRN");

		Invoice[] invoices = new Invoice[] { proforma };
		
		TransmitInvoiceResponse response = EBS_MRA_CLIENT.transmitInvoice(invoices);

		System.out.println(response);

		assertEquals("SUCCESS", response.getStatus());

		FiscalisedInvoice finv = response.getFiscalisedInvoices()[0];
		assertEquals("SUCCESS", finv.getStatus());

	}

}
