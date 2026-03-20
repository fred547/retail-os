/**
 * Blink Dynamic QR Code Payment Client
 * Ported from blink-qrcode-payment-api (Java) and blink-nodejs
 *
 * Handles: Authentication, QR code generation, debit, transaction status
 * All requests use AES-256-CBC encrypted payloads.
 */

import { aesEncrypt, aesDecrypt } from './crypto';
import type {
  BlinkMode,
  BlinkStatus,
  DynamicQR_TokenData,
  EncryptedResponse,
} from './types';

const ENV_URLS = {
  UAT: {
    TOKEN_URL: 'https://fin-staging.emtel.com/EcomAPI/GetAuthToken',
    DEBIT_URL: 'https://fin-staging.emtel.com/EcomAPI/InitiateTransactionRequest',
    STATUS_URL: 'https://fin-staging.emtel.com/EcomAPI/GetTransactionStatus',
    QR_URL: 'https://fin-staging.emtel.com/EcomAPI/GetQRCode',
    DYN_QR_STATUS_URL: 'https://fin-staging.emtel.com/EcomAPI/GetDynamicQRTransactionStatus',
  },
  PROD: {
    TOKEN_URL: 'https://blink-app.emtel.com/EcomAPI-V1/GetAuthToken',
    DEBIT_URL: 'https://blink-app.emtel.com/EcomAPI-V1/InitiateTransactionRequest',
    STATUS_URL: 'https://blink-app.emtel.com/EcomAPI-V1/GetTransactionStatus',
    QR_URL: 'https://blink-app.emtel.com/EcomAPI-V1/GetQRCode',
    DYN_QR_STATUS_URL: 'https://blink-app.emtel.com/EcomAPI-V1/GetDynamicQRTransactionStatus',
  },
} as const;

interface DynamicQRConfig {
  urls: typeof ENV_URLS[keyof typeof ENV_URLS];
  aesKey: string;
  aesIv: string;
  username: string;
  password: string;
}

export class BlinkDynamicQRClient {
  private config: DynamicQRConfig;
  private currentToken: string | null = null;
  private currentSessionId: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(mode: BlinkMode = 'UAT') {
    const urls = ENV_URLS[mode] || ENV_URLS.UAT;
    const prefix = mode === 'PROD' ? 'BLINK_DQR_PROD' : 'BLINK_DQR_UAT';

    this.config = {
      urls,
      aesKey: process.env[`${prefix}_AES_KEY`] || '',
      aesIv: process.env[`${prefix}_AES_IV`] || '',
      username: process.env[`${prefix}_USERNAME`] || '',
      password: process.env[`${prefix}_PASSWORD`] || '',
    };

    if (!this.config.aesKey || !this.config.username) {
      throw new Error(`Blink Dynamic QR ${mode} credentials not configured. Set ${prefix}_* env vars.`);
    }
  }

  private async post(url: string, payload: object, headers: Record<string, string> = {}): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'okhttp/4.12.0',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await res.text();

    if (res.status >= 500) {
      throw new Error(`Blink Server Error: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(`Blink API Error: ${res.status} - ${responseBody}`);
    }

    return JSON.parse(responseBody);
  }

  private decryptResponse(data: string): string {
    let decrypted = aesDecrypt(data, this.config.aesKey, this.config.aesIv);

    // Bug fix from Java: handle double-escaped JSON strings
    if (decrypted.startsWith('"{')) {
      decrypted = JSON.parse(decrypted);
    }

    return decrypted;
  }

  isTokenValid(): boolean {
    return this.currentToken !== null && Date.now() < this.tokenExpiryTime;
  }

  /**
   * Authenticate with Blink API and get a token.
   */
  async authenticate(requestIndentityId: string): Promise<{ data: DynamicQR_TokenData; status: BlinkStatus }> {
    const tokenRequest = {
      requestIndentityId,
      userName: this.config.username,
      password: this.config.password,
    };

    const encryptedBody = aesEncrypt(tokenRequest, this.config.aesKey, this.config.aesIv);
    const response = (await this.post(this.config.urls.TOKEN_URL, { body: encryptedBody }, {
      Accept: 'application/json, text/plain',
      'Accept-Encoding': 'deflate',
    })) as EncryptedResponse;

    const decryptedData = this.decryptResponse(response.data);
    const tokenData: DynamicQR_TokenData = JSON.parse(decryptedData);

    this.currentToken = tokenData.token;
    this.currentSessionId = tokenData.sessionId;
    this.tokenExpiryTime = Date.now() + tokenData.expiry * 60 * 1000;

    return { data: tokenData, status: response.status };
  }

  private ensureAuthenticated() {
    if (!this.isTokenValid()) {
      throw new Error('Token is invalid or expired. Call authenticate() first.');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: this.currentToken!,
      SessionId: this.currentSessionId!,
    };
  }

  /**
   * Initiate a debit transaction.
   */
  async initiateDebit(params: {
    merchantQRCode: string;
    merchantStoreMobileNo: string;
    customerMobileNo: string;
    amount: number;
    requestUUID: string;
    requestIndentityId: string;
  }) {
    this.ensureAuthenticated();

    const encryptedBody = aesEncrypt(params, this.config.aesKey, this.config.aesIv);
    const response = (await this.post(
      this.config.urls.DEBIT_URL,
      { body: encryptedBody },
      this.getAuthHeaders()
    )) as EncryptedResponse;

    const decryptedData = aesDecrypt(response.data, this.config.aesKey, this.config.aesIv);
    return { data: JSON.parse(decryptedData), status: response.status };
  }

  /**
   * Get a Dynamic QR Code for payment.
   */
  async getQRCode(params: {
    requestUUID: string;
    requestIndentityId: string;
    qrCodeString: string;
    purposeOfTransaction: string;
    transactionAmount: number;
    convenienceCharges: number;
    isPercentageConvenienceCharges: boolean;
  }) {
    this.ensureAuthenticated();

    const encryptedBody = aesEncrypt(params, this.config.aesKey, this.config.aesIv);
    const response = (await this.post(
      this.config.urls.QR_URL,
      { body: encryptedBody },
      this.getAuthHeaders()
    )) as EncryptedResponse;

    let decryptedData = aesDecrypt(response.data, this.config.aesKey, this.config.aesIv);
    decryptedData = JSON.parse(decryptedData); // always double-wrapped for QR
    return JSON.parse(decryptedData);
  }

  /**
   * Get transaction status.
   */
  async getTransactionStatus(requestUUID: string, ecomRequestId: string) {
    this.ensureAuthenticated();

    const payload = { requestUUID, ecomRequestId };
    const encryptedBody = aesEncrypt(payload, this.config.aesKey, this.config.aesIv);
    const response = (await this.post(
      this.config.urls.STATUS_URL,
      { body: encryptedBody },
      this.getAuthHeaders()
    )) as EncryptedResponse;

    const decryptedData = this.decryptResponse(response.data);
    return { data: JSON.parse(decryptedData), status: response.status };
  }

  /**
   * Get Dynamic QR transaction status (polling).
   */
  async getDynamicQRTransactionStatus(requestUUID: string) {
    this.ensureAuthenticated();

    const payload = { requestUUID };
    const encryptedBody = aesEncrypt(payload, this.config.aesKey, this.config.aesIv);
    const response = (await this.post(
      this.config.urls.DYN_QR_STATUS_URL,
      { body: encryptedBody },
      this.getAuthHeaders()
    )) as EncryptedResponse;

    const decryptedData = this.decryptResponse(response.data);

    // Handle empty response
    if (decryptedData === '"{}"' || decryptedData === '{}') {
      return { data: null, status: response.status };
    }

    return { data: JSON.parse(decryptedData), status: response.status };
  }

  /**
   * Send status update (webhook callback).
   */
  async updateTransactionStatus(url: string, params: {
    requestUUID: string;
    requestId: string;
    transactionId: string;
    transactionStatusCode: string;
    transactionStatus: string;
    statusDescription: string;
  }) {
    return this.post(url, params);
  }
}
