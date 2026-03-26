import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import {
  MraEbsClient,
  buildMraInvoice,
  computeInvoiceHash,
  MraSeller,
  MraBuyer,
  MraConfig,
} from "../services/mra-ebs-client";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * POST /webhook/mra/submit-invoice
 *
 * Submits an order to MRA's e-invoicing system.
 * Called after order payment (async, non-blocking to POS).
 *
 * Body: { account_id, order_id }
 */
router.post("/webhook/mra/submit-invoice", async (req: Request, res: Response) => {
  const { account_id, order_id } = req.body;

  if (!account_id || !order_id) {
    return res.status(400).json({ error: "account_id and order_id required" });
  }

  try {
    // 1. Get account + tax config
    const [{ data: account, error: accErr }, { data: taxConfig }] = await Promise.all([
      supabase.from("account").select("businessname, currency, address1, phone1, vatregno").eq("account_id", account_id).single(),
      supabase.from("account_tax_config").select("*").eq("account_id", account_id).single(),
    ]);

    if (accErr || !account) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (!taxConfig || !taxConfig.is_enabled) {
      await supabase.from("orders").update({ mra_status: "exempt" }).eq("order_id", order_id);
      return res.json({ status: "exempt", message: "Tax compliance not configured for this brand" });
    }

    if (!taxConfig.api_username || !taxConfig.api_password || !taxConfig.brn || !taxConfig.tan) {
      return res.status(400).json({ error: "Tax config incomplete (need username, password, BRN, TAN)" });
    }

    // 2. Get the order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("order_id, document_no, grand_total, subtotal, tax_total, date_ordered, currency, json_data, uuid, order_type, doc_status")
      .eq("order_id", order_id)
      .eq("account_id", account_id)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 3. Parse order details from json_data
    let orderDetails: any = {};
    try {
      orderDetails = typeof order.json_data === "string" ? JSON.parse(order.json_data) : order.json_data;
    } catch (_) {
      orderDetails = {};
    }

    // 4. Get/increment MRA counter
    const { data: counter } = await supabase
      .from("mra_counter")
      .select("counter, last_hash")
      .eq("account_id", account_id)
      .single();

    const currentCounter = (counter?.counter ?? 0) + 1;
    const previousHash = counter?.last_hash ?? "";

    // 5. Build seller
    const seller: MraSeller = {
      name: account.businessname || "",
      tradeName: account.businessname || "",
      tan: taxConfig.tan,
      brn: taxConfig.brn,
      businessAddr: account.address1 || "",
      businessPhoneNo: account.phone1 || "",
      ebsCounterNo: taxConfig.ebs_machine_id || "1",
    };

    // 6. Build buyer (B2C default — no buyer details required)
    const buyer: MraBuyer = {
      name: orderDetails.customer_name || "Walk-in Customer",
      buyerType: "NVTR",
    };

    // 7. Detect refund/void — needs Credit Note (CRN) instead of Standard (STD)
    const isRefund = order.order_type === "REFUND" || order.doc_status === "VO";

    // For credit notes, find the original invoice reference
    let refInvoiceId = "";
    if (isRefund && orderDetails.refund_order_uuid) {
      const { data: originalOrder } = await supabase
        .from("orders")
        .select("document_no, mra_fiscal_id")
        .eq("uuid", orderDetails.refund_order_uuid)
        .single();
      refInvoiceId = originalOrder?.document_no || "";
    }

    // 8. Build invoice
    const invoice = buildMraInvoice(
      {
        documentno: order.document_no || order.uuid,
        grandtotal: Math.abs(order.grand_total || 0),
        subtotal: Math.abs(order.subtotal || 0),
        taxtotal: Math.abs(order.tax_total || 0),
        discountamt: Math.abs(orderDetails.discountamt || 0),
        dateordered: new Date(order.date_ordered).getTime(),
        currency: order.currency || "MUR",
        payments: orderDetails.payments || [{ paymenttype: "CASH" }],
        lines: (orderDetails.lines || []).map((l: any) => ({
          name: l.name,
          product_id: l.product_id,
          qtyentered: l.qtyentered || 1,
          priceentered: l.priceentered || l.priceactual || 0,
          taxamt: l.taxamt || 0,
          linenetamt: l.linenetamt || l.lineamt || 0,
          discountamt: l.discountamt || 0,
        })),
      },
      seller,
      buyer,
      String(currentCounter),
      previousHash
    );

    // Override for credit note (refund/void)
    if (isRefund) {
      invoice.invoiceTypeDesc = "CRN";
      invoice.invoiceRefIdentifier = refInvoiceId;
      invoice.reasonStated = orderDetails.void_reason || orderDetails.note || "Refund";
    }

    // 9. Authenticate + transmit
    const config: MraConfig = {
      username: taxConfig.api_username,
      password: taxConfig.api_password,
      ebsMraId: taxConfig.ebs_machine_id || "",
      areaCode: taxConfig.area_code || "",
    };

    const client = new MraEbsClient(config);
    const authResult = await client.authenticate();

    if (authResult.status !== "SUCCESS") {
      await supabase.from("orders").update({
        mra_status: "failed",
        mra_error: `Auth failed: ${authResult.errorMessage || "Unknown"}`,
      }).eq("order_id", order_id);

      return res.status(502).json({ error: "MRA authentication failed", detail: authResult });
    }

    const transmitResult = await client.transmitInvoice([invoice]);

    // 9. Update order with MRA result
    const fiscalId = transmitResult.fiscalisedInvoices?.[0]?.fiscalId;
    const newHash = computeInvoiceHash(
      invoice.dateTimeInvoiceIssued,
      invoice.totalAmtPaid,
      seller.brn,
      invoice.invoiceIdentifier
    );

    if (fiscalId) {
      // Success
      await supabase.from("orders").update({
        mra_fiscal_id: fiscalId,
        mra_status: "filed",
        mra_invoice_counter: currentCounter,
        mra_previous_hash: previousHash,
        mra_submitted_at: new Date().toISOString(),
        mra_error: null,
      }).eq("order_id", order_id);

      // Update counter
      await supabase.from("mra_counter").upsert({
        account_id,
        counter: currentCounter,
        last_hash: newHash,
        updated_at: new Date().toISOString(),
      });

      return res.json({ status: "filed", fiscal_id: fiscalId, counter: currentCounter });
    } else {
      // Failed
      const errorMsg = transmitResult.errorMessages?.map((e: any) => `${e.code}: ${e.message}`).join("; ") || "Unknown error";
      await supabase.from("orders").update({
        mra_status: "failed",
        mra_error: errorMsg,
        mra_invoice_counter: currentCounter,
      }).eq("order_id", order_id);

      return res.status(502).json({ error: "MRA transmission failed", detail: errorMsg });
    }
  } catch (e: any) {
    console.error("[MRA] Submit invoice error:", e);

    // Record the error on the order
    try {
      await supabase.from("orders").update({
        mra_status: "failed",
        mra_error: e.message || "Internal error",
      }).eq("order_id", order_id);
    } catch (_) {}

    return res.status(500).json({ error: e.message || "Internal error" });
  }
});

/**
 * GET /webhook/mra/status/:orderId
 *
 * Check MRA filing status for an order.
 */
router.get("/webhook/mra/status/:orderId", async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from("orders")
    .select("order_id, document_no, mra_fiscal_id, mra_status, mra_invoice_counter, mra_submitted_at, mra_error")
    .eq("order_id", orderId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.json(data);
});

export default router;
