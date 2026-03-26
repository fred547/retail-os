package ebs;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;

import com.fasterxml.jackson.databind.ObjectMapper;

import ebs.models.Invoice;
import ebs.models.Item;
import ebs.models.Seller;
import ebs.models.response.TransmitInvoiceResponse;

public class TestScenariosRunner {

	// -- for testing --
	public static void run(EbsMraClient client, Seller seller) throws Exception {

		Invoice[] invoices;
		Invoice invoice, refInvoice;
		TransmitInvoiceResponse response = null;

		//Scenario 1
		for (int i = 1; i <= 3; i++) {
			
			invoice = _getInvoiceSample(i);
			invoice.setSeller(seller);
			seller.setEbsCounterNo("" + i);

			response = client.transmitInvoice(new Invoice[] { invoice });
			System.out.println(response);
		}
		
		

		//Scenario 2
		refInvoice = _getInvoiceSample(4);
		seller.setEbsCounterNo("" + 4);
		refInvoice.setSeller(seller);
		response = client.transmitInvoice(new Invoice[] { refInvoice });
		
		System.out.println(response);

		// create debit note
		Invoice debitNote = _getInvoiceSample(5);
		seller.setEbsCounterNo("" + 5);
		debitNote.setInvoiceTypeDesc("DRN");
		debitNote.setInvoiceRefIdentifier(refInvoice.getInvoiceIdentifier());
		debitNote.setSeller(seller);
		response = client.transmitInvoice(new Invoice[] { debitNote });
		
		System.out.println(response);
		
		//Scenario 3
		refInvoice = _getInvoiceSample(6);
		seller.setEbsCounterNo("" + 6);
		refInvoice.setSeller(seller);
		response = client.transmitInvoice(new Invoice[] { refInvoice });
		
		System.out.println(response);

		// create credit note
		Invoice creditNote = _getInvoiceSample(7);
		seller.setEbsCounterNo("" + 7);
		creditNote.setInvoiceTypeDesc("CRN");
		creditNote.setInvoiceRefIdentifier(refInvoice.getInvoiceIdentifier());
		creditNote.setSeller(seller);
		response = client.transmitInvoice(new Invoice[] { creditNote });
		
		System.out.println(response);
		
		//Scenario 4
		invoices = new Invoice[10];

		for (int i = 0; i < 10; i++) {
			invoice = _getInvoiceSample(8 + i);
			seller.setEbsCounterNo("" + (8 + i));
			invoice.setSeller(seller);
			invoices[i] = invoice;
		}

		response = client.transmitInvoice(invoices);
		
		System.out.println(response);
		
		//Scenario 5
		invoice = _getInvoiceSample(18);
		seller.setEbsCounterNo("" + 18);
		invoice.setSeller(seller);

		Item item = invoice.getItemList().get(0);

		invoice.setTotalAmtPaid(item.getTotalPrice());
		invoice.setTotalVatAmount(item.getVatAmt());
		invoice.setTotalAmtWoVatCur(item.getAmtWoVatCur());
		invoice.setTotalAmtWoVatMur(item.getAmtWoVatMur());

		String tan = seller.getTan();
		invoice.getSeller().setTan("12345678");

		invoices = new Invoice[] { invoice };

		response = client.transmitInvoice(invoices);
		
		System.out.println(response);
		
		//restore tan
		seller.setTan(tan);
		
		//Scenario 6
		invoice = _getInvoiceSample(19);
		seller.setEbsCounterNo("" + 19);
		invoice.setInvoiceTypeDesc("PRF");
		invoice.setSeller(seller);
		
		response = client.transmitInvoice(new Invoice[] { invoice });
		
		System.out.println(response);
		
		//Scenario 7
		invoice = _getInvoiceSample(20);
		seller.setEbsCounterNo("" + 20);
		invoice.setInvoiceTypeDesc("TRN");
		invoice.setSeller(seller);
		
		response = client.transmitInvoice(new Invoice[] { invoice });
		System.out.println(response);

	}

	private static Invoice _getInvoiceSample(int count) throws Exception {

		ObjectMapper objectMapper = new ObjectMapper();		

		Invoice invoice = objectMapper.readValue(SAMPLE_INVOICE_TEMPLATE, Invoice.class);

		SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd HH:mm:ss");

		invoice.setDateTimeInvoiceIssued(sdf.format(new Date()));

		invoice.setInvoiceCounter("" + count);
		invoice.setInvoiceIdentifier(String.format("%06d", count));
		
		invoice.setInvoiceTotal(invoice.getTotalAmtPaid());
		invoice.setDiscountTotalAmount(new BigDecimal(0));

		return invoice;
	}

	static final String SAMPLE_INVOICE_TEMPLATE = "{" + 
			"  \"invoiceCounter\": \"1\"," + 
			"  \"transactionType\": \"B2C\"," + 
			"  \"personType\": \"VATR\"," + 
			"  \"invoiceTypeDesc\": \"STD\"," + 
			"  \"currency\": \"MUR\"," + 
			"  \"invoiceIdentifier\": \"abscs\"," + 
			"  \"invoiceRefIdentifier\": \"\"," + 
			"  \"previousNoteHash\": \"prevNote\"," + 
			"  \"reasonStated\": \"rgeegr\"," + 
			"  \"totalVatAmount\": \"60.0\"," + 
			"  \"totalAmtWoVatCur\": \"310.0\"," + 
			"  \"totalAmtWoVatMur\": \"310.0\"," + 
			"  \"totalAmtPaid\": \"360\"," + 
			"  \"dateTimeInvoiceIssued\": \"20230531 10:40:30\"," + 
			"  \"seller\": {" + 
			"    \"name\": \"Test User\"," + 
			"    \"tradeName\": \"TEST\"," + 
			"    \"tan\": \"1252XXXX\"," + 
			"    \"brn\": \"I080XXXXX\"," + 
			"    \"businessAddr\": \"Test address\"," + 
			"    \"businessPhoneNo\": \"\"," + 
			"    \"ebsCounterNo\": \"a1\"" + 
			"  }," + 
			"  \"buyer\": {" + 
			"    \"name\": \"Test user 2\"," + 
			"    \"tan\": \"\"," + 
			"    \"brn\": \"\"," + 
			"    \"businessAddr\": \"Test address 1\"," + 
			"    \"buyerType\": \"NVTR\"," + 
			"    \"nic\": \"\"" + 
			"  }," + 
			"  \"itemList\": [" + 
			"    {" + 
			"      \"itemNo\": \"1\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"dILAIT CONDENc 23\"," + 
			"      \"quantity\": \"23214\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"1.23\"," + 
			"      \"discountedValue\": \"10.1\"," + 
			"      \"amtWoVatCur\": \"60\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"10\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }," + 
			"    {" + 
			"      \"itemNo\": \"2\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"2\"," + 
			"      \"quantity\": \"3\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"0\"," + 
			"      \"discountedValue\": \"12.0\"," + 
			"      \"amtWoVatCur\": \"50\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"10\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }," + 
			"    {" + 
			"      \"itemNo\": \"3\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"2\"," + 
			"      \"quantity\": \"3\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"0\"," + 
			"      \"discountedValue\": \"12\"," + 
			"      \"amtWoVatCur\": \"50\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"10\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }," + 
			"    {" + 
			"      \"itemNo\": \"4\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"2\"," + 
			"      \"quantity\": \"3\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"0\"," + 
			"      \"discountedValue\": \"12.0\"," + 
			"      \"amtWoVatCur\": \"50\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"0\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }," + 
			"    {" + 
			"      \"itemNo\": \"5\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"2\"," + 
			"      \"quantity\": \"3\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"0\"," + 
			"      \"discountedValue\": \"12.6\"," + 
			"      \"amtWoVatCur\": \"50\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"0\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }," + 
			"    {" + 
			"      \"itemNo\": \"6\"," + 
			"      \"taxCode\": \"TC01\"," + 
			"      \"nature\": \"GOODS\"," + 
			"      \"productCodeMra\": \"pdtCode\"," + 
			"      \"productCodeOwn\": \"pdtOwn\"," + 
			"      \"itemDesc\": \"2\"," + 
			"      \"quantity\": \"3\"," + 
			"      \"unitPrice\": \"20\"," + 
			"      \"discount\": \"0\"," + 
			"      \"discountedValue\": \"12\"," + 
			"      \"amtWoVatCur\": \"50\"," + 
			"      \"amtWoVatMur\": \"50\"," + 
			"      \"vatAmt\": \"0\"," + 
			"      \"totalPrice\": \"60\"" + 
			"    }" + 
			"  ]," + 
			"  \"salesTransactions\": \"CASH\"," + 
			"  \"invoiceTotal\": \"360\"" + 
			"}";

}
