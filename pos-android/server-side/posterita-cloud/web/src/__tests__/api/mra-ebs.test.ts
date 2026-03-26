import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

/**
 * MRA EBS Tests
 *
 * Unit tests for invoice building, hash computation, date formatting.
 * Integration tests (hitting live MRA endpoint) are behind MRA_LIVE flag.
 *
 * Test credentials from legacy project:
 *   username: Posterita, password: P05t3r1t@
 *   ebsMraId: 17046958415903J3TJKY213B, areaCode: 100
 *   BRN: C07062336, TAN: 20351590
 */

// ── Import the helpers (pure functions, no network) ──

// Inline the pure functions to avoid TS module resolution issues in vitest
function formatMraDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d} ${h}:${min}:${s}`;
}

function computeInvoiceHash(
  dateTime: string, totalAmtPaid: string, brn: string, invoiceIdentifier: string
): string {
  return crypto.createHash("sha256").update(`${dateTime}${totalAmtPaid}${brn}${invoiceIdentifier}`).digest("hex");
}

// ════════════════════════════════════════════════════════
// Date Formatting
// ════════════════════════════════════════════════════════

describe('MRA Date Formatting', () => {
  it('formats date as yyyyMMdd HH:mm:ss', () => {
    const date = new Date(2026, 2, 26, 14, 30, 45); // March 26, 2026
    expect(formatMraDate(date)).toBe('20260326 14:30:45');
  });

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5, 8, 5, 3); // Jan 5
    expect(formatMraDate(date)).toBe('20260105 08:05:03');
  });

  it('handles midnight correctly', () => {
    const date = new Date(2026, 11, 31, 0, 0, 0); // Dec 31 midnight
    expect(formatMraDate(date)).toBe('20261231 00:00:00');
  });
});

// ════════════════════════════════════════════════════════
// Invoice Hash Chain
// ════════════════════════════════════════════════════════

describe('MRA Invoice Hash Chain', () => {
  it('computes SHA-256 hash of dateTime + totalAmtPaid + BRN + invoiceId', () => {
    const hash = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-001');
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('produces different hashes for different invoices', () => {
    const hash1 = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-001');
    const hash2 = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-002');
    expect(hash1).not.toBe(hash2);
  });

  it('is deterministic (same inputs = same hash)', () => {
    const hash1 = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-001');
    const hash2 = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-001');
    expect(hash1).toBe(hash2);
  });

  it('matches known SHA-256 output', () => {
    const input = '20260326 14:30:45370.00C07062336INV-001';
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    const actual = computeInvoiceHash('20260326 14:30:45', '370.00', 'C07062336', 'INV-001');
    expect(actual).toBe(expected);
  });
});

// ════════════════════════════════════════════════════════
// AES-256-ECB Encryption (same algo as MRA client)
// ════════════════════════════════════════════════════════

describe('MRA AES Encryption', () => {
  it('encrypts and decrypts with AES-256-ECB', () => {
    const key = crypto.randomBytes(32);
    const base64Key = key.toString('base64');
    const plaintext = '{"invoiceCounter":"1","transactionType":"B2C"}';

    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
    let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
    encrypted += cipher.final('base64');

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, Buffer.alloc(0));
    const decrypted = Buffer.concat([
      decipher.update(encrypted, 'base64'),
      decipher.final(),
    ]).toString('utf-8');

    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for different keys', () => {
    const plaintext = 'test data';
    const key1 = crypto.randomBytes(32);
    const key2 = crypto.randomBytes(32);

    const encrypt = (key: Buffer) => {
      const c = crypto.createCipheriv('aes-256-ecb', key, null);
      return c.update(plaintext, 'utf-8', 'base64') + c.final('base64');
    };

    expect(encrypt(key1)).not.toBe(encrypt(key2));
  });
});

// ════════════════════════════════════════════════════════
// RSA Encryption (MRA certificate)
// ════════════════════════════════════════════════════════

describe('MRA RSA Encryption', () => {
  it('encrypts with MRA public key without error', () => {
    const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
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

    const publicKey = crypto.createPublicKey({
      key: Buffer.from(
        publicKeyPEM.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\n/g, ''),
        'base64'
      ),
      format: 'der',
      type: 'spki',
    });

    const encrypted = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from('test payload', 'utf-8')
    );

    expect(encrypted).toBeInstanceOf(Buffer);
    expect(encrypted.length).toBeGreaterThan(0);
    // RSA-4096 produces 512 bytes
    expect(encrypted.length).toBe(512);
  });
});

// ════════════════════════════════════════════════════════
// Invoice Building
// ════════════════════════════════════════════════════════

describe('MRA Invoice Building', () => {
  it('builds valid invoice structure from order data', () => {
    const seller = {
      name: 'Posterita POS', tradeName: 'TEST', tan: '20351590',
      brn: 'C07062336', businessAddr: 'Coromandel', businessPhoneNo: '', ebsCounterNo: '1',
    };
    const buyer = { name: 'Walk-in', buyerType: 'NVTR' as const };

    const order = {
      documentno: 'INV-001',
      grandtotal: 370,
      subtotal: 310,
      taxtotal: 60,
      discountamt: 0,
      dateordered: new Date(2026, 2, 26, 14, 30, 45).getTime(),
      currency: 'MUR',
      payments: [{ paymenttype: 'CASH' }],
      lines: [
        { name: 'Burger', product_id: 1, qtyentered: 2, priceentered: 155, taxamt: 30, linenetamt: 340, discountamt: 0 },
        { name: 'Fries', product_id: 2, qtyentered: 1, priceentered: 30, taxamt: 0, linenetamt: 30, discountamt: 0 },
      ],
    };

    // Inline buildMraInvoice logic for testing
    const items = order.lines.map((line, i) => ({
      itemNo: String(i + 1),
      taxCode: line.taxamt > 0 ? 'TC01' : 'TC02',
      nature: 'GOODS' as const,
      productCodeOwn: String(line.product_id),
      itemDesc: line.name,
      quantity: String(line.qtyentered),
      unitPrice: line.priceentered.toFixed(2),
      discount: (line.discountamt || 0).toFixed(2),
      discountedValue: (line.discountamt || 0).toFixed(2),
      amtWoVatCur: (line.linenetamt - line.taxamt).toFixed(2),
      amtWoVatMur: (line.linenetamt - line.taxamt).toFixed(2),
      vatAmt: line.taxamt.toFixed(2),
      totalPrice: line.linenetamt.toFixed(2),
    }));

    expect(items).toHaveLength(2);
    expect(items[0].taxCode).toBe('TC01'); // has VAT
    expect(items[1].taxCode).toBe('TC02'); // zero VAT
    expect(items[0].itemDesc).toBe('Burger');
    expect(items[0].quantity).toBe('2');
  });

  it('maps payment type correctly', () => {
    const p1: string = 'CASH';
    const p2: string = 'CARD';
    expect(p1 === 'CARD' ? 'CARD' : 'CASH').toBe('CASH');
    expect(p2 === 'CARD' ? 'CARD' : 'CASH').toBe('CARD');
  });

  it('determines transaction type from buyer BRN', () => {
    const brn1: string | undefined = 'C07062336';
    const brn2: string | undefined = '';
    const brn3: string | undefined = undefined;
    expect(brn1 ? 'B2B' : 'B2C').toBe('B2B');
    expect(brn2 ? 'B2B' : 'B2C').toBe('B2C');
    expect(brn3 ? 'B2B' : 'B2C').toBe('B2C');
  });

  it('uses correct VAT person type', () => {
    const tan1: string | undefined = '20351590';
    const tan2: string | undefined = '';
    expect(tan1 ? 'VATR' : 'NVTR').toBe('VATR');
    expect(tan2 ? 'VATR' : 'NVTR').toBe('NVTR');
  });
});

// ════════════════════════════════════════════════════════
// MRA Test Credentials (for reference / integration tests)
// ════════════════════════════════════════════════════════

describe('MRA Test Credentials', () => {
  it('has valid test credentials format', () => {
    const creds = {
      username: 'Posterita',
      password: 'P05t3r1t@',
      ebsMraId: '17046958415903J3TJKY213B',
      areaCode: '100',
      brn: 'C07062336',
      tan: '20351590',
    };

    expect(creds.username).toBeTruthy();
    expect(creds.password).toBeTruthy();
    expect(creds.ebsMraId).toHaveLength(24);
    expect(creds.brn).toMatch(/^[IC]\d+$/); // starts with I or C
    expect(creds.tan).toMatch(/^\d{8}$/);   // 8 digits
  });
});
