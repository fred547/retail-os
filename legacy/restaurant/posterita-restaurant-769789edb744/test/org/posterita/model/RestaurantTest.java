package org.posterita.model;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.posterita.database.Database;
import org.posterita.exception.DatabaseException;
import org.posterita.exception.RestaurantException;

public class RestaurantTest {
	
	@BeforeAll
	public static void setUp() throws DatabaseException {
		Database.initialize();
	}
	
	@BeforeEach
	@AfterEach
	public void resetTables() throws DatabaseException {
		Database.executeUpdate("update tables set status = 'A', order_id = null, parent_table_id = null, waiter = null, last_updated = CURRENT_TIMESTAMP");
	}
	
	@Test
	public void getAvailableTables() throws Exception {
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(100, array.length());
	}
	
	@Test
	public void reserveTable() throws Exception {
		
		int table_id = 0;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		
		Restaurant.reserveTable(table_id, ad_user_id, terminal_id, identifier);
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(99, array.length());
		
		String s = Database.get("TABLES", table_id + "");
		JSONObject table = new JSONObject(s);
		
		assertEquals("R", table.getString("status"));
		assertEquals("Admin", table.getString("waiter"));
		
		assertDoesNotThrow(() -> {
			Restaurant.reserveTable(table_id, ad_user_id, terminal_id, identifier);
		});
		
		//test RESTAURANT_LOG
		
	}
	
	@Test
	public void cancelReservation() throws Exception {
		
		int table_id = 0;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		
		Restaurant.reserveTable(table_id, ad_user_id, terminal_id, identifier);
		
		//cancel reservation
		Restaurant.cancelReservation(table_id, ad_user_id, terminal_id, identifier);
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(100, array.length());
		
		String s = Database.get("TABLES", table_id + "");
		JSONObject table = new JSONObject(s);
		
		assertEquals("A", table.getString("status"));
		assertEquals("", table.getString("waiter"));
		
	}
	
	@Test
	public void clearTable() throws Exception {
		
		int table_id = 0;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		
		Restaurant.reserveTable(table_id, ad_user_id, terminal_id, identifier);
		
		//cancel reservation
		Restaurant.clearTable(table_id, ad_user_id, terminal_id, identifier);
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(100, array.length());
		
		String s = Database.get("TABLES", table_id + "");
		JSONObject table = new JSONObject(s);
		
		assertEquals("A", table.getString("status"));
		assertEquals("", table.getString("waiter"));
		
	}
	
	@Test
	public void switchTable() throws Exception {
		
		int from_table_id = 0;
		int to_table_id = 1;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String status = "O";
		
		String raw = "{\"orderType\":\"POS Order\",\"salesRep\":\"Admin\",\"loyaltyPointsEarned\":0,\"orderId\":\"0\",\"taxTotal\":\"0.00\",\"c_location_id\":10153170,\"subTotal\":\"790.00\",\"uuid\":\"7f4bd3ed-eb1e-441e-9935-e04d0c88cefc\",\"tenderType\":\"Cash\",\"dateOrdered\":\"2022-12-23 10:48:56\",\"orderTaxes\":[{\"taxId\":10013944,\"taxAmt\":\"0.000\"}],\"id\":\"7f4bd3ed-eb1e-441e-9935-e04d0c88cefc\",\"currencyId\":280,\"grandTotal\":\"790.00\",\"ad_user_id\":10162858,\"qtyTotal\":\"1\",\"version\":\"2.0\",\"offlineDocumentNo\":\"00000001\",\"warehouseId\":10008164,\"deliveryRule\":\"O\",\"ad_org_name\":\"Doodland Cafe\",\"taxId\":10013944,\"status\":\"\",\"tipAmt\":0,\"discountAmt\":\"0.00\",\"signature\":\"\",\"posVersion\":\"20220323_1320\",\"javaVersion\":\"1.8.0_51\",\"payments\":[],\"docStatusName\":\"Drafted\",\"terminalId\":10008013,\"orgId\":10007701,\"scheduledDeliveryDate\":\"\",\"documentNo\":\"00000001\",\"splitSalesReps\":[{\"amount\":\"790.00\",\"name\":\"Admin\",\"id\":10162861}],\"salesRepId\":10162861,\"lines\":[{\"discountAmt\":\"0.00\",\"priceStd\":\"790.00\",\"shoppingCartLineId\":0,\"editable\":true,\"description\":\"2020 Festive Menu Rs.790\",\"upc\":\"\",\"priceLimit\":\"790.00\",\"u_pos_discountcode_id\":0,\"modifiers\":[],\"productName\":\"2020 Festive Menu Rs.790\",\"priceList\":\"790.00\",\"discountMessage\":null,\"producttype\":\"I\",\"qtyEntered\":\"1\",\"taxId\":10013944,\"salesrep_id\":null,\"c_uom_id\":100,\"id\":10918061,\"priceEntered\":\"790.00\",\"taxAmt\":\"0.00\",\"lineNetAmt\":\"790.00\",\"boms\":[],\"timestamp\":1671778135144}],\"c_bpartner_location_id\":10141703,\"timestamp\":1671778136335,\"c_currency_name\":\"Rs\",\"paymentTermId\":0,\"offlineOrderId\":\"\",\"clientId\":10006608,\"comments\":[],\"referenceNo\":\"Table #0\",\"priceListId\":10013597,\"movementDate\":\"\",\"javaVendor\":\"Oracle Corporation\",\"bpName\":\"Walk-in Customer\",\"docAction\":\"DR\",\"bpartnerId\":10147953,\"commandInfo\":{\"orderId\":0,\"tableId\":0,\"type\":\"D\"}}";
		
		String uuid = UUID.randomUUID().toString();
		String order_id = uuid;
		
		JSONObject initial = new JSONObject(raw);
		initial.put("id", uuid);
		initial.put("uuid", uuid);
		
		Order.saveOrder(initial.toString());
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, from_table_id });		
		
		Restaurant.switchTable(from_table_id, to_table_id, ad_user_id, terminal_id, identifier);
		
		//check if table in order has been updated
		raw = Database.get("ORDERS", order_id);
		JSONObject updated = new JSONObject(raw);
		
		JSONObject commandInfo = updated.getJSONObject("commandInfo");
		assertEquals("1", commandInfo.getString("tableId"));
		
		String s = Database.get("TABLES", from_table_id + "");
		
		JSONObject table = new JSONObject(s);		
		assertEquals("A", table.getString("status"));
		assertEquals("", table.getString("waiter"));
		assertEquals("", table.getString("order_id"));
		
		s = Database.get("TABLES", to_table_id + "");
		
		table = new JSONObject(s);		
		assertEquals(status, table.getString("status"));
		assertEquals("Admin", table.getString("waiter"));
		assertEquals(order_id, table.getString("order_id"));
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(99, array.length());
		
	}
	
	@Test
	public void switchToTableThatIsNotAvailable() throws Exception {
		
		int from_table_id = 0;
		int to_table_id = 1;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String order_id = "order-123";
		String status = "O";
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, to_table_id });
		
		RestaurantException ex = assertThrows(RestaurantException.class, () -> {
			Restaurant.switchTable(from_table_id, to_table_id, ad_user_id, terminal_id, identifier);
		});
		
		assertEquals("Table #1 is not available!", ex.getMessage());
				
	}
	
	@Test
	public void mergeTable() throws Exception {
		
		int to_table_id = 0;
		String tableIdsToMerge = "1,2";
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String order_id = "order-123";
		String status = "O";
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, to_table_id });
		
		Restaurant.mergeTables(to_table_id, tableIdsToMerge, ad_user_id, terminal_id, identifier);
		
		String[] ids = tableIdsToMerge.split(",");
		
		for(String id : ids) {
			
			int parent_id = Database.getSqlValueAsInt("select parent_table_id from tables where table_id = " + id, null);
			assertEquals(to_table_id, parent_id);
		}
	}
	
	@Test
	public void mergeTableThatIsNotAvailable() throws Exception {
		
		int to_table_id = 0;
		String tableIdsToMerge = "1,2";
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String order_id = "order-123";
		String status = "O";
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, to_table_id });
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, 1 });
		
		RestaurantException ex = assertThrows(RestaurantException.class, () -> {
			Restaurant.mergeTables(to_table_id, tableIdsToMerge, ad_user_id, terminal_id, identifier);
		});
		
		assertEquals("Tables [1,2] may not be available!", ex.getMessage());
		
	}
	
	@Test
	public void clearMergedTable() throws Exception {
		
		int to_table_id = 0;
		String tableIdsToMerge = "1,2";
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String order_id = "order-123";
		String status = "O";
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, to_table_id });
		
		Restaurant.mergeTables(to_table_id, tableIdsToMerge, ad_user_id, terminal_id, identifier);
		
		JSONArray array = Restaurant.getAvailableTables();
		assertEquals(97, array.length());
		
		Restaurant.clearTable(to_table_id, ad_user_id, terminal_id, identifier);
		
		array = Restaurant.getAvailableTables();
		assertEquals(100, array.length());
	}
	
	@Test
	public void voidOrderTable() throws Exception {
		
		int table_id = 0;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String order_id = "order-123";
		String status = "O";
		
		//assign order to table
		Database.executeUpdate("update tables set status = ? , order_id = ? where table_id = ?", new Object[]{ status, order_id, table_id });
		
		Restaurant.voidOrder(order_id, table_id, ad_user_id, terminal_id, identifier);
		
		String s = Database.get("TABLES", table_id + "");
		
		JSONObject table = new JSONObject(s);		
		assertEquals("A", table.getString("status"));
		assertEquals("", table.getString("waiter"));
		assertEquals("", table.getString("order_id"));
	}
	
	@Test
	public void updateTableStatus() throws Exception {
		
		int table_id = 0;
		int ad_user_id = 10162861;
		int terminal_id = 10008013;
		String identifier = "test";
		String status = "O";
		
		Restaurant.updateTableStatus(table_id, status, ad_user_id, terminal_id, identifier);
		
		String s = Database.get("TABLES", table_id + "");
		
		JSONObject table = new JSONObject(s);		
		assertEquals("O", table.getString("status"));
	}

}
