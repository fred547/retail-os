import { NextRequest, NextResponse } from 'next/server';
import { BlinkDynamicQRClient } from '@/lib/blink';

const mode = (process.env.BLINK_MODE as 'UAT' | 'PROD') || 'UAT';

/**
 * POST /api/blink/dynamic-qr
 *
 * Actions:
 *   - getDynamicQrCode: Generate a dynamic QR code for payment
 *   - getDynamicQRTransactionStatus: Check payment status
 *   - authenticate: Get auth token (for testing)
 *
 * Called by POS Android devices.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const client = new BlinkDynamicQRClient(mode);

    switch (action) {
      case 'getDynamicQrCode': {
        const { requestIntentityId, transactionAmt, qrcode } = body;

        if (!requestIntentityId || !transactionAmt) {
          return NextResponse.json(
            { error: 'Missing required fields: requestIntentityId, transactionAmt' },
            { status: 400 }
          );
        }

        await client.authenticate(requestIntentityId);

        const qrResponse = await client.getQRCode({
          requestUUID: requestIntentityId,
          requestIndentityId: requestIntentityId,
          qrCodeString: qrcode || '',
          purposeOfTransaction: 'Payment',
          transactionAmount: parseFloat(transactionAmt),
          convenienceCharges: 0,
          isPercentageConvenienceCharges: false,
        });

        return NextResponse.json(qrResponse);
      }

      case 'getDynamicQRTransactionStatus': {
        const { requestIntentityId, requestUUID } = body;

        if (!requestIntentityId) {
          return NextResponse.json(
            { error: 'Missing required field: requestIntentityId' },
            { status: 400 }
          );
        }

        await client.authenticate(requestIntentityId);

        const statusResponse = await client.getDynamicQRTransactionStatus(
          requestIntentityId
        );

        return NextResponse.json(statusResponse);
      }

      case 'authenticate': {
        const { requestIntentityId } = body;
        const tokenResponse = await client.authenticate(requestIntentityId || 'test');
        return NextResponse.json(tokenResponse);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: getDynamicQrCode, getDynamicQRTransactionStatus` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Blink Dynamic QR API error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    const isNetworkError = message.includes('fetch failed') || message.includes('ECONNREFUSED');

    return NextResponse.json(
      { error: isNetworkError ? 'Blink server unreachable' : message },
      { status: isNetworkError ? 503 : 500 }
    );
  }
}
