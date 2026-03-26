package org.posterita.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.OrderException;

public class OrderTest {
	
	@BeforeAll
	public static void setUp() throws DatabaseException {
		Database.initialize();
	}
	
	@Test
	public void testTableIdBeingOverwritten() throws Exception {
		
		String raw = "{\"orderType\":\"POS Order\",\"salesRep\":\"Admin\",\"loyaltyPointsEarned\":0,\"orderId\":\"0\",\"taxTotal\":\"0.00\",\"c_location_id\":10153170,\"subTotal\":\"790.00\",\"uuid\":\"7f4bd3ed-eb1e-441e-9935-e04d0c88cefc\",\"tenderType\":\"Cash\",\"dateOrdered\":\"2022-12-23 10:48:56\",\"orderTaxes\":[{\"taxId\":10013944,\"taxAmt\":\"0.000\"}],\"id\":\"7f4bd3ed-eb1e-441e-9935-e04d0c88cefc\",\"currencyId\":280,\"grandTotal\":\"790.00\",\"ad_user_id\":10162858,\"qtyTotal\":\"1\",\"version\":\"2.0\",\"offlineDocumentNo\":\"00000001\",\"warehouseId\":10008164,\"deliveryRule\":\"O\",\"ad_org_name\":\"Doodland Cafe\",\"taxId\":10013944,\"status\":\"\",\"tipAmt\":0,\"discountAmt\":\"0.00\",\"signature\":\"\",\"posVersion\":\"20220323_1320\",\"javaVersion\":\"1.8.0_51\",\"payments\":[],\"docStatusName\":\"Drafted\",\"terminalId\":10008013,\"orgId\":10007701,\"scheduledDeliveryDate\":\"\",\"documentNo\":\"00000001\",\"splitSalesReps\":[{\"amount\":\"790.00\",\"name\":\"Admin\",\"id\":10162861}],\"salesRepId\":10162861,\"lines\":[{\"discountAmt\":\"0.00\",\"priceStd\":\"790.00\",\"shoppingCartLineId\":0,\"editable\":true,\"description\":\"2020 Festive Menu Rs.790\",\"upc\":\"\",\"priceLimit\":\"790.00\",\"u_pos_discountcode_id\":0,\"modifiers\":[],\"productName\":\"2020 Festive Menu Rs.790\",\"priceList\":\"790.00\",\"discountMessage\":null,\"producttype\":\"I\",\"qtyEntered\":\"1\",\"taxId\":10013944,\"salesrep_id\":null,\"c_uom_id\":100,\"id\":10918061,\"priceEntered\":\"790.00\",\"taxAmt\":\"0.00\",\"lineNetAmt\":\"790.00\",\"boms\":[],\"timestamp\":1671778135144}],\"c_bpartner_location_id\":10141703,\"timestamp\":1671778136335,\"c_currency_name\":\"Rs\",\"paymentTermId\":0,\"offlineOrderId\":\"\",\"clientId\":10006608,\"comments\":[],\"referenceNo\":\"Table #0\",\"priceListId\":10013597,\"movementDate\":\"\",\"javaVendor\":\"Oracle Corporation\",\"bpName\":\"Walk-in Customer\",\"docAction\":\"DR\",\"bpartnerId\":10147953,\"commandInfo\":{\"orderId\":0,\"tableId\":0,\"type\":\"D\"}}";
		
		String uuid = UUID.randomUUID().toString();
		
		JSONObject initial = new JSONObject(raw);
		initial.put("id", uuid);
		initial.put("uuid", uuid);
		
		Order.saveOrder(initial.toString());
		
		JSONObject commandInfo = initial.getJSONObject("commandInfo");
		commandInfo.put("tableId", 1);
		
		initial.put("commandInfo", commandInfo);
		
		OrderException ex = assertThrows(OrderException.class, () -> {
			Order.saveOrder(initial.toString());
		});
		
		assertEquals("Cannot overwrite order tableId! Previous: 0 -> Current: 1", ex.getMessage());
		
	}

}
