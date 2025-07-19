import { NextRequest, NextResponse } from 'next/server'
import { cancelPayment } from '@/lib/payments/nicepay'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Handle payment cancellation request
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason } = await request.json()

    // Verify user authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    if (!paymentId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        program_participants!inner(
          user_id,
          program_id,
          participant_name
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify user ownership
    if ((payment.program_participants as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if payment can be cancelled
    if (payment.status !== 'completed') {
      return NextResponse.json({ error: 'Payment cannot be cancelled' }, { status: 400 })
    }

    // Process cancellation with NicePay
    const cancelResult = await cancelPayment(
      payment.payment_key!,
      payment.amount,
      reason,
      `CANCEL_${Date.now()}`
    )

    if (!cancelResult.success) {
      return NextResponse.json({ 
        error: cancelResult.error || 'Payment cancellation failed' 
      }, { status: 500 })
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        raw_data: JSON.stringify(cancelResult.data)
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Failed to update payment record:', updateError)
      return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 })
    }

    // Update participant status if participant_id exists
    if (payment.participant_id) {
      const { error: participantError } = await supabase
        .from('program_participants')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled'
        })
        .eq('id', payment.participant_id)

      if (participantError) {
        console.error('Failed to update participant status:', participantError)
        // Don't fail the cancellation, just log the error
      }
    }

    // Create refund record
    const { error: refundError } = await supabase
      .from('refunds')
      .insert({
        payment_id: paymentId,
        user_id: user.id,
        amount: payment.amount,
        reason: reason,
        status: 'completed',
        processed_at: new Date().toISOString()
      })

    if (refundError) {
      console.error('Failed to create refund record:', refundError)
      // Don't fail the cancellation, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment cancelled successfully',
      data: cancelResult.data 
    })

  } catch (error) {
    console.error('Payment cancellation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * Handle GET requests (not expected for this endpoint)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}