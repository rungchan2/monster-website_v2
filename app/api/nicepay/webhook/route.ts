import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle NicePay webhook notifications
 * This endpoint receives notifications from NicePay about payment events
 */
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    console.log('NicePay webhook received:', webhookData)

    // Verify webhook signature if needed
    // TODO: Implement webhook signature verification based on NicePay docs

    const { resultCode, tid, orderId, status, amount, payMethod } = webhookData

    if (resultCode === '0000') {
      const supabase = await createClient()
      
      // Update payment record based on webhook data
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: mapNicePayStatus(status),
          webhook_received_at: new Date().toISOString(),
          webhook_data: JSON.stringify(webhookData)
        })
        .eq('order_id', orderId)

      if (updateError) {
        console.error('Failed to update payment from webhook:', updateError)
        return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
      }

      // Send success response to NicePay
      return NextResponse.json({ message: 'ok' }, { status: 200 })
    } else {
      console.error('Webhook failed:', webhookData)
      return NextResponse.json({ error: 'fail' }, { status: 500 })
    }

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Map NicePay payment status to our internal status
 */
function mapNicePayStatus(nicePayStatus: string): string {
  switch (nicePayStatus) {
    case 'paid':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * Handle GET requests (not expected for this endpoint)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}