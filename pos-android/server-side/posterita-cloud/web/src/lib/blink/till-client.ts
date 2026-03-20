/**
 * Blink Till Integration Payment Client
 * Ported from blink-till-payment-api (Java)
 *
 * Handles: OAuth2 authentication, QR code generation, transaction status
 * Uses OAuth2 client_credentials flow + AES encryption for QR requests.
 */

import { aesEncrypt, aesDecrypt } from './crypto';
import type { BlinkMode, EncryptedResponse, Till_TokenResponse } from './types';

const ENV_URLS = {
  UAT: {
    TOKEN_URL: 'https://fin-pos.emtel.com/oauth2/v1.0.0/token',
    TRANSACTION_STATUS_URL: 'https://fin-pos.emtel.com/dynamicqr/v1.0.0/GetTransactionStatus',
    QR_CODE_URL: 'https://fin-pos.emtel.com/dynamicqr/v1.0.0/GetDynamicQR',
  },
  PROD: {
    TOKEN_URL: 'https://fin-pos.emtel.com/oauth2/v1.0.0/token',
    TRANSACTION_STATUS_URL: 'https://fin-pos.emtel.com/dynamicqr/v1.0.0/GetTransactionStatus',
    QR_CODE_URL: 'https://fin-pos.emtel.com/dynamicqr/v1.0.0/GetDynamicQR',
  },
} as const;

interface TillConfig {
  urls: typeof ENV_URLS.UAT;
  aesKey: string;
  aesIv: string;
  username: string;
  password: string;
}

export class BlinkTillClient {
  private config: TillConfig;
  private currentToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(mode: BlinkMode = 'UAT') {
    const urls = ENV_URLS[mode] || ENV_URLS.UAT;
    const prefix = mode === 'PROD' ? 'BLINK_TILL_PROD' : 'BLINK_TILL_UAT';

    this.config = {
      urls,
      aesKey: process.env[`${prefix}_AES_KEY`] || '',
      aesIv: process.env[`${prefix}_AES_IV`] || '',
      username: process.env[`${prefix}_USERNAME`] || '',
      password: process.env[`${prefix}_PASSWORD`] || '',
    };

    if (!this.config.username) {
      throw new Error(`Blink Till ${mode} credentials not configured. Set ${prefix}_* env vars.`);
    }
  }

  isTokenValid(): boolean {
    return this.currentToken !== null && Date.now() < this.tokenExpiryTime;
  }

  /**
   * Authenticate using OAuth2 client_credentials flow.
   */
  async authenticate(): Promise<Till_TokenResponse> {
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

    const res = await fetch(this.config.urls.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'okhttp/4.12.0',
        Accept: 'application/json, text/plain',
        'Accept-Encoding': 'deflate',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const responseBody = await res.text();

    if (!res.ok) {
      // Emtel may return HTML (WAF/error page) — handle gracefully
      let errorDetail = responseBody.substring(0, 500);
      try {
        const parsed = JSON.parse(responseBody);
        errorDetail = parsed.error_description || parsed.error || errorDetail;
      } catch {
        // responseBody is not JSON (likely HTML)
      }
      throw new Error(`Authentication failed: ${res.status} - ${errorDetail}`);
    }

    let tokenResponse: Till_TokenResponse;
    try {
      tokenResponse = JSON.parse(responseBody);
    } catch {
      throw new Error(`Authentication returned non-JSON response (${res.status}): ${responseBody.substring(0, 200)}`);
    }

    this.currentToken = tokenResponse.access_token;
    this.tokenExpiryTime = Date.now() + tokenResponse.expires_in * 1000;

    return tokenResponse;
  }

  private async ensureTokenValid(): Promise<void> {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }
  }

  /**
   * Get QR Code for Till payment.
   */
  async getQRCode(params: {
    merchant_id: string;
    store_id: string;
    terminal_id: string;
    transaction_id: string;
    amount: { value: number; currency?: string };
  }) {
    await this.ensureTokenValid();

    const encryptedBody = aesEncrypt(params, this.config.aesKey, this.config.aesIv);

    const res = await fetch(this.config.urls.QR_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'okhttp/4.12.0',
        Authorization: `Bearer ${this.currentToken}`,
      },
      body: JSON.stringify({ body: encryptedBody }),
    });

    const responseBody = await res.text();

    if (!res.ok) {
      throw new Error(`QR Code request failed: ${res.status} - ${responseBody}`);
    }

    const encryptedResponse: EncryptedResponse = JSON.parse(responseBody);
    let decryptedData = aesDecrypt(encryptedResponse.data, this.config.aesKey, this.config.aesIv);
    decryptedData = JSON.parse(decryptedData); // double-wrapped

    return JSON.parse(decryptedData);
  }

  /**
   * Get transaction status.
   */
  async getTransactionStatus(terminalId: string, transactionId: string) {
    await this.ensureTokenValid();

    const payload = { terminalId, transactionId };

    const res = await fetch(this.config.urls.TRANSACTION_STATUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'okhttp/4.12.0',
        Authorization: `Bearer ${this.currentToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await res.text();

    if (!res.ok) {
      throw new Error(`Transaction status request failed: ${res.status} - ${responseBody}`);
    }

    return JSON.parse(responseBody);
  }
}
