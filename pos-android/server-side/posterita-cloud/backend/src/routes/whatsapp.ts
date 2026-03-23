import { Router, Request, Response } from "express";
import { getDb, logError } from "../db";

const router = Router();

/**
 * GET /webhook/whatsapp — Meta verification handshake
 * Meta sends a challenge to verify the webhook URL.
 */
router.get("/webhook/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[whatsapp] Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("[whatsapp] Webhook verification failed");
    res.sendStatus(403);
  }
});

/**
 * POST /webhook/whatsapp — Receive incoming messages from Meta
 */
router.post("/webhook/whatsapp", async (req: Request, res: Response) => {
  // Always respond 200 quickly — Meta retries on timeout
  res.sendStatus(200);

  try {
    const body = req.body;
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) return; // Not a message event (status update, etc.)

    const message = value.messages[0];
    const from = message.from; // WhatsApp phone number
    const text = message.text?.body || "";
    const timestamp = message.timestamp;

    console.log(`[whatsapp] Message from ${from}: ${text}`);

    // Determine channel: B2C (receipt/loyalty) or B2B (support)
    const isReceipt = text.toUpperCase().startsWith("RECEIPT ");
    const isSupport = text.toUpperCase().startsWith("SUPPORT") || text.toUpperCase().startsWith("HELP");

    if (isReceipt) {
      await handleReceiptMessage(from, text);
    } else if (isSupport) {
      await handleSupportMessage(from, text);
    } else {
      // Check if there's an existing conversation
      await handleFreeText(from, text);
    }
  } catch (err: any) {
    await logError("WhatsApp", `Webhook processing failed: ${err.message}`, "ERROR", {
      stackTrace: err.stack,
    });
  }
});

// ── Message Handlers (stubs — implement when Meta is verified) ──

async function handleReceiptMessage(from: string, text: string) {
  const orderRef = text.replace(/^RECEIPT\s+/i, "").trim();
  console.log(`[whatsapp] Receipt lookup: ${orderRef} from ${from}`);

  // TODO: Look up order by documentno/uuid
  // TODO: Resolve account_id from order
  // TODO: Call Claude AI scoped to merchant context
  // TODO: Send reply via WhatsApp Cloud API

  await sendWhatsAppReply(from, `Thanks for your receipt scan! Order ${orderRef} — I'll look that up for you. (AI agent coming soon)`);
}

async function handleSupportMessage(from: string, text: string) {
  console.log(`[whatsapp] Support request from ${from}: ${text}`);

  // TODO: Look up owner/merchant by phone
  // TODO: Call Claude AI with POS knowledge base
  // TODO: Send reply

  await sendWhatsAppReply(from, `Thanks for contacting Posterita Support. Your message has been received. (AI support agent coming soon)`);
}

async function handleFreeText(from: string, text: string) {
  console.log(`[whatsapp] Free text from ${from}: ${text}`);

  // TODO: Check existing conversation context
  // TODO: Route to appropriate handler

  await sendWhatsAppReply(from, `Hi! Send "RECEIPT <order number>" to check an order, or "SUPPORT" for help with your POS system.`);
}

/**
 * Send a WhatsApp reply via Meta Cloud API.
 */
async function sendWhatsAppReply(to: string, text: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    console.warn("[whatsapp] Not configured — skipping reply");
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (err: any) {
    await logError("WhatsApp", `Failed to send reply to ${to}: ${err.message}`, "ERROR");
  }
}

export default router;
