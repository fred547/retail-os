// ============================================================
// Dynamic QR Code API Types (blink-qrcode-payment-api)
// ============================================================

export interface DynamicQR_TokenRequest {
  requestIndentityId: string;
  userName: string;
  password: string;
}

export interface DynamicQR_TokenData {
  token: string;
  sessionId: string;
  expiry: number;
}

export interface DynamicQR_TokenResponse {
  data: DynamicQR_TokenData;
  status: BlinkStatus;
}

export interface DynamicQR_DebitRequest {
  merchantQRCode: string;
  merchantStoreMobileNo: string;
  customerMobileNo: string;
  amount: number;
  requestUUID: string;
  requestIndentityId: string;
}

export interface DynamicQR_QRCodeRequest {
  requestUUID: string;
  requestIndentityId: string;
  qrCodeString: string;
  purposeOfTransaction: string;
  transactionAmount: number;
  convenienceCharges: number;
  isPercentageConvenienceCharges: boolean;
}

export interface DynamicQR_StatusRequest {
  requestUUID: string;
}

export interface DynamicQR_TransactionStatusRequest {
  requestUUID: string;
  ecomRequestId: string;
}

export interface DynamicQR_StatusUpdateRequest {
  requestUUID: string;
  requestId: string;
  transactionId: string;
  transactionStatusCode: string;
  transactionStatus: string;
  statusDescription: string;
}

// ============================================================
// Till Integration API Types (blink-till-payment-api)
// ============================================================

export interface Till_TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface Till_QRCodeRequest {
  merchant_id: string;
  store_id: string;
  terminal_id: string;
  transaction_id: string;
  amount: {
    value: number;
    currency?: string;
  };
}

export interface Till_TransactionStatusRequest {
  terminalId: string;
  transactionId: string;
}

export interface Till_QRCodeResponse {
  [key: string]: unknown;
}

export interface Till_TransactionStatusResponse {
  data?: {
    transaction_id?: string;
    statusDescription?: string;
    payment_ref?: string;
    transactionStatusCode?: string;
  };
  status?: BlinkStatus;
  [key: string]: unknown;
}

// ============================================================
// Shared Types
// ============================================================

export interface BlinkStatus {
  success: boolean;
  statusCode?: string | null;
  message?: string | null;
}

export interface EncryptedResponse {
  data: string;
  status: BlinkStatus;
}

export interface BlinkApiError {
  error: string;
  statusCode?: number;
  details?: string;
}

export type BlinkMode = 'UAT' | 'PROD';
