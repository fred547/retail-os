package ebs;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import ebs.models.Invoice;
import ebs.models.Seller;

public class TEST_DATA {
	
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
			"  \"totalAmtWoVatMur\": \"10\"," + 
			"  \"totalAmtPaid\": \"360\"," + 
			"  \"invoiceTotal\": \"360\"," +
			"  \"discountTotalAmount\": \"0\"," +
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
			"  \"salesTransactions\": \"CASH\"" + 
			"}";
	
	public static Invoice getSampleInvoice(int count) throws JsonMappingException, JsonProcessingException {
		
		ObjectMapper objectMapper = new ObjectMapper();		
		
		Invoice invoice = objectMapper.readValue(SAMPLE_INVOICE_TEMPLATE, Invoice.class);
		
		SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd HH:mm:ss");
		
		invoice.setDateTimeInvoiceIssued(sdf.format(new Date()));
		
		invoice.setInvoiceCounter("" + count);
		invoice.setInvoiceIdentifier(String.format("%06d", count));
		invoice.setInvoiceTotal(invoice.getTotalAmtPaid());
		invoice.setDiscountTotalAmount(new BigDecimal(0));
		
		Seller seller = invoice.getSeller();
		seller.setName("Posterita POS");
		seller.setTan("20351590");
		seller.setBrn("C07062336");
		seller.setBusinessAddr("Coromandel");
		seller.setEbsCounterNo("" + count);		

		
		return invoice;
	}

}
