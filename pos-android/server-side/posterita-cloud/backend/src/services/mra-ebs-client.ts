/**
 * MRA EBS Client — Mauritius Revenue Authority Electronic Billing System
 *
 * Ported from legacy Java/Node.js implementations (posterita-mra-ebs).
 * Handles authenticated, encrypted invoice submission to MRA's e-invoicing API.
 *
 * Protocol:
 * 1. Authenticate: RSA-encrypt credentials → get AES secret key + token
 * 2. Transmit: AES-encrypt invoice JSON → POST to MRA → get fiscal ID
 *
 * References:
 * - legacy/mra-ebs-nodejs/EbsMraClient.js (async Node.js port)
 * - legacy/mra-ebs-android/models/ (Invoice, Seller, Buyer, Item schemas)
 */

import * as crypto from "crypto";
import * as https from "https";

// ════════════════════════════════════════════════════════
// MRA Public Key (RSA-4096) — for encrypting auth payload
// ════════════════════════════════════════════════════════

const MRA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmq7EwCHjHpOdivEgmx9o
w/OH5iF40h6IV2VPxkoFXxAZ8JNlr2V3iX5ETEllOL3QyZbEw4tJbg4OaAKwlq2Z
XYlaX6XoFw4/nWjVc4+Hd0D/x4CNNkP/u8ikSFeNqK1F28lQ16qrpC1vybxqc8Bw
+A+Cm51f94YzMXjIkKO2G9PE/pMrSnD3WVisrvOTF8GgP3QbZKZGl7p2DEWKnsC3
SQWxSu0HCP5kPtY8QkvheCDEqho/tEHLfVdzIFyhM4fYgEw318Xox6xeSefXrUpX
kWQZCGrdjT0OZ9O5ok6YFatc99x/LI3OOAl2yQnpjNSM2Q/yMIgdljWWhtjWqkqE
K1B65SHKw0XM/vp67Vb4y7K4dTWfHyBr3fg5C60OB3sSP5Pq6UrtrIewugA9V5G4
UMCg/a3ITSIF0F7jla0AuF6Tx844qh0SAHm0m583QDVezbJ2k7dYbJcyxffecot0
SnFaEolC1DycVkC8TuXr8fRqbKGHN85PR33bqWu5vou/OkYqp+XC6GH6+l2z0yg2
bkMGr7IjfuYf+2EeSsBaHhs0lgdNHQQUiqFOArtlVpo4Wkq4rQilHDj+U+uT5Cjr
ABW89gpKmFkvJklpLBCjoumDsBZFdaKsCPLE2y+QoHWsXdbM6kHMILqdsXzse9+x
YuCV3Yvw1wtw8jam5lCVztMCAwEAAQ==
-----END PUBLIC KEY-----`;

// ════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════

export interface MraConfig {
  username: string;
  password: string;
  ebsMraId: string;
  areaCode: string;
}

export interface MraSeller {
  name: string;
  tradeName: string;
  tan: string;           // Tax Account Number (8 chars)
  brn: string;           // Business Registration Number (I/C + 8-9 digits)
  businessAddr: string;
  businessPhoneNo: string;
  ebsCounterNo: string;  // Unique counter/terminal ID per machine
}

export interface MraBuyer {
  name: string;
  tan?: string;
  brn?: string;
  businessAddr?: string;
  buyerType: "VATR" | "NVTR";  // VAT Registered or Non-VAT
  nic?: string;                 // National Identity Card
}

export interface MraItem {
  itemNo: string;
  taxCode: string;              // TC01 = standard, TC02 = zero-rated, etc.
  nature: "GOODS" | "SERVICES";
  productCodeMra?: string;      // MRA product classification
  productCodeOwn: string;       // Internal SKU
  itemDesc: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  discountedValue: string;
  amtWoVatCur: string;          // Amount without VAT (transaction currency)
  amtWoVatMur: string;          // Amount without VAT (MUR)
  vatAmt: string;
  totalPrice: string;
}

export interface MraInvoice {
  invoiceCounter: string;
  transactionType: "B2C" | "B2B" | "B2G";
  personType: "VATR" | "NVTR";
  invoiceTypeDesc: "STD" | "CRN" | "DRN";  // Standard, Credit Note, Debit Note
  currency: string;
  invoiceIdentifier: string;    // Unique per seller
  invoiceRefIdentifier: string; // For credit/debit notes
  previousNoteHash: string;     // SHA-256 of previous invoice
  reasonStated: string;
  totalVatAmount: string;
  totalAmtWoVatCur: string;
  totalAmtWoVatMur: string;
  totalAmtPaid: string;
  invoiceTotal: string;
  discountTotalAmount: string;
  dateTimeInvoiceIssued: string; // Format: yyyyMMdd HH:mm:ss
  seller: MraSeller;
  buyer: MraBuyer;
  itemList: MraItem[];
  salesTransactions: string;     // CASH, CARD, CHEQUE, etc.
}

export interface MraTokenResponse {
  status: "SUCCESS" | "FAILURE";
  token?: string;
  expiryDate?: string;
  key?: string;  // Decrypted AES secret key
  errorMessage?: string;
}

export interface MraTransmitResponse {
  status: string;
  fiscalisedInvoices?: Array<{
    invoiceIdentifier: string;
    fiscalId: string;
    invoiceCounter: string;
  }>;
  errorMessages?: Array<{
    code: string;
    message: string;
  }>;
}

// ════════════════════════════════════════════════════════
// Client
// ════════════════════════════════════════════════════════

export class MraEbsClient {
  private config: MraConfig;
  private token: string = "";
  private tokenExpiryDate: string = "";
  private secretKey: string = "";

  constructor(config: MraConfig) {
    this.config = config;
  }

  // ── Authentication ──

  async authenticate(refreshToken = false): Promise<MraTokenResponse> {
    const encryptKey = this.generateRandomAESKey();

    const payload = this.encryptWithRSA(JSON.stringify({
      username: this.config.username,
      password: this.config.password,
      encryptKey,
      refreshToken: refreshToken ? "true" : "false",
    }));

    const body = JSON.stringify({
      requestId: crypto.randomUUID(),
      payload,
    });

    const headers = {
      username: this.config.username,
      ebsMraId: this.config.ebsMraId,
      areaCode: this.config.areaCode,
    };

    const response = await this.post(
      "https://vfisc.mra.mu/einvoice-token-service/token-api/generate-token",
      headers,
      body
    );

    const tokenResponse: MraTokenResponse = JSON.parse(response);

    if (tokenResponse.status === "SUCCESS" && tokenResponse.key) {
      // Decrypt the secret key using our AES key
      const decryptedKey = this.decryptTokenKey(encryptKey, tokenResponse.key);
      tokenResponse.key = decryptedKey;

      this.token = tokenResponse.token || "";
      this.tokenExpiryDate = tokenResponse.expiryDate || "";
      this.secretKey = decryptedKey;
    }

    return tokenResponse;
  }

  // ── Invoice Submission ──

  async transmitInvoice(invoices: MraInvoice[]): Promise<MraTransmitResponse> {
    if (!this.token || !this.secretKey) {
      throw new Error("Not authenticated — call authenticate() first");
    }

    const invoiceJson = JSON.stringify(invoices);
    const encryptedInvoice = this.encryptWithAES(this.secretKey, invoiceJson);
    const now = new Date();
    const requestDateTime = formatMraDate(now);

    const body = JSON.stringify({
      requestId: crypto.randomUUID(),
      requestDateTime,
      encryptedInvoice,
    });

    const headers = {
      username: this.config.username,
      ebsMraId: this.config.ebsMraId,
      areaCode: this.config.areaCode,
      token: this.token,
    };

    const response = await this.post(
      "https://vfisc.mra.mu/realtime/invoice/transmit",
      headers,
      body
    );

    return JSON.parse(response);
  }

  // ── Encryption Utilities ──

  private encryptWithRSA(message: string): string {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(
        MRA_PUBLIC_KEY_PEM
          .replace("-----BEGIN PUBLIC KEY-----", "")
          .replace("-----END PUBLIC KEY-----", "")
          .replace(/\n/g, ""),
        "base64"
      ),
      format: "der",
      type: "spki",
    });

    const encrypted = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(message, "utf-8")
    );

    return encrypted.toString("base64");
  }

  private encryptWithAES(base64Key: string, data: string): string {
    const keyBuffer = Buffer.from(base64Key, "base64");
    const cipher = crypto.createCipheriv("aes-256-ecb", keyBuffer, null);
    let encrypted = cipher.update(data, "utf-8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  private decryptTokenKey(aesKey: string, encryptedKey: string): string {
    const keyBuffer = Buffer.from(aesKey, "base64");
    const decipher = crypto.createDecipheriv("aes-256-ecb", keyBuffer, Buffer.alloc(0));
    const decrypted = Buffer.concat([
      decipher.update(encryptedKey, "base64"),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  }

  private generateRandomAESKey(): string {
    return crypto.randomBytes(32).toString("base64");
  }

  // ── HTTP ──

  private post(url: string, headers: Record<string, string>, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }
}

// ════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════

/** Format date as MRA expects: yyyyMMdd HH:mm:ss */
export function formatMraDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d} ${h}:${min}:${s}`;
}

/** Compute previous invoice hash for chain linking */
export function computeInvoiceHash(
  dateTime: string,
  totalAmtPaid: string,
  brn: string,
  invoiceIdentifier: string
): string {
  const input = `${dateTime}${totalAmtPaid}${brn}${invoiceIdentifier}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Build an MRA invoice from a Posterita order.
 * Maps our OrderDetails → MRA Invoice format.
 */
export function buildMraInvoice(
  order: {
    documentno: string;
    grandtotal: number;
    subtotal: number;
    taxtotal: number;
    discountamt: number;
    dateordered: number;
    currency: string;
    payments: Array<{ paymenttype: string }>;
    lines: Array<{
      name?: string;
      product_id: number;
      qtyentered: number;
      priceentered: number;
      taxamt: number;
      linenetamt: number;
      discountamt: number;
    }>;
  },
  seller: MraSeller,
  buyer: MraBuyer,
  invoiceCounter: string,
  previousNoteHash: string
): MraInvoice {
  const date = new Date(order.dateordered);

  const items: MraItem[] = order.lines.map((line, i) => {
    const amtWoVat = line.linenetamt - line.taxamt;
    return {
      itemNo: String(i + 1),
      taxCode: line.taxamt > 0 ? "TC01" : "TC02", // Standard VAT or Zero-rated
      nature: "GOODS" as const,
      productCodeOwn: String(line.product_id),
      itemDesc: line.name || `Product ${line.product_id}`,
      quantity: String(line.qtyentered),
      unitPrice: line.priceentered.toFixed(2),
      discount: (line.discountamt || 0).toFixed(2),
      discountedValue: (line.discountamt || 0).toFixed(2),
      amtWoVatCur: amtWoVat.toFixed(2),
      amtWoVatMur: amtWoVat.toFixed(2), // Same if currency is MUR
      vatAmt: line.taxamt.toFixed(2),
      totalPrice: line.linenetamt.toFixed(2),
    };
  });

  const paymentType = order.payments?.[0]?.paymenttype || "CASH";
  const salesTransaction = paymentType === "CARD" ? "CARD" : "CASH";

  return {
    invoiceCounter,
    transactionType: buyer.brn ? "B2B" : "B2C",
    personType: seller.tan ? "VATR" : "NVTR",
    invoiceTypeDesc: "STD",
    currency: order.currency || "MUR",
    invoiceIdentifier: order.documentno,
    invoiceRefIdentifier: "",
    previousNoteHash,
    reasonStated: "",
    totalVatAmount: order.taxtotal.toFixed(2),
    totalAmtWoVatCur: order.subtotal.toFixed(2),
    totalAmtWoVatMur: order.subtotal.toFixed(2),
    totalAmtPaid: order.grandtotal.toFixed(2),
    invoiceTotal: order.grandtotal.toFixed(2),
    discountTotalAmount: (order.discountamt || 0).toFixed(2),
    dateTimeInvoiceIssued: formatMraDate(date),
    seller,
    buyer,
    itemList: items,
    salesTransactions: salesTransaction,
  };
}
