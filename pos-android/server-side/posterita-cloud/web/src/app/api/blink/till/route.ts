import { NextRequest, NextResponse } from 'next/server';
import { BlinkTillClient } from '@/lib/blink';
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "BLINK",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

const mode = (process.env.BLINK_MODE as 'UAT' | 'PROD') || 'UAT';

/**
 * POST /api/blink/till
 *
 * Actions:
 *   - displayQrCode: Generate a QR code for till payment
 *   - getTransactionStatus: Check payment status
 *   - authenticate: Get auth token (for testing)
 *
 * Called by POS Android devices.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const client = new BlinkTillClient(mode);

    switch (action) {
      case 'displayQrCode': {
        const { transactionId, transactionAmt, merchant_id, store_id, terminal_id } = body;

        if (!transactionId || !transactionAmt || !store_id || !terminal_id) {
          return NextResponse.json(
            { error: 'Missing required fields: transactionId, transactionAmt, store_id, terminal_id' },
            { status: 400 }
          );
        }

        await client.authenticate();

        const qrResponse = await client.getQRCode({
          merchant_id,
          store_id,
          terminal_id,
          transaction_id: transactionId,
          amount: { value: parseFloat(parseFloat(transactionAmt).toFixed(2)) },
        });

        return NextResponse.json(qrResponse);
      }

      case 'getTransactionStatus': {
        const { transactionId, terminal_id } = body;

        if (!transactionId || !terminal_id) {
          return NextResponse.json(
            { error: 'Missing required fields: transactionId, terminal_id' },
            { status: 400 }
          );
        }

        await client.authenticate();

        const statusResponse = await client.getTransactionStatus(terminal_id, transactionId);

        return NextResponse.json(statusResponse);
      }

      case 'authenticate': {
        const tokenResponse = await client.authenticate();
        return NextResponse.json(tokenResponse);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: displayQrCode, getTransactionStatus` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Blink Till API error:', message);
    await logToErrorDb("system", `Blink Till API error: ${message}`, error instanceof Error ? error.stack : undefined);

    const isNetworkError = message.includes('fetch failed') || message.includes('ECONNREFUSED');
    const isAuthError = message.includes('Authentication failed') || message.includes('non-JSON response');

    return NextResponse.json(
      { error: isNetworkError ? 'Blink server unreachable' : message },
      { status: isNetworkError ? 503 : isAuthError ? 502 : 500 }
    );
  }
}
