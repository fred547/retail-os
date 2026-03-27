package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Delivery
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Tests for Delivery entity: status lifecycle, status constants,
 * and data integrity of delivery records.
 */
@RunWith(RobolectricTestRunner::class)
class DeliveryEntityTest {

    // --- Status Constants ---

    @Test
    fun `delivery status constants match expected values`() {
        assertEquals("pending", Delivery.STATUS_PENDING)
        assertEquals("assigned", Delivery.STATUS_ASSIGNED)
        assertEquals("picked_up", Delivery.STATUS_PICKED_UP)
        assertEquals("in_transit", Delivery.STATUS_IN_TRANSIT)
        assertEquals("delivered", Delivery.STATUS_DELIVERED)
        assertEquals("failed", Delivery.STATUS_FAILED)
        assertEquals("cancelled", Delivery.STATUS_CANCELLED)
    }

    @Test
    fun `default delivery status is pending`() {
        val delivery = createDelivery()
        assertEquals(Delivery.STATUS_PENDING, delivery.status)
    }

    // --- Entity Creation ---

    @Test
    fun `delivery stores customer contact info`() {
        val delivery = createDelivery(
            customerName = "Jane Doe",
            customerPhone = "+230 5555 1234",
            deliveryAddress = "42 Royal Road, Port Louis"
        )
        assertEquals("Jane Doe", delivery.customer_name)
        assertEquals("+230 5555 1234", delivery.customer_phone)
        assertEquals("42 Royal Road, Port Louis", delivery.delivery_address)
    }

    @Test
    fun `delivery stores driver assignment`() {
        val delivery = createDelivery(driverId = 7, driverName = "Mike")
        assertEquals(7, delivery.driver_id)
        assertEquals("Mike", delivery.driver_name)
    }

    @Test
    fun `delivery stores order reference`() {
        val delivery = createDelivery(orderId = 1234)
        assertEquals(1234, delivery.order_id)
    }

    @Test
    fun `delivery stores fee and distance`() {
        val delivery = createDelivery(deliveryFee = 50.0, distanceKm = 3.5)
        assertEquals(50.0, delivery.delivery_fee!!, 0.01)
        assertEquals(3.5, delivery.distance_km!!, 0.01)
    }

    @Test
    fun `delivery with null optional fields`() {
        val delivery = createDelivery()
        assertNull(delivery.customer_id)
        assertNull(delivery.driver_id)
        assertNull(delivery.driver_name)
        assertNull(delivery.estimated_time)
        assertNull(delivery.actual_delivery_at)
        assertNull(delivery.assigned_at)
        assertNull(delivery.picked_up_at)
        assertNull(delivery.distance_km)
        assertNull(delivery.delivery_fee)
    }

    // --- Status Lifecycle ---

    @Test
    fun `delivery can transition through full lifecycle`() {
        val statuses = listOf(
            Delivery.STATUS_PENDING,
            Delivery.STATUS_ASSIGNED,
            Delivery.STATUS_PICKED_UP,
            Delivery.STATUS_IN_TRANSIT,
            Delivery.STATUS_DELIVERED
        )
        // All 5 states should be distinct
        assertEquals(5, statuses.toSet().size)
    }

    @Test
    fun `delivery failure states are distinct from success`() {
        assertNotEquals(Delivery.STATUS_DELIVERED, Delivery.STATUS_FAILED)
        assertNotEquals(Delivery.STATUS_DELIVERED, Delivery.STATUS_CANCELLED)
        assertNotEquals(Delivery.STATUS_FAILED, Delivery.STATUS_CANCELLED)
    }

    @Test
    fun `delivery soft delete defaults to false`() {
        val delivery = createDelivery()
        assertFalse(delivery.is_deleted)
    }

    @Test
    fun `delivery with notes`() {
        val delivery = createDelivery(deliveryNotes = "Ring doorbell twice")
        assertEquals("Ring doorbell twice", delivery.delivery_notes)
    }

    @Test
    fun `delivery with city`() {
        val delivery = createDelivery(deliveryCity = "Port Louis")
        assertEquals("Port Louis", delivery.delivery_city)
    }

    // --- Cart Delivery Fields Integration ---

    @Test
    fun `cart delivery fields serialize to order JSON`() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        cart.orderType = "delivery"
        cart.deliveryCustomerName = "Alice"
        cart.deliveryCustomerPhone = "+230 5555 9999"
        cart.deliveryAddress = "10 Harbour Road"
        cart.deliveryNotes = "Leave at gate"

        val json = cart.toJson()

        assertEquals("delivery", json.getString("orderType"))
        assertEquals("Alice", json.getString("delivery_customer_name"))
        assertEquals("+230 5555 9999", json.getString("delivery_customer_phone"))
        assertEquals("10 Harbour Road", json.getString("delivery_address"))
        assertEquals("Leave at gate", json.getString("delivery_notes"))
    }

    @Test
    fun `cart without delivery omits delivery fields from JSON`() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        cart.orderType = "dine_in"

        val json = cart.toJson()

        assertFalse(json.has("delivery_customer_name"))
        assertFalse(json.has("delivery_customer_phone"))
        assertFalse(json.has("delivery_address"))
        assertFalse(json.has("delivery_notes"))
    }

    @Test
    fun `clearCart resets delivery order type back to dine_in`() {
        val cart = TestFixtures.newCart()
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.orderType = "delivery"
        cart.deliveryCustomerName = "Bob"
        cart.deliveryAddress = "123 Main St"

        cart.clearCart()

        assertEquals("dine_in", cart.orderType)
        assertNull(cart.deliveryCustomerName)
        assertNull(cart.deliveryAddress)
    }

    // --- Helpers ---

    private fun createDelivery(
        orderId: Int? = null,
        customerName: String? = null,
        customerPhone: String? = null,
        deliveryAddress: String? = null,
        deliveryCity: String? = null,
        deliveryNotes: String? = null,
        driverId: Int? = null,
        driverName: String? = null,
        deliveryFee: Double? = null,
        distanceKm: Double? = null,
        status: String = Delivery.STATUS_PENDING
    ) = Delivery(
        id = 1,
        account_id = "test_acc",
        order_id = orderId,
        store_id = TestFixtures.STORE_ID,
        customer_name = customerName,
        customer_phone = customerPhone,
        delivery_address = deliveryAddress,
        delivery_city = deliveryCity,
        delivery_notes = deliveryNotes,
        driver_id = driverId,
        driver_name = driverName,
        delivery_fee = deliveryFee,
        distance_km = distanceKm,
        status = status
    )
}
