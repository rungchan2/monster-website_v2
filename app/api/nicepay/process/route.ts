import { NextRequest, NextResponse } from 'next/server'
import { processPaymentApproval, verifyPaymentSignature, type NicePayAuthResult } from '@/lib/payments/nicepay'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle NicePay payment result (server approval)
 * This endpoint receives POST data from NicePay after authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data from NicePay
    const formData = await request.formData()
    console.log('formData', formData)
    const authResult: NicePayAuthResult = {
      authResultCode: formData.get('authResultCode') as string,
      authResultMsg: formData.get('authResultMsg') as string,
      tid: formData.get('tid') as string,
      clientId: formData.get('clientId') as string,
      orderId: formData.get('orderId') as string,
      amount: formData.get('amount') as string,
      mallReserved: formData.get('mallReserved') as string || '',
      authToken: formData.get('authToken') as string,
      signature: formData.get('signature') as string
    }

    console.log('NicePay auth result:', authResult)

    // Verify required fields
    if (!authResult.tid || !authResult.orderId || !authResult.amount) {
      console.error('Missing required fields in auth result')
      return NextResponse.redirect(new URL('/payments/error?message=결제 정보가 누락되었습니다', request.url))
    }

    // Check authentication result
    if (authResult.authResultCode !== '0000') {
      console.error('Authentication failed:', authResult.authResultMsg)
      return NextResponse.redirect(new URL(`/payments/failure?message=${encodeURIComponent(authResult.authResultMsg)}`, request.url))
    }

    // Verify signature (optional security check)
    if (!verifyPaymentSignature(authResult)) {
      console.error('Payment signature verification failed')
      return NextResponse.redirect(new URL('/payments/error?message=결제 보안 검증에 실패했습니다', request.url))
    }

    // Process payment approval
    const amount = parseInt(authResult.amount)
    const approvalResult = await processPaymentApproval(authResult.tid, amount)

    if (!approvalResult.success) {
      console.error('Payment approval failed:', approvalResult.error)
      return NextResponse.redirect(new URL(`/payments/failure?message=${encodeURIComponent(approvalResult.error!)}`, request.url))
    }

    // Parse participant data from mallReserved
    let participantData
    try {
      participantData = JSON.parse(authResult.mallReserved)
    } catch (error) {
      console.error('Failed to parse participant data:', error)
      return NextResponse.redirect(new URL('/payments/error?message=참가자 정보 파싱에 실패했습니다', request.url))
    }

    const supabase = await createClient()
    
    try {
      // Create participant record first
      const { data: participant, error: participantError } = await supabase
        .from('program_participants')
        .insert({
          user_id: participantData.user_id,
          program_id: participantData.program_id,
          participant_name: participantData.participant_name,
          participant_email: participantData.participant_email,
          participant_phone: participantData.participant_phone,
          emergency_contact: participantData.emergency_contact,
          dietary_restrictions: participantData.dietary_restrictions,
          special_requests: participantData.special_requests,
          amount_paid: amount,
          status: 'confirmed', // 결제 완료 후 바로 confirmed
          payment_status: 'paid'
        })
        .select()
        .single()

      if (participantError) {
        console.error('Failed to create participant:', participantError)
        return NextResponse.redirect(new URL('/payments/error?message=참가자 등록에 실패했습니다', request.url))
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: authResult.orderId,
          participant_id: participant.id,
          user_id: participantData.user_id,
          amount: amount,
          currency: 'KRW',
          status: 'completed',
          payment_method: 'card',
          payment_key: authResult.tid,
          paid_at: new Date().toISOString(),
          toss_payment_data: JSON.stringify(approvalResult.data) // NicePay data
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Failed to create payment record:', paymentError)
        // Don't fail the registration, just log the error
      }

      // Redirect to success page
      return NextResponse.redirect(new URL(`/payments/success?orderId=${authResult.orderId}&amount=${authResult.amount}`, request.url))

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(new URL('/payments/error?message=데이터베이스 처리 중 오류가 발생했습니다', request.url))
    }

  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.redirect(new URL('/payments/error?message=결제 처리 중 오류가 발생했습니다', request.url))
  }
}

/**
 * Handle GET requests (not expected for this endpoint)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}